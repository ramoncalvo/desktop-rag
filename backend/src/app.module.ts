// RAG App — https://github.com/ramoncalvo

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { OllamaModule } from './ollama/ollama.module';
import { RagModule } from './rag/rag.module';
import { FilesModule } from './files/files.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    OllamaModule,
    RagModule,
    FilesModule,
    ChatModule,
  ],
})
export class AppModule {}
