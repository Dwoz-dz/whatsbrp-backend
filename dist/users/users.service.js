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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizeEmail(email) {
        const e = email?.trim().toLowerCase();
        if (!e)
            throw new common_1.BadRequestException('email is required');
        return e;
    }
    findByEmail(email) {
        const normalized = this.normalizeEmail(email);
        return this.prisma.user.findUnique({ where: { email: normalized } });
    }
    async createUser(input) {
        const email = this.normalizeEmail(input.email);
        const fullName = input.fullName?.trim();
        if (!fullName)
            throw new common_1.BadRequestException('fullName is required');
        if (!input.passwordHash)
            throw new common_1.BadRequestException('passwordHash is required');
        return this.prisma.user.create({
            data: {
                email,
                fullName,
                passwordHash: input.passwordHash,
                // إذا عندك enum status: PENDING/APPROVED... خليه PENDING افتراضيا
                status: 'PENDING',
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    approveUser(id) {
        if (!id?.trim())
            throw new common_1.BadRequestException('id is required');
        return this.prisma.user.update({
            where: { id },
            data: { status: 'APPROVED' },
            select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async findSafeById(id) {
        if (!id?.trim())
            return null;
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map