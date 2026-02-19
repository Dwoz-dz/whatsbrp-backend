// apps/api-nest/src/ws/ws.gateway.ts
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

type AuthedUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt?: Date | null;
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: '/socket.io',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  // userId -> number of active sockets
  private onlineCount = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // =========================
  // Auth + presence connect
  // =========================
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) return client.disconnect(true);

      const payload: any = await this.jwt.verifyAsync(token);

      // ⚠️ requires prisma schema + migration to include lastSeenAt
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastSeenAt: true,
        },
      });

      if (!user) return client.disconnect(true);

      client.data.user = user as AuthedUser;

      // join personal room for direct notifications (presence updates)
      client.join(this.userRoom(user.id));

      // mark online
      this.bumpOnline(user.id, +1);

      // presence broadcast
      await this.broadcastPresence(user.id, true);
    } catch (e: any) {
      console.log('WS auth failed:', e?.message ?? e);
      client.disconnect(true);
    }
  }

  // =========================
  // Presence disconnect
  // =========================
  async handleDisconnect(client: Socket) {
    const user = client.data.user as AuthedUser | undefined;
    if (!user) return;

    this.bumpOnline(user.id, -1);

    // still has another socket => still online
    if ((this.onlineCount.get(user.id) ?? 0) > 0) return;

    // update lastSeenAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
      select: { id: true },
    });

    await this.broadcastPresence(user.id, false);
  }

  // =========================
  // Helpers
  // =========================
  private bumpOnline(userId: string, delta: number) {
    const cur = this.onlineCount.get(userId) ?? 0;
    const next = Math.max(0, cur + delta);
    this.onlineCount.set(userId, next);
  }

  private getUser(client: Socket): AuthedUser {
    const user = client.data.user as AuthedUser | undefined;
    if (!user) throw new WsException('UNAUTHORIZED');
    return user;
  }

  private async assertMember(conversationId: string, userId: string) {
    const m = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { userId: true },
    });
    if (!m) throw new WsException('NOT_A_MEMBER');
  }

  private room(conversationId: string) {
    return `conv:${conversationId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  // notify all other members (via their personal rooms)
  private async broadcastPresence(userId: string, online: boolean) {
    // convs where this user is member
    const convs = await this.prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    const convIds = convs.map((c) => c.conversationId);
    if (!convIds.length) return;

    // all users in those convs
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: { in: convIds } },
      select: { userId: true },
    });

    const unique = new Set(members.map((m) => m.userId));
    unique.delete(userId);

    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastSeenAt: true },
    });

    const payload = {
      userId,
      online,
      lastSeenAt: u?.lastSeenAt ? u.lastSeenAt.toISOString() : null,
    };

    unique.forEach((targetId) => {
      this.server.to(this.userRoom(targetId)).emit('presence:update', payload);
    });
  }

  // =========================
  // BASIC
  // =========================
  @SubscribeMessage('ping')
  onPing(@MessageBody() body: any) {
    return { ok: true, data: { t: body?.t ?? Date.now() } };
  }

  @SubscribeMessage('me')
  onMe(@ConnectedSocket() client: Socket) {
    return { ok: true, data: this.getUser(client) };
  }

  // =========================
  // JOIN + Auto DELIVERED
  // =========================
  @SubscribeMessage('join')
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const user = this.getUser(client);
    if (!body?.conversationId) throw new WsException('BAD_REQUEST');

    await this.assertMember(body.conversationId, user.id);

    const room = this.room(body.conversationId);
    await client.join(room);

    // Auto DELIVERED for last 50 messages sent by others
    const lastMsgs = await this.prisma.message.findMany({
      where: {
        conversationId: body.conversationId,
        senderId: { not: user.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true },
    });

    const ids = lastMsgs.map((m) => m.id);
    if (!ids.length) return { ok: true, data: { room } };

    const existing = await this.prisma.messageReceipt.findMany({
      where: { userId: user.id, messageId: { in: ids } },
      select: { messageId: true, status: true },
    });

    const map = new Map(existing.map((r) => [r.messageId, r.status]));
    const toUpsert = ids.filter((id) => {
      const st = map.get(id);
      return st !== 'DELIVERED' && st !== 'READ';
    });

    if (!toUpsert.length) return { ok: true, data: { room } };

    const receipts = await this.prisma.$transaction(
      toUpsert.map((messageId) =>
        this.prisma.messageReceipt.upsert({
          where: { messageId_userId: { messageId, userId: user.id } },
          update: { status: 'DELIVERED' },
          create: { messageId, userId: user.id, status: 'DELIVERED' },
          select: {
            messageId: true,
            userId: true,
            status: true,
            updatedAt: true,
          },
        }),
      ),
    );

    receipts.forEach((r) => this.server.to(room).emit('receipt:update', r));

    return { ok: true, data: { room } };
  }

  // =========================
  // SEND MESSAGE
  // =========================
  @SubscribeMessage('sendMessage')
  async onSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { conversationId: string; clientMsgId: string; text: string },
  ) {
    const user = this.getUser(client);

    if (!body?.conversationId || !body?.clientMsgId || !body?.text) {
      throw new WsException('BAD_REQUEST');
    }

    await this.assertMember(body.conversationId, user.id);

    const msg = await this.prisma.message.create({
      data: {
        conversationId: body.conversationId,
        senderId: user.id,
        clientMsgId: body.clientMsgId,
        text: body.text,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        clientMsgId: true,
        text: true,
        createdAt: true,
      },
    });

    const room = this.room(body.conversationId);
    this.server.to(room).emit('message:new', msg);

    return { ok: true, data: msg };
  }

  // =========================
  // TYPING
  // =========================
  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; isTyping: boolean },
  ) {
    const user = this.getUser(client);
    if (!body?.conversationId) throw new WsException('BAD_REQUEST');

    await this.assertMember(body.conversationId, user.id);

    const room = this.room(body.conversationId);
    client.to(room).emit('typing', {
      conversationId: body.conversationId,
      userId: user.id,
      isTyping: !!body.isTyping,
    });

    return { ok: true };
  }

  // =========================
  // DELIVERED (manual/fallback) + no duplicates
  // =========================
  @SubscribeMessage('message:delivered')
  async onDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string },
  ) {
    const user = this.getUser(client);
    if (!body?.messageId) throw new WsException('BAD_REQUEST');

    const msg = await this.prisma.message.findUnique({
      where: { id: body.messageId },
      select: { id: true, conversationId: true, senderId: true },
    });
    if (!msg) throw new WsException('MESSAGE_NOT_FOUND');

    await this.assertMember(msg.conversationId, user.id);

    // sender cannot deliver his own message
    if (msg.senderId === user.id) return { ok: true, skipped: true };

    const existing = await this.prisma.messageReceipt.findUnique({
      where: { messageId_userId: { messageId: msg.id, userId: user.id } },
      select: { status: true },
    });

    // already delivered/read => skip + do NOT emit duplicate events
    if (existing?.status === 'DELIVERED' || existing?.status === 'READ') {
      return { ok: true, skipped: true };
    }

    const receipt = await this.prisma.messageReceipt.upsert({
      where: { messageId_userId: { messageId: msg.id, userId: user.id } },
      update: { status: 'DELIVERED' },
      create: { messageId: msg.id, userId: user.id, status: 'DELIVERED' },
      select: { messageId: true, userId: true, status: true, updatedAt: true },
    });

    this.server
      .to(this.room(msg.conversationId))
      .emit('receipt:update', receipt);
    return { ok: true };
  }

  // =========================
  // READ + no duplicates + ignore own messages even if provided
  // =========================
  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; messageIds?: string[] },
  ) {
    const user = this.getUser(client);
    if (!body?.conversationId) throw new WsException('BAD_REQUEST');

    await this.assertMember(body.conversationId, user.id);

    // Build ids list
    let ids: string[] = [];

    if (body.messageIds?.length) {
      // filter out own messages safely
      const msgs = await this.prisma.message.findMany({
        where: {
          id: { in: body.messageIds },
          conversationId: body.conversationId,
          senderId: { not: user.id },
        },
        select: { id: true },
      });
      ids = msgs.map((m) => m.id);
    } else {
      const msgs = await this.prisma.message.findMany({
        where: {
          conversationId: body.conversationId,
          senderId: { not: user.id },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true },
      });
      ids = msgs.map((m) => m.id);
    }

    if (!ids.length) return { ok: true, updated: 0 };

    const existing = await this.prisma.messageReceipt.findMany({
      where: { userId: user.id, messageId: { in: ids } },
      select: { messageId: true, status: true },
    });

    const statusMap = new Map(existing.map((r) => [r.messageId, r.status]));
    const toUpsert = ids.filter((id) => statusMap.get(id) !== 'READ');

    if (!toUpsert.length) return { ok: true, updated: 0 };

    const receipts = await this.prisma.$transaction(
      toUpsert.map((messageId) =>
        this.prisma.messageReceipt.upsert({
          where: { messageId_userId: { messageId, userId: user.id } },
          update: { status: 'READ' },
          create: { messageId, userId: user.id, status: 'READ' },
          select: {
            messageId: true,
            userId: true,
            status: true,
            updatedAt: true,
          },
        }),
      ),
    );

    const room = this.room(body.conversationId);
    receipts.forEach((r) => this.server.to(room).emit('receipt:update', r));

    return { ok: true, updated: receipts.length };
  }
}
