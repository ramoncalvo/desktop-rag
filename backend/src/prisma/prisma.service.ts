// RAG App — https://github.com/ramoncalvo

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';

const DB_DIR = join(homedir(), '.rag-app');
const DB_PATH = join(DB_DIR, 'data.db');
mkdirSync(DB_DIR, { recursive: true });
process.env.DATABASE_URL = `file:${DB_PATH}`;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
