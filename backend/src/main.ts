// RAG App — https://github.com/ramoncalvo

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(5555, '127.0.0.1');
  console.log('[nestjs] Backend running on http://127.0.0.1:5555');
}
bootstrap();
