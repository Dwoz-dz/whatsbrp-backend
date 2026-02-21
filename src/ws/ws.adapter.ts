import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

export function setupWsAdapter(app: INestApplication) {
  // 🔥 بدون Redis (نسخة نظيفة)
  app.useWebSocketAdapter(new IoAdapter(app));

  Logger.log('WS Adapter running WITHOUT Redis ✅', 'WS');
}
