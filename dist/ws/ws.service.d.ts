import { PrismaService } from '../prisma/prisma.service';
export type ReceiptStatus = 'DELIVERED' | 'READ';
export declare class WsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    assertConversationExists(conversationId: string): Promise<void>;
    assertMember(conversationId: string, userId: string): Promise<void>;
    listMemberIds(conversationId: string): Promise<string[]>;
    persistMessage(input: {
        conversationId: string;
        senderId: string;
        clientMsgId: string;
        text: string;
    }): Promise<{
        duplicated: boolean;
        msg: {
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
        };
    }>;
    /**
     * Create initial receipts for all recipients (excluding sender).
     * Default: DELIVERED (meaning: server stored receipt row; client can update DELIVERED/READ later)
     */
    ensureReceipts(messageId: string, recipientIds: string[]): Promise<void>;
    setReceiptStatus(input: {
        messageId: string;
        userId: string;
        status: ReceiptStatus;
    }): Promise<{
        status: import(".prisma/client").$Enums.ReceiptStatus;
        updatedAt: Date;
        userId: string;
        messageId: string;
    }>;
}
