// RAG App — https://github.com/ramoncalvo

import { Controller, Get, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get(':key')
  async get(@Param('key') key: string) {
    const value = await this.settings.get(key);
    return { key, value };
  }
}
