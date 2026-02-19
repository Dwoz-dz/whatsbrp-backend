import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly admin;
    constructor(admin: AdminService);
    ping(key?: string): {
        received: string | null;
        expectedExists: boolean;
    };
    approve(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
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
