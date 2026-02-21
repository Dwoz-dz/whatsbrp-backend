"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWsAdapter = setupWsAdapter;
const common_1 = require("@nestjs/common");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
function setupWsAdapter(app) {
    // 🔥 بدون Redis (نسخة نظيفة)
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    common_1.Logger.log('WS Adapter running WITHOUT Redis ✅', 'WS');
}
//# sourceMappingURL=ws.adapter.js.map