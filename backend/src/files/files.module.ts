// RAG App — https://github.com/ramoncalvo

import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { RagModule } from '../rag/rag.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [RagModule, SettingsModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
