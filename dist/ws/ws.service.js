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
exports.WsService = void 0;
const common_1 = require("@nestjs/common");
const library_1 = require("@prisma/client/runtime/library");
const prisma_service_1 = require("../prisma/prisma.service");
let WsService = class WsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertConversationExists(conversationId) {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { id: true },
        });
        if (!conv)
            throw new common_1.NotFoundException('Conversation not found');
    }
    async assertMember(conversationId, userId) {
        await this.assertConversationExists(conversationId);
        const member = await this.prisma.conversationMember.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
            // ✅ ماكانش id
            select: { userId: true },
        });
        if (!member)
            throw new common_1.ForbiddenException('Not a member in this conversation');
    }
    async listMemberIds(conversationId) {
        const members = await this.prisma.conversationMember.findMany({
            where: { conversationId },
            select: { userId: true },
        });
        return members.map((m) => m.userId);
    }
    async persistMessage(input) {
        try {
            const msg = await this.prisma.message.create({
                data: {
                    conversationId: input.conversationId,
                    senderId: input.senderId,
                    clientMsgId: input.clientMsgId,
                    text: input.text,
                    // ✅ Message.status ماكانش
                },
                select: {
                    id: true,
                    conversationId: true,
                    senderId: true,
                    clientMsgId: true,
                    text: true,
                    createdAt: true,
                    receipts: {
                        select: {
                            messageId: true,
                            userId: true,
                            status: true,
                            updatedAt: true,
                        },
                    },
                },
            });
            return { duplicated: false, msg };
        }
        catch (e) {
            const isUnique = e instanceof library_1.PrismaClientKnownRequestError && e.code === 'P2002';
            if (!isUnique)
                throw e;
            const existing = await this.prisma.message.findUnique({
                where: {
                    senderId_clientMsgId: {
                        senderId: input.senderId,
                        clientMsgId: input.clientMsgId,
                    },
                },
                select: {
                    id: true,
                    conversationId: true,
                    senderId: true,
                    clientMsgId: true,
                    text: true,
                    createdAt: true,
                    receipts: {
                        select: {
                            messageId: true,
                            userId: true,
                            status: true,
                            updatedAt: true,
                        },
                    },
                },
            });
            if (!existing)
                throw e;
            return { duplicated: true, msg: existing };
        }
    }
    /**
     * Create initial receipts for all recipients (excluding sender).
     * Default: DELIVERED (meaning: server stored receipt row; client can update DELIVERED/READ later)
     */
    async ensureReceipts(messageId, recipientIds) {
        if (!recipientIds?.length)
            return;
        await this.prisma.messageReceipt.createMany({
            data: recipientIds.map((userId) => ({
                messageId,
                userId,
                status: 'DELIVERED',
            })),
            skipDuplicates: true,
        });
    }
    async setReceiptStatus(input) {
        return this.prisma.messageReceipt.upsert({
            where: {
                messageId_userId: { messageId: input.messageId, userId: input.userId },
            },
            create: {
                messageId: input.messageId,
                userId: input.userId,
                status: input.status,
            },
            update: { status: input.status },
            // ✅ ماكانش id
            select: {
                messageId: true,
                userId: true,
                status: true,
                updatedAt: true,
            },
        });
    }
};
exports.WsService = WsService;
exports.WsService = WsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WsService);
//# sourceMappingURL=ws.service.js.map