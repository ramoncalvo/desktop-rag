// RAG App — https://github.com/ramoncalvo

import { Controller, Get, Post, Body, HttpException } from '@nestjs/common';
import { OllamaService } from './ollama.service';

@Controller('api/ollama')
export class OllamaController {
  constructor(private readonly ollama: OllamaService) {}

  @Get('status')
  async status() {
    return this.ollama.getStatus();
  }

  @Post('start')
  async start() {
    const ok = await this.ollama.start();
    if (!ok) throw new HttpException('No se pudo iniciar Ollama', 500);
    return { ok: true };
  }

  @Post('pull')
  async pull(@Body() body: { model: string }) {
    const ok = await this.ollama.pullModel(body.model);
    if (!ok) throw new HttpException(`No se pudo descargar ${body.model}`, 500);
    return { ok: true };
  }
}
