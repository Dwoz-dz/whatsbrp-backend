"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsRedisAdapter = void 0;
exports.setupWsRedisAdapter = setupWsRedisAdapter;
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const redis_1 = require("redis");
class WsRedisAdapter extends platform_socket_io_1.IoAdapter {
    constructor() {
        super(...arguments);
        this.adapterConstructor = null;
    }
    async connectToRedis() {
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const pubClient = (0, redis_1.createClient)({ url });
        const subClient = pubClient.duplicate();
        await pubClient.connect();
        await subClient.connect();
        this.adapterConstructor = (0, redis_adapter_1.createAdapter)(pubClient, subClient);
    }
    createIOServer(port, options) {
        const server = super.createIOServer(port, options);
        if (this.adapterConstructor) {
            server.adapter(this.adapterConstructor);
        }
        return server;
    }
}
exports.WsRedisAdapter = WsRedisAdapter;
async function setupWsRedisAdapter(app) {
    const adapter = new WsRedisAdapter(app);
    await adapter.connectToRedis();
    app.useWebSocketAdapter(adapter);
}
//# sourceMappingURL=ws.adapter.js.map