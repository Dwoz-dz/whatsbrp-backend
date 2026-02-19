import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
export declare class AdminService {
    private readonly prisma;
    private readonly users;
    constructor(prisma: PrismaService, users: UsersService);
    approveUser(id: string): Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        fullName: string | null;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    createConversation(body: {
        type?: 'DM' | 'GROUP';
        title?: string;
        memberIds: string[];
    }): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.ConversationType;
        title: string | null;
        members: {
            userId: string;
            role: string;
            joinedAt: Date;
        }[];
    } | null>;
    addMember(conversationId: string, body: {
        userId: string;
        role?: string;
    }): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.ConversationType;
        title: string | null;
        members: {
            userId: string;
            role: string;
            joinedAt: Date;
        }[];
    } | null>;
}
