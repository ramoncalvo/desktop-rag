// RAG App — https://github.com/ramoncalvo

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { SettingsService } from '../settings/settings.service';
import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { homedir } from 'os';

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
        console.error(e.stack);
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
      // Use Python/PyMuPDF for PDF content extraction
      const result = this.runPython(`
import fitz, json, sys
doc = fitz.open('${file.filePath.replace(/'/g, "\\'")}')
total = len(doc)
page_num = ${page || 0}
if page_num > 0:
    p = doc[page_num - 1]
    blocks = [{"text": b[4].strip(), "y": round(b[1],1), "x": round(b[0],1)} for b in p.get_text("blocks") if b[6]==0 and b[4].strip()]
    print(json.dumps({"total_pages": total, "page": page_num, "blocks": blocks}))
else:
    pages = []
    for i in range(total):
        t = doc[i].get_text().strip()
        pages.append({"page": i+1, "preview": t[:200], "char_count": len(t)})
    print(json.dumps({"total_pages": total, "pages": pages}))
doc.close()
`);
      if (!result) return null;
      const data = JSON.parse(result);
      return { file_id: id, title: file.title, file_type: 'pdf', ...data };
    }

    // Video/audio: return chunks from vector store
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

  private getPythonCmd(): string {
    const condaPython = join(homedir(), 'miniconda3', 'envs', 'desktop-rag', 'bin', 'python');
    return existsSync(condaPython) ? condaPython : 'python3';
  }

  private runPython(script: string): string | null {
    const { execFileSync } = require('child_process');
    try {
      const output = execFileSync(this.getPythonCmd(), ['-c', script], {
        maxBuffer: 50 * 1024 * 1024,
        timeout: 600000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      // Get only the last line (the JSON output), ignore tqdm/warnings on stderr
      const lines = output.toString().trim().split('\n');
      return lines[lines.length - 1];
    } catch (e: any) {
      console.error(`Python error: ${e.message}`);
      if (e.stderr) console.error(`Python stderr: ${e.stderr.toString().slice(0, 500)}`);
      return null;
    }
  }

  private async indexPdf(filePath: string, folderPath: string) {
    const safePath = filePath.replace(/'/g, "\\'");
    const result = this.runPython(`
import fitz, json
doc = fitz.open('${safePath}')
total = len(doc)
meta = doc.metadata
title = (meta.get("title","").strip() if meta else "") or ""
if not title:
    page = doc[0]
    for b in page.get_text("blocks"):
        if b[6]==0 and b[4].strip() and len(b[4].strip())<200:
            title = b[4].strip().split("\\n")[0]; break
if not title: title = "${basename(filePath, extname(filePath))}"
# Extract chunks
blocks = []
for i in range(total):
    page = doc[i]
    ph = round(page.rect.height,1)
    for b in page.get_text("blocks"):
        if b[6]==0 and b[4].strip() and len(b[4].strip())>2:
            blocks.append({"page":i+1,"y":round(b[1],1),"text":b[4].strip(),"ph":ph})
doc.close()
# Chunk
chunks=[]
ct=[]; cw=0; cp=None; cy=None; cph=None
for bl in blocks:
    if cp is None: cp=bl["page"]; cy=bl["y"]; cph=bl["ph"]
    ct.append(bl["text"]); cw+=len(bl["text"].split())
    if cw>=150:
        chunks.append({"text":"\\n".join(ct),"page":cp,"y_position":cy,"page_height":cph,"source_type":"pdf"})
        ct=ct[-2:]; cw=sum(len(t.split()) for t in ct); cp=bl["page"]; cy=bl["y"]; cph=bl["ph"]
if ct: chunks.append({"text":"\\n".join(ct),"page":cp,"y_position":cy,"page_height":cph,"source_type":"pdf"})
print(json.dumps({"title":title,"pages":total,"chunks":chunks}))
`);
    if (!result) return null;

    const data = JSON.parse(result);
    if (!data.chunks.length) return null;

    const file = await this.prisma.indexedFile.create({
      data: {
        filePath,
        fileName: basename(filePath),
        fileType: 'pdf',
        fileHash: this.fileHash(filePath),
        title: data.title,
        chunkCount: data.chunks.length,
        pageCount: data.pages,
        durationSec: 0,
        folderPath,
      },
    });

    await this.rag.indexChunks(file.id, filePath, data.title, data.chunks);
    return { file_id: file.id, title: data.title, type: 'pdf', chunks: data.chunks.length };
  }

  private async indexVideo(filePath: string, folderPath: string) {
    const safePath = filePath.replace(/'/g, "\\'");
    const output = this.runPython(
      `import json, whisper; model = whisper.load_model('base'); r = model.transcribe('${safePath}', language=None, verbose=False); print(json.dumps({'text': r['text'], 'segments': [{'text': s['text'], 'start': s['start'], 'end': s['end']} for s in r['segments']]}))`
    );
    if (!output) return null;

    let result: any;
    try {
      result = JSON.parse(output);
    } catch {
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
