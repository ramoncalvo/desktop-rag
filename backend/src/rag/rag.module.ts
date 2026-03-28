// RAG App — https://github.com/ramoncalvo

import { Module } from '@nestjs/common';
import { RagService } from './rag.service';

@Module({
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
