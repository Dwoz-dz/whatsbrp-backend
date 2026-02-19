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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ConversationsService = class ConversationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    clampLimit(limit) {
        const n = Number.isFinite(limit) ? Math.floor(limit) : 30;
        return Math.min(Math.max(n, 1), 100);
    }
    async assertMember(conversationId, userId) {
        const member = await this.prisma.conversationMember.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
            // ✅ PK مركّب: ماكانش id
            select: { userId: true },
        });
        if (!member)
            throw new common_1.ForbiddenException('Not a member in this conversation');
    }
    async listMyConversations(userId) {
        if (!userId)
            throw new common_1.UnauthorizedException('Missing userId');
        const convs = await this.prisma.conversation.findMany({
            where: { members: { some: { userId } } },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                type: true,
                title: true,
                updatedAt: true,
                members: {
                    select: {
                        userId: true,
                        role: true,
                        joinedAt: true,
                        user: { select: { id: true, email: true, fullName: true } },
                    },
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    // ✅ Message.status تحيّات
                    select: {
                        id: true,
                        senderId: true,
                        text: true,
                        createdAt: true,
                        receipts: {
                            // ✅ MessageReceipt.id تحيّات
                            select: {
                                messageId: true,
                                userId: true,
                                status: true,
                                updatedAt: true,
                            },
                        },
                    },
                },
            },
        });
        return convs.map((c) => {
            const lastMessage = c.messages?.[0] ?? null;
            return {
                id: c.id,
                type: c.type,
                title: c.title,
                updatedAt: c.updatedAt,
                members: c.members,
                lastMessage,
            };
        });
    }
    async listMessages(conversationId, userId, limit = 30, cursor) {
        if (!userId)
            throw new common_1.UnauthorizedException('Missing userId');
        await this.assertMember(conversationId, userId);
        const take = this.clampLimit(limit);
        const items = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take,
            ...(cursor
                ? {
                    cursor: { id: cursor },
                    skip: 1,
                }
                : {}),
            select: {
                id: true,
                conversationId: true,
                senderId: true,
                clientMsgId: true,
                text: true,
                createdAt: true,
                receipts: {
                    // ✅ MessageReceipt.id تحيّات
                    select: {
                        messageId: true,
                        userId: true,
                        status: true,
                        updatedAt: true,
                    },
                },
            },
        });
        const nextCursor = items.length ? items[items.length - 1].id : null;
        return { items, nextCursor };
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map