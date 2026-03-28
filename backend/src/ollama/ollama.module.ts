// RAG App — https://github.com/ramoncalvo

import { Module } from '@nestjs/common';
import { OllamaController } from './ollama.controller';
import { OllamaService } from './ollama.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [OllamaController],
  providers: [OllamaService],
  exports: [OllamaService],
})
export class OllamaModule {}
