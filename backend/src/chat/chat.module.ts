// RAG App — https://github.com/ramoncalvo

import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RagModule } from '../rag/rag.module';
import { OllamaModule } from '../ollama/ollama.module';

@Module({
  imports: [RagModule, OllamaModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
