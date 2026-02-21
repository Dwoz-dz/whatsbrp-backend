import { PrismaService } from '../prisma/prisma.service';
export declare class ConversationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private clampLimit;
    assertMember(conversationId: string, userId: string): Promise<void>;
    listMyConversations(userId: string): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.ConversationType;
        title: string | null;
        updatedAt: Date;
        members: {
            user: {
                id: string;
                email: string;
                fullName: string | null;
            };
            userId: string;
            role: string;
            joinedAt: Date;
        }[];
        lastMessage: {
            id: string;
            createdAt: Date;
            receipts: {
                status: import(".prisma/client").$Enums.ReceiptStatus;
                updatedAt: Date;
                userId: string;
                messageId: string;
            }[];
            senderId: string;
            text: string;
        };
    }[]>;
    listMessages(conversationId: string, userId: string, limit?: number, cursor?: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            receipts: {
                status: import(".prisma/client").$Enums.ReceiptStatus;
                updatedAt: Date;
                userId: string;
                messageId: string;
            }[];
            conversationId: string;
            senderId: string;
            clientMsgId: string;
            text: string;
        }[];
        nextCursor: string | null;
    }>;
}
