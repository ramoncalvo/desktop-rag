// RAG App — https://github.com/ramoncalvo

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    return setting?.value || '';
  }

  async set(key: string, value: string): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
