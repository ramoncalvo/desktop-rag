// RAG App — https://github.com/ramoncalvo

import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('sessions')
  async listSessions() {
    return this.chat.listSessions();
  }

  @Post('sessions')
  async createSession(@Body() body: { title?: string }) {
    return this.chat.createSession(body.title);
  }

  @Patch('sessions/:id')
  async renameSession(@Param('id') id: string, @Body() body: { title: string }) {
    await this.chat.renameSession(id, body.title);
    return { ok: true };
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    await this.chat.deleteSession(id);
    return { ok: true };
  }

  @Get('sessions/:id/messages')
  async getMessages(@Param('id') id: string) {
    return this.chat.getMessages(id);
  }

  @Post('sessions/:id/messages')
  async sendMessage(@Param('id') id: string, @Body() body: { content: string }) {
    return this.chat.sendMessage(id, body.content);
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
