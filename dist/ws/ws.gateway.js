"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsGateway = void 0;
// apps/api-nest/src/ws/ws.gateway.ts
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const prisma_service_1 = require("../prisma/prisma.service");
let WsGateway = class WsGateway {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
        // userId -> number of active sockets
        this.onlineCount = new Map();
    }
    // =========================
    // Auth + presence connect
    // =========================
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token;
            if (!token)
                return client.disconnect(true);
            const payload = await this.jwt.verifyAsync(token);
            // ⚠️ requires prisma schema + migration to include lastSeenAt
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    lastSeenAt: true,
                },
            });
            if (!user)
                return client.disconnect(true);
            client.data.user = user;
            // join personal room for direct notifications (presence updates)
            client.join(this.userRoom(user.id));
            // mark online
            this.bumpOnline(user.id, +1);
            // presence broadcast
            await this.broadcastPresence(user.id, true);
        }
        catch (e) {
            console.log('WS auth failed:', e?.message ?? e);
            client.disconnect(true);
        }
    }
    // =========================
    // Presence disconnect
    // =========================
    async handleDisconnect(client) {
        const user = client.data.user;
        if (!user)
            return;
        this.bumpOnline(user.id, -1);
        // still has another socket => still online
        if ((this.onlineCount.get(user.id) ?? 0) > 0)
            return;
        // update lastSeenAt
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastSeenAt: new Date() },
            select: { id: true },
        });
        await this.broadcastPresence(user.id, false);
    }
    // =========================
    // Helpers
    // =========================
    bumpOnline(userId, delta) {
        const cur = this.onlineCount.get(userId) ?? 0;
        const next = Math.max(0, cur + delta);
        this.onlineCount.set(userId, next);
    }
    getUser(client) {
        const user = client.data.user;
        if (!user)
            throw new websockets_1.WsException('UNAUTHORIZED');
        return user;
    }
    async assertMember(conversationId, userId) {
        const m = await this.prisma.conversationMember.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
            select: { userId: true },
        });
        if (!m)
            throw new websockets_1.WsException('NOT_A_MEMBER');
    }
    room(conversationId) {
        return `conv:${conversationId}`;
    }
    userRoom(userId) {
        return `user:${userId}`;
    }
    // notify all other members (via their personal rooms)
    async broadcastPresence(userId, online) {
        // convs where this user is member
        const convs = await this.prisma.conversationMember.findMany({
            where: { userId },
            select: { conversationId: true },
        });
        const convIds = convs.map((c) => c.conversationId);
        if (!convIds.length)
            return;
        // all users in those convs
        const members = await this.prisma.conversationMember.findMany({
            where: { conversationId: { in: convIds } },
            select: { userId: true },
        });
        const unique = new Set(members.map((m) => m.userId));
        unique.delete(userId);
        const u = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { lastSeenAt: true },
        });
        const payload = {
            userId,
            online,
            lastSeenAt: u?.lastSeenAt ? u.lastSeenAt.toISOString() : null,
        };
        unique.forEach((targetId) => {
            this.server.to(this.userRoom(targetId)).emit('presence:update', payload);
        });
    }
    // =========================
    // BASIC
    // =========================
    onPing(body) {
        return { ok: true, data: { t: body?.t ?? Date.now() } };
    }
    onMe(client) {
        return { ok: true, data: this.getUser(client) };
    }
    // =========================
    // JOIN + Auto DELIVERED
    // =========================
    async onJoin(client, body) {
        const user = this.getUser(client);
        if (!body?.conversationId)
            throw new websockets_1.WsException('BAD_REQUEST');
        await this.assertMember(body.conversationId, user.id);
        const room = this.room(body.conversationId);
        await client.join(room);
        // Auto DELIVERED for last 50 messages sent by others
        const lastMsgs = await this.prisma.message.findMany({
            where: {
                conversationId: body.conversationId,
                senderId: { not: user.id },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: { id: true },
        });
        const ids = lastMsgs.map((m) => m.id);
        if (!ids.length)
            return { ok: true, data: { room } };
        const existing = await this.prisma.messageReceipt.findMany({
            where: { userId: user.id, messageId: { in: ids } },
            select: { messageId: true, status: true },
        });
        const map = new Map(existing.map((r) => [r.messageId, r.status]));
        const toUpsert = ids.filter((id) => {
            const st = map.get(id);
            return st !== 'DELIVERED' && st !== 'READ';
        });
        if (!toUpsert.length)
            return { ok: true, data: { room } };
        const receipts = await this.prisma.$transaction(toUpsert.map((messageId) => this.prisma.messageReceipt.upsert({
            where: { messageId_userId: { messageId, userId: user.id } },
            update: { status: 'DELIVERED' },
            create: { messageId, userId: user.id, status: 'DELIVERED' },
            select: {
                messageId: true,
                userId: true,
                status: true,
                updatedAt: true,
            },
        })));
        receipts.forEach((r) => this.server.to(room).emit('receipt:update', r));
        return { ok: true, data: { room } };
    }
    // =========================
    // SEND MESSAGE
    // =========================
    async onSendMessage(client, body) {
        const user = this.getUser(client);
        if (!body?.conversationId || !body?.clientMsgId || !body?.text) {
            throw new websockets_1.WsException('BAD_REQUEST');
        }
        await this.assertMember(body.conversationId, user.id);
        const msg = await this.prisma.message.create({
            data: {
                conversationId: body.conversationId,
                senderId: user.id,
                clientMsgId: body.clientMsgId,
                text: body.text,
            },
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                clientMsgId: true,
                text: true,
                createdAt: true,
            },
        });
        const room = this.room(body.conversationId);
        this.server.to(room).emit('message:new', msg);
        return { ok: true, data: msg };
    }
    // =========================
    // TYPING
    // =========================
    async onTyping(client, body) {
        const user = this.getUser(client);
        if (!body?.conversationId)
            throw new websockets_1.WsException('BAD_REQUEST');
        await this.assertMember(body.conversationId, user.id);
        const room = this.room(body.conversationId);
        client.to(room).emit('typing', {
            conversationId: body.conversationId,
            userId: user.id,
            isTyping: !!body.isTyping,
        });
        return { ok: true };
    }
    // =========================
    // DELIVERED (manual/fallback) + no duplicates
    // =========================
    async onDelivered(client, body) {
        const user = this.getUser(client);
        if (!body?.messageId)
            throw new websockets_1.WsException('BAD_REQUEST');
        const msg = await this.prisma.message.findUnique({
            where: { id: body.messageId },
            select: { id: true, conversationId: true, senderId: true },
        });
        if (!msg)
            throw new websockets_1.WsException('MESSAGE_NOT_FOUND');
        await this.assertMember(msg.conversationId, user.id);
        // sender cannot deliver his own message
        if (msg.senderId === user.id)
            return { ok: true, skipped: true };
        const existing = await this.prisma.messageReceipt.findUnique({
            where: { messageId_userId: { messageId: msg.id, userId: user.id } },
            select: { status: true },
        });
        // already delivered/read => skip + do NOT emit duplicate events
        if (existing?.status === 'DELIVERED' || existing?.status === 'READ') {
            return { ok: true, skipped: true };
        }
        const receipt = await this.prisma.messageReceipt.upsert({
            where: { messageId_userId: { messageId: msg.id, userId: user.id } },
            update: { status: 'DELIVERED' },
            create: { messageId: msg.id, userId: user.id, status: 'DELIVERED' },
            select: { messageId: true, userId: true, status: true, updatedAt: true },
        });
        this.server
            .to(this.room(msg.conversationId))
            .emit('receipt:update', receipt);
        return { ok: true };
    }
    // =========================
    // READ + no duplicates + ignore own messages even if provided
    // =========================
    async onRead(client, body) {
        const user = this.getUser(client);
        if (!body?.conversationId)
            throw new websockets_1.WsException('BAD_REQUEST');
        await this.assertMember(body.conversationId, user.id);
        // Build ids list
        let ids = [];
        if (body.messageIds?.length) {
            // filter out own messages safely
            const msgs = await this.prisma.message.findMany({
                where: {
                    id: { in: body.messageIds },
                    conversationId: body.conversationId,
                    senderId: { not: user.id },
                },
                select: { id: true },
            });
            ids = msgs.map((m) => m.id);
        }
        else {
            const msgs = await this.prisma.message.findMany({
                where: {
                    conversationId: body.conversationId,
                    senderId: { not: user.id },
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: { id: true },
            });
            ids = msgs.map((m) => m.id);
        }
        if (!ids.length)
            return { ok: true, updated: 0 };
        const existing = await this.prisma.messageReceipt.findMany({
            where: { userId: user.id, messageId: { in: ids } },
            select: { messageId: true, status: true },
        });
        const statusMap = new Map(existing.map((r) => [r.messageId, r.status]));
        const toUpsert = ids.filter((id) => statusMap.get(id) !== 'READ');
        if (!toUpsert.length)
            return { ok: true, updated: 0 };
        const receipts = await this.prisma.$transaction(toUpsert.map((messageId) => this.prisma.messageReceipt.upsert({
            where: { messageId_userId: { messageId, userId: user.id } },
            update: { status: 'READ' },
            create: { messageId, userId: user.id, status: 'READ' },
            select: {
                messageId: true,
                userId: true,
                status: true,
                updatedAt: true,
            },
        })));
        const room = this.room(body.conversationId);
        receipts.forEach((r) => this.server.to(room).emit('receipt:update', r));
        return { ok: true, updated: receipts.length };
    }
};
exports.WsGateway = WsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WsGateway.prototype, "onPing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('me'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], WsGateway.prototype, "onMe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateway.prototype, "onJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateway.prototype, "onSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateway.prototype, "onTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:delivered'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateway.prototype, "onDelivered", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message:read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], WsGateway.prototype, "onRead", null);
exports.WsGateway = WsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: true, credentials: true },
        path: '/socket.io',
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], WsGateway);
//# sourceMappingURL=ws.gateway.js.map