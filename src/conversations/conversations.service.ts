import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  private clampLimit(limit: number) {
    const n = Number.isFinite(limit) ? Math.floor(limit) : 30;
    return Math.min(Math.max(n, 1), 100);
  }

  async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      // ✅ PK مركّب: ماكانش id
      select: { userId: true },
    });

    if (!member)
      throw new ForbiddenException('Not a member in this conversation');
  }

  async listMyConversations(userId: string) {
    if (!userId) throw new UnauthorizedException('Missing userId');

    const convs = await this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        updatedAt: true,
        members: {
          select: {
            userId: true,
            role: true,
            joinedAt: true,
            user: { select: { id: true, email: true, fullName: true } },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          // ✅ Message.status تحيّات
          select: {
            id: true,
            senderId: true,
            text: true,
            createdAt: true,
            receipts: {
              // ✅ MessageReceipt.id تحيّات
              select: {
                messageId: true,
                userId: true,
                status: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    return convs.map((c) => {
      const lastMessage = c.messages?.[0] ?? null;

      return {
        id: c.id,
        type: c.type,
        title: c.title,
        updatedAt: c.updatedAt,
        members: c.members,
        lastMessage,
      };
    });
  }

  async listMessages(
    conversationId: string,
    userId: string,
    limit = 30,
    cursor?: string,
  ) {
    if (!userId) throw new UnauthorizedException('Missing userId');

    await this.assertMember(conversationId, userId);

    const take = this.clampLimit(limit);

    const items = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        clientMsgId: true,
        text: true,
        createdAt: true,
        receipts: {
          // ✅ MessageReceipt.id تحيّات
          select: {
            messageId: true,
            userId: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });

    const nextCursor = items.length ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }
}
