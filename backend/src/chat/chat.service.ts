// RAG App — https://github.com/ramoncalvo

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { OllamaService } from '../ollama/ollama.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
    private readonly ollama: OllamaService,
  ) {}

  async listSessions() {
    return this.prisma.chatSession.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async createSession(title?: string) {
    return this.prisma.chatSession.create({
      data: { title: title || 'Nuevo Chat' },
    });
  }

  async renameSession(id: string, title: string) {
    await this.prisma.chatSession.update({ where: { id }, data: { title: title.slice(0, 100) } });
  }

  async deleteSession(id: string) {
    await this.prisma.chatSession.delete({ where: { id } });
  }

  async getMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(sessionId: string, content: string) {
    // Save user message
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'user', content },
    });

    // RAG query
    const { context, sources } = await this.rag.queryContext(content);

    let answerText: string;
    let actions: any[] | null = null;

    if (context) {
      const result = await this.ollama.generateAnswer(content, context);
      answerText = result.text;
      actions = result.actions.length ? result.actions : null;
    } else {
      answerText = 'No tengo documentos indexados con informacion relevante. Indexa documentos primero desde la pestana Fuentes.';
    }

    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: answerText,
        sources: sources.length ? JSON.stringify(sources) : null,
        actions: actions ? JSON.stringify(actions) : null,
      },
    });

    // Auto-title
    const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (session?.title === 'Nuevo Chat') {
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: content.slice(0, 80) },
      });
    }

    return assistantMsg;
  }
}
