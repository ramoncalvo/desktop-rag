// RAG App — https://github.com/ramoncalvo

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { SettingsService } from '../settings/settings.service';
import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const PDF_EXTENSIONS = new Set(['.pdf']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4a', '.mp3', '.wav', '.flac', '.ogg']);
const ALL_EXTENSIONS = new Set([...PDF_EXTENSIONS, ...VIDEO_EXTENSIONS]);

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
    private readonly settings: SettingsService,
  ) {}

  async list() {
    return this.prisma.indexedFile.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string) {
    return this.prisma.indexedFile.findUnique({ where: { id } });
  }

  async indexFolder(folderPath: string) {
    await this.settings.set('index_folder', folderPath);

    const allFiles = this.scanFolder(folderPath);
    const indexed: any[] = [];

    for (const filePath of allFiles) {
      const existing = await this.prisma.indexedFile.findUnique({ where: { filePath } });
      if (existing) continue;

      const ext = extname(filePath).toLowerCase();
      try {
        if (PDF_EXTENSIONS.has(ext)) {
          const result = await this.indexPdf(filePath, folderPath);
          if (result) indexed.push(result);
        } else if (VIDEO_EXTENSIONS.has(ext)) {
          const result = await this.indexVideo(filePath, folderPath);
          if (result) indexed.push(result);
        }
      } catch (e: any) {
        console.error(`Error indexing ${basename(filePath)}: ${e.message}`);
      }
    }

    return { total_found: allFiles.length, new_indexed: indexed.length, files: indexed };
  }

  async delete(id: string) {
    await this.rag.deleteFileChunks(id);
    await this.prisma.indexedFile.delete({ where: { id } });
  }

  async getContent(id: string, page?: number) {
    const file = await this.prisma.indexedFile.findUnique({ where: { id } });
    if (!file || !existsSync(file.filePath)) return null;

    if (file.fileType === 'pdf') {
      const pdfParse = (await import('pdf-parse')) as any;
      const buffer = readFileSync(file.filePath);
      const pdf = await pdfParse(buffer);

      if (page) {
        // Return text for specific page (approximate — pdf-parse doesn't split well by page)
        return {
          file_id: id,
          title: file.title,
          file_type: 'pdf',
          total_pages: pdf.numpages,
          page,
          blocks: [{ text: pdf.text, y: 0, x: 0 }],
        };
      }
      return {
        file_id: id,
        title: file.title,
        file_type: 'pdf',
        total_pages: pdf.numpages,
        pages: Array.from({ length: pdf.numpages }, (_, i) => ({
          page: i + 1,
          preview: '',
          char_count: Math.floor(pdf.text.length / pdf.numpages),
        })),
      };
    }

    // Video/audio: return chunks from ChromaDB
    const { documents, metadatas } = await this.rag.getFileChunks(id);
    const segments = documents
      .map((text, i) => ({ text, ...metadatas[i] }))
      .sort((a: any, b: any) => (a.start_sec || a.start_min || 0) - (b.start_sec || b.start_min || 0))
      .map((s: any) => ({
        text: s.text,
        start_ts: s.start_ts || `${s.start_min || 0}min`,
        end_ts: s.end_ts || `${s.end_min || 0}min`,
      }));

    return { file_id: id, title: file.title, file_type: file.fileType, segments };
  }

  private scanFolder(folderPath: string): string[] {
    const files: string[] = [];
    const scan = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) scan(full);
          else if (ALL_EXTENSIONS.has(extname(entry).toLowerCase())) files.push(full);
        } catch {}
      }
    };
    scan(folderPath);
    return files;
  }

  private fileHash(filePath: string): string {
    const hash = createHash('md5');
    const buffer = readFileSync(filePath);
    hash.update(buffer);
    return hash.digest('hex').substring(0, 16);
  }

  private async indexPdf(filePath: string, folderPath: string) {
    const pdfParse = (await import('pdf-parse')) as any;
    const buffer = readFileSync(filePath);
    const pdf = await pdfParse(buffer);
    if (!pdf.text.trim()) return null;

    const title = pdf.info?.Title || basename(filePath, extname(filePath));
    const chunks = this.chunkText(pdf.text, pdf.numpages);

    const file = await this.prisma.indexedFile.create({
      data: {
        filePath,
        fileName: basename(filePath),
        fileType: 'pdf',
        fileHash: this.fileHash(filePath),
        title,
        chunkCount: chunks.length,
        pageCount: pdf.numpages,
        durationSec: 0,
        folderPath,
      },
    });

    await this.rag.indexChunks(file.id, filePath, title, chunks);
    return { file_id: file.id, title, type: 'pdf', chunks: chunks.length };
  }

  private async indexVideo(filePath: string, folderPath: string) {
    // Use whisper via Python subprocess for transcription
    const { execSync } = await import('child_process');
    let result: any;
    try {
      const output = execSync(
        `python -c "
import json, whisper
model = whisper.load_model('base')
r = model.transcribe('${filePath.replace(/'/g, "\\'")}', language=None, verbose=False)
print(json.dumps({'text': r['text'], 'segments': [{'text': s['text'], 'start': s['start'], 'end': s['end']} for s in r['segments']]}))"`,
        { maxBuffer: 50 * 1024 * 1024, timeout: 600000 },
      );
      result = JSON.parse(output.toString());
    } catch (e: any) {
      console.error(`Whisper failed for ${basename(filePath)}: ${e.message}`);
      return null;
    }

    if (!result.segments?.length) return null;

    const title = basename(filePath, extname(filePath));
    const chunks = this.chunkTranscript(result.segments);
    const durationSec = Math.floor(result.segments[result.segments.length - 1].end);

    const file = await this.prisma.indexedFile.create({
      data: {
        filePath,
        fileName: basename(filePath),
        fileType: extname(filePath).slice(1),
        fileHash: this.fileHash(filePath),
        title,
        chunkCount: chunks.length,
        pageCount: 0,
        durationSec,
        folderPath,
      },
    });

    await this.rag.indexChunks(file.id, filePath, title, chunks);
    return { file_id: file.id, title, type: 'video', chunks: chunks.length };
  }

  private chunkText(text: string, pageCount: number): any[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: any[] = [];
    const chunkSize = 150;
    const overlap = 30;

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const slice = words.slice(i, i + chunkSize);
      if (!slice.length) break;
      const approxPage = Math.floor((i / words.length) * pageCount) + 1;
      chunks.push({ text: slice.join(' '), page: approxPage, source_type: 'pdf' });
    }
    return chunks;
  }

  private chunkTranscript(segments: any[], chunkSize = 500, overlap = 100): any[] {
    const words: { word: string; start: number }[] = [];
    for (const seg of segments) {
      for (const word of seg.text.split(/\s+/)) {
        if (word) words.push({ word, start: seg.start });
      }
    }

    const chunks: any[] = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const slice = words.slice(i, i + chunkSize);
      if (!slice.length) break;
      const startSec = Math.floor(slice[0].start);
      const endSec = Math.floor(slice[slice.length - 1].start);
      const fmtTs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      chunks.push({
        text: slice.map((w) => w.word).join(' '),
        start_sec: startSec,
        end_sec: endSec,
        start_ts: fmtTs(startSec),
        end_ts: fmtTs(endSec),
        start_min: Math.floor(startSec / 60),
        end_min: Math.floor(endSec / 60),
        source_type: 'video',
      });
    }
    return chunks;
  }
}
