// RAG App — https://github.com/ramoncalvo

import { Injectable } from '@nestjs/common';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { SettingsService } from '../settings/settings.service';

const execFileAsync = promisify(execFile);
const OLLAMA_URL = 'http://localhost:11434';

@Injectable()
export class OllamaService {
  constructor(private readonly settings: SettingsService) {}

  async isInstalled(): Promise<boolean> {
    try {
      await execFileAsync('which', ['ollama']);
      return true;
    } catch {
      return false;
    }
  }

  async isRunning(): Promise<boolean> {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => m.name);
    } catch {
      return [];
    }
  }

  async getStatus() {
    const installed = await this.isInstalled();
    const running = installed ? await this.isRunning() : false;
    const models = running ? await this.listModels() : [];
    const savedModel = await this.settings.get('ollama_model');
    return { installed, running, models, saved_model: savedModel };
  }

  async start(): Promise<boolean> {
    if (await this.isRunning()) return true;
    try {
      spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' }).unref();
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (await this.isRunning()) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async pullModel(model: string): Promise<boolean> {
    // Check if already available
    const models = await this.listModels();
    const base = model.split(':')[0];
    if (models.some((m) => m === model || m.startsWith(base))) {
      await this.settings.set('ollama_model', model);
      return true;
    }

    try {
      const res = await fetch(`${OLLAMA_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });
      // Stream response until done
      const reader = res.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }
      const available = (await this.listModels()).some((m) => m === model || m.startsWith(base));
      if (available) await this.settings.set('ollama_model', model);
      return available;
    } catch {
      return false;
    }
  }

  async generateAnswer(question: string, context: string, model?: string): Promise<{ text: string; actions: any[] }> {
    const savedModel = model || (await this.settings.get('ollama_model')) || 'llama3.1:8b';
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: 'ollama', baseURL: `${OLLAMA_URL}/v1` });

    const systemPrompt = `Eres un asistente inteligente que responde preguntas basandose en documentos indexados (PDFs, transcripts de videos).

REGLAS:
- Responde SOLO con la informacion del contexto proporcionado.
- Si no encuentras la respuesta en el contexto, dilo claramente.
- Cuando cites informacion de un PDF, indica el titulo del documento y numero de pagina.
- Cuando cites informacion de un video, indica el titulo del video y el momento exacto.
- No uses asteriscos (*) para formato.

FORMATO DE RESPUESTA:
Responde SIEMPRE en JSON valido con esta estructura:
{"text": "Tu respuesta...", "actions": []}`;

    try {
      const response = await client.chat.completions.create({
        model: savedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Contexto:\n\n${context}\n\n---\n\nPregunta: ${question}` },
        ],
      });

      const content = response.choices[0]?.message?.content || '';
      try {
        const data = JSON.parse(content);
        return { text: (data.text || '').replace(/\*/g, ''), actions: data.actions || [] };
      } catch {
        return { text: content.replace(/\*/g, ''), actions: [] };
      }
    } catch (e: any) {
      return { text: `Error al consultar Ollama: ${e.message}`, actions: [] };
    }
  }
}
