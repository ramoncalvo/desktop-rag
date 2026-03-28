// RAG App — https://github.com/ramoncalvo

import { Injectable, OnModuleInit } from '@nestjs/common';
import { LocalIndex } from 'vectra';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import OpenAI from 'openai';

const VECTRA_DIR = join(homedir(), '.rag-app', 'vectra_index');
const OLLAMA_URL = 'http://localhost:11434';

@Injectable()
export class RagService implements OnModuleInit {
  private index!: LocalIndex;
  private openai!: OpenAI;

  async onModuleInit() {
    mkdirSync(VECTRA_DIR, { recursive: true });
    this.index = new LocalIndex(VECTRA_DIR);
    if (!await this.index.isIndexCreated()) {
      await this.index.createIndex();
    }
    this.openai = new OpenAI({ apiKey: 'ollama', baseURL: `${OLLAMA_URL}/v1` });
  }

  private async embed(text: string): Promise<number[]> {
    const res = await this.openai.embeddings.create({
      model: 'nomic-embed-text',
      input: text,
    });
    return res.data[0].embedding;
  }

  async indexChunks(fileId: string, filePath: string, title: string, chunks: any[]): Promise<number> {
    // Check if already indexed
    const dummyVector = await this.embed(fileId);
    const existing = await this.index.queryItems(dummyVector, fileId, 1, { file_id: { $eq: fileId } }).catch(() => []);
    if (existing.length > 0) return existing.length;

    for (const [i, chunk] of chunks.entries()) {
      const vector = await this.embed(chunk.text);
      await this.index.insertItem({
        vector,
        metadata: {
          file_id: fileId,
          file_path: filePath,
          title,
          chunk_index: i,
          text: chunk.text,
          start_min: chunk.start_min ?? chunk.page ?? 0,
          end_min: chunk.end_min ?? chunk.page ?? 0,
          source_type: chunk.source_type || 'pdf',
          ...(chunk.page !== undefined && { page: chunk.page }),
          ...(chunk.start_sec !== undefined && { start_sec: chunk.start_sec }),
          ...(chunk.end_sec !== undefined && { end_sec: chunk.end_sec }),
          ...(chunk.start_ts && { start_ts: chunk.start_ts }),
          ...(chunk.end_ts && { end_ts: chunk.end_ts }),
        },
      });
    }
    return chunks.length;
  }

  async queryContext(question: string, nResults = 8): Promise<{ context: string; sources: any[] }> {
    const count = await this.index.listItems().catch(() => []);
    if (count.length === 0) return { context: '', sources: [] };

    const vector = await this.embed(question);
    const results = await this.index.queryItems(vector, question, nResults);

    if (!results.length) return { context: '', sources: [] };

    const contextParts: string[] = [];
    const sources: any[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      const meta = result.item.metadata as any;
      const chunk = meta.text || '';
      const title = meta.title || '';
      const sourceType = meta.source_type || 'pdf';
      const startTs = meta.start_ts || '';
      const endTs = meta.end_ts || '';

      let header: string;
      if (sourceType === 'pdf') {
        header = `[PDF: ${title} | pagina ${meta.page || 1}]`;
      } else if (sourceType === 'video') {
        const tsLabel = startTs ? `${startTs}-${endTs}` : `min ${meta.start_min}-${meta.end_min}`;
        header = `[Video: ${title} | ${tsLabel}]`;
      } else {
        header = `[${title}]`;
      }
      contextParts.push(`${header}\n${chunk}`);

      const key = sourceType === 'pdf'
        ? `${meta.file_id}_p${meta.page || 0}`
        : `${meta.file_id}_${meta.start_sec || meta.start_min}`;
      if (!seen.has(key)) {
        seen.add(key);
        sources.push({
          file_id: meta.file_id,
          title: meta.title,
          start_min: meta.start_min || 0,
          end_min: meta.end_min || 0,
          file_path: meta.file_path || '',
          snippet: (chunk || '').substring(0, 300),
          source_type: sourceType,
          ...(sourceType === 'pdf' && { page: meta.page || 1 }),
          ...(sourceType === 'video' && {
            start_sec: meta.start_sec,
            end_sec: meta.end_sec,
            start_ts: startTs,
            end_ts: endTs,
          }),
        });
      }
    }

    return { context: contextParts.join('\n\n---\n\n'), sources };
  }

  async deleteFileChunks(fileId: string): Promise<void> {
    const items = await this.index.listItems();
    for (const item of items) {
      if ((item.metadata as any).file_id === fileId) {
        await this.index.deleteItem(item.id);
      }
    }
  }

  async getFileChunks(fileId: string): Promise<{ documents: string[]; metadatas: any[] }> {
    const items = await this.index.listItems();
    const filtered = items
      .filter((item) => (item.metadata as any).file_id === fileId)
      .sort((a, b) => ((a.metadata as any).chunk_index || 0) - ((b.metadata as any).chunk_index || 0));

    return {
      documents: filtered.map((item) => (item.metadata as any).text || ''),
      metadatas: filtered.map((item) => item.metadata),
    };
  }
}
