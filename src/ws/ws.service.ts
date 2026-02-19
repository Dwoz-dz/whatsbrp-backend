import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

export type ReceiptStatus = 'DELIVERED' | 'READ';

@Injectable()
export class WsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertConversationExists(conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
  }

  async assertMember(conversationId: string, userId: string) {
    await this.assertConversationExists(conversationId);

    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      // ✅ ماكانش id
      select: { userId: true },
    });

    if (!member)
      throw new ForbiddenException('Not a member in this conversation');
  }

  async listMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async persistMessage(input: {
    conversationId: string;
    senderId: string;
    clientMsgId: string;
    text: string;
  }) {
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
    } catch (e: any) {
      const isUnique =
        e instanceof PrismaClientKnownRequestError && e.code === 'P2002';
      if (!isUnique) throw e;

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

      if (!existing) throw e;
      return { duplicated: true, msg: existing };
    }
  }

  /**
   * Create initial receipts for all recipients (excluding sender).
   * Default: DELIVERED (meaning: server stored receipt row; client can update DELIVERED/READ later)
   */
  async ensureReceipts(messageId: string, recipientIds: string[]) {
    if (!recipientIds?.length) return;

    await this.prisma.messageReceipt.createMany({
      data: recipientIds.map((userId) => ({
        messageId,
        userId,
        status: 'DELIVERED',
      })),
      skipDuplicates: true,
    });
  }

  async setReceiptStatus(input: {
    messageId: string;
    userId: string;
    status: ReceiptStatus;
  }) {
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
}
