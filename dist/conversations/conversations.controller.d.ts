import { ConversationsService } from './conversations.service';
export declare class ConversationsController {
    private readonly convs;
    constructor(convs: ConversationsService);
    listMine(req: any): Promise<{
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
            text: string;
            senderId: string;
        };
    }[]>;
    listMessages(req: any, conversationId: string, limit?: string, cursor?: string): Promise<{
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
            clientMsgId: string;
            text: string;
            senderId: string;
        }[];
        nextCursor: string | null;
    }>;
}
