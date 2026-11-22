import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { setupApp } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  setupApp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
