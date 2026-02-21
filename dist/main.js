"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const ws_adapter_1 = require("./ws/ws.adapter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.enableCors({
        origin: true,
        credentials: true,
    });
    (0, ws_adapter_1.setupWsAdapter)(app);
    const port = Number(process.env.PORT ?? 8080);
    await app.listen(port, "0.0.0.0");
    common_1.Logger.log(`API running on: http://127.0.0.1:${port}`, "BOOT");
    common_1.Logger.log(`API running on: http://localhost:${port}`, "BOOT");
}
bootstrap();
//# sourceMappingURL=main.js.map