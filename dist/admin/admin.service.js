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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
let AdminService = class AdminService {
    constructor(prisma, users) {
        this.prisma = prisma;
        this.users = users;
    }
    approveUser(id) {
        return this.users.approveUser(id);
    }
    async createConversation(body) {
        const type = (body.type ?? 'DM');
        const memberIds = Array.from(new Set(body.memberIds ?? [])).filter(Boolean);
        if (type === client_1.ConversationType.DM && memberIds.length !== 2) {
            throw new common_1.BadRequestException('DM must have exactly 2 members');
        }
        if (type === client_1.ConversationType.GROUP && memberIds.length < 2) {
            throw new common_1.BadRequestException('GROUP must have at least 2 members');
        }
        const title = type === client_1.ConversationType.GROUP ? body.title?.trim() || null : null;
        if (type === client_1.ConversationType.GROUP && !title) {
            throw new common_1.BadRequestException('GROUP must have a title');
        }
        // validate users exist
        const users = await this.prisma.user.findMany({
            where: { id: { in: memberIds } },
            select: { id: true },
        });
        if (users.length !== memberIds.length) {
            const found = new Set(users.map((u) => u.id));
            const missing = memberIds.filter((id) => !found.has(id));
            throw new common_1.NotFoundException(`Users not found: ${missing.join(', ')}`);
        }
        // DM: reuse existing DM between exactly same 2 users
        if (type === client_1.ConversationType.DM) {
            const [a, b] = memberIds;
            const existing = await this.prisma.conversation.findFirst({
                where: {
                    type: client_1.ConversationType.DM,
                    AND: [
                        { members: { some: { userId: a } } },
                        { members: { some: { userId: b } } },
                    ],
                },
                select: { id: true, _count: { select: { members: true } } },
            });
            // لازم تكون exactly 2 members
            if (existing?.id && existing._count.members === 2) {
                return this.prisma.conversation.findUnique({
                    where: { id: existing.id },
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        members: { select: { userId: true, role: true, joinedAt: true } },
                    },
                });
            }
        }
        return this.prisma.conversation.create({
            data: {
                type,
                title,
                members: {
                    create: memberIds.map((userId) => ({
                        userId,
                        role: 'member',
                    })),
                },
            },
            select: {
                id: true,
                type: true,
                title: true,
                members: { select: { userId: true, role: true, joinedAt: true } },
            },
        });
    }
    async addMember(conversationId, body) {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { id: true, type: true },
        });
        if (!conv) {
            throw new common_1.NotFoundException(`Conversation not found: ${conversationId}`);
        }
        // ممنوع تزيد عضو في DM
        if (conv.type === client_1.ConversationType.DM) {
            throw new common_1.BadRequestException('Cannot add members to a DM conversation');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: body.userId },
            select: { id: true },
        });
        if (!user)
            throw new common_1.NotFoundException(`User not found: ${body.userId}`);
        try {
            await this.prisma.conversationMember.create({
                data: {
                    conversationId,
                    userId: body.userId,
                    role: body.role?.trim() || 'member',
                },
            });
        }
        catch (e) {
            const isUnique = e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
            if (isUnique) {
                throw new common_1.BadRequestException('User already member in this conversation');
            }
            throw e;
        }
        return this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                type: true,
                title: true,
                members: { select: { userId: true, role: true, joinedAt: true } },
            },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService])
], AdminService);
//# sourceMappingURL=admin.service.js.map