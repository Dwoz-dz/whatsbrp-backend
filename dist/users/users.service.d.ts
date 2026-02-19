import { PrismaService } from '../prisma/prisma.service';
type CreateUserInput = {
    email: string;
    fullName: string;
    passwordHash: string;
};
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private normalizeEmail;
    findByEmail(email: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        fullName: string | null;
        passwordHash: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        lastSeenAt: Date | null;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    createUser(input: CreateUserInput): Promise<{
        id: string;
        email: string;
        fullName: string | null;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
    approveUser(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        fullName: string | null;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findSafeById(id: string): Promise<{
        id: string;
        email: string;
        fullName: string | null;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
}
export {};
