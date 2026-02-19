"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const redis_adapter_1 = require("./ws/redis.adapter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // REST validation
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    // CORS (needed for Next/Vite later)
    app.enableCors({
        origin: true,
        credentials: true,
    });
    // WS Redis Adapter (optional)
    const wantRedisWs = process.env.WS_REDIS_ADAPTER === '1';
    if (wantRedisWs) {
        try {
            const redisAdapter = new redis_adapter_1.RedisIoAdapter(app);
            await redisAdapter.connectToRedis();
            app.useWebSocketAdapter(redisAdapter);
            console.log('✅ WS Redis adapter enabled');
        }
        catch (e) {
            console.log('⚠️ WS Redis adapter failed, fallback to default adapter');
            console.log(`   reason: ${e?.message ?? e}`);
        }
    }
    else {
        console.log('ℹ WS Redis adapter disabled (WS_REDIS_ADAPTER != 1)');
    }
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port, '0.0.0.0');
    // print both addresses to avoid the localhost/proxy drama
    console.log(`API running on: http://127.0.0.1:${port}`);
    console.log(`API running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map