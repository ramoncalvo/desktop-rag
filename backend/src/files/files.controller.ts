// RAG App — https://github.com/ramoncalvo

import { Controller, Get, Post, Delete, Param, Body, Query, Res, HttpException } from '@nestjs/common';
import { FilesService } from './files.service';
import { createReadStream, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Req } from '@nestjs/common';

const MEDIA_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
};

@Controller('api/files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  async list() {
    return this.files.list();
  }

  @Post()
  async index(@Body() body: { folder_path: string }) {
    return this.files.indexFolder(body.folder_path);
  }

  @Get('browse')
  async browse(@Query('path') dirPath?: string) {
    const targetPath = dirPath || homedir();

    if (!existsSync(targetPath)) {
      throw new HttpException('Directorio no encontrado', 404);
    }

    try {
      const entries = readdirSync(targetPath, { withFileTypes: true });
      const dirs = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: join(targetPath, e.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Get parent directory
      const parent = join(targetPath, '..');
      const parentPath = parent !== targetPath ? parent : null;

      return { current: targetPath, parent: parentPath, directories: dirs };
    } catch {
      throw new HttpException('No se pudo leer el directorio', 403);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.files.delete(id);
    return { ok: true };
  }

  @Get(':id/content')
  async content(@Param('id') id: string, @Query('page') page?: string) {
    const result = await this.files.getContent(id, page ? parseInt(page) : undefined);
    if (!result) throw new HttpException('Archivo no encontrado', 404);
    return result;
  }

  @Get(':id/raw')
  async raw(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const file = await this.files.getById(id);
    if (!file || !existsSync(file.filePath)) {
      throw new HttpException('Archivo no encontrado', 404);
    }

    const mediaType = MEDIA_TYPES[file.fileType] || 'application/octet-stream';
    const fileSize = statSync(file.filePath).size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace('bytes=', '').split('-');
      const start = parseInt(parts[0]);
      const end = parts[1] ? parseInt(parts[1]) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mediaType,
        'Content-Disposition': 'inline',
      });
      createReadStream(file.filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mediaType,
        'Content-Disposition': 'inline',
        'Accept-Ranges': 'bytes',
      });
      createReadStream(file.filePath).pipe(res);
    }
  }
}
