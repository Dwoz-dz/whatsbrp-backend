import { ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupWsAdapter } from "./ws/ws.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  setupWsAdapter(app);

  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port, "0.0.0.0");

  Logger.log(`API running on: http://127.0.0.1:${port}`, "BOOT");
  Logger.log(`API running on: http://localhost:${port}`, "BOOT");
}

bootstrap();
