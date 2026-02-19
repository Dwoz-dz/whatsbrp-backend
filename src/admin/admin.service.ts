import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  approveUser(id: string) {
    return this.users.approveUser(id);
  }

  async createConversation(body: {
    type?: 'DM' | 'GROUP';
    title?: string;
    memberIds: string[];
  }) {
    const type = (body.type ?? 'DM') as ConversationType;
    const memberIds = Array.from(new Set(body.memberIds ?? [])).filter(Boolean);

    if (type === ConversationType.DM && memberIds.length !== 2) {
      throw new BadRequestException('DM must have exactly 2 members');
    }
    if (type === ConversationType.GROUP && memberIds.length < 2) {
      throw new BadRequestException('GROUP must have at least 2 members');
    }

    const title =
      type === ConversationType.GROUP ? body.title?.trim() || null : null;

    if (type === ConversationType.GROUP && !title) {
      throw new BadRequestException('GROUP must have a title');
    }

    // validate users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });
    if (users.length !== memberIds.length) {
      const found = new Set(users.map((u) => u.id));
      const missing = memberIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Users not found: ${missing.join(', ')}`);
    }

    // DM: reuse existing DM between exactly same 2 users
    if (type === ConversationType.DM) {
      const [a, b] = memberIds;

      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: ConversationType.DM,
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

  async addMember(
    conversationId: string,
    body: { userId: string; role?: string },
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, type: true },
    });
    if (!conv) {
      throw new NotFoundException(`Conversation not found: ${conversationId}`);
    }

    // ممنوع تزيد عضو في DM
    if (conv.type === ConversationType.DM) {
      throw new BadRequestException('Cannot add members to a DM conversation');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`User not found: ${body.userId}`);

    try {
      await this.prisma.conversationMember.create({
        data: {
          conversationId,
          userId: body.userId,
          role: body.role?.trim() || 'member',
        },
      });
    } catch (e: any) {
      const isUnique =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
      if (isUnique) {
        throw new BadRequestException(
          'User already member in this conversation',
        );
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
}
