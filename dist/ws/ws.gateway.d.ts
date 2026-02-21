import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
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
export declare class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly prisma;
    private readonly jwt;
    server: Server;
    private onlineCount;
    constructor(prisma: PrismaService, jwt: JwtService);
    handleConnection(client: Socket): Promise<Socket<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any> | undefined>;
    handleDisconnect(client: Socket): Promise<void>;
    private bumpOnline;
    private getUser;
    private assertMember;
    private room;
    private userRoom;
    private broadcastPresence;
    onPing(body: any): {
        ok: boolean;
        data: {
            t: any;
        };
    };
    onMe(client: Socket): {
        ok: boolean;
        data: AuthedUser;
    };
    onJoin(client: Socket, body: {
        conversationId: string;
    }): Promise<{
        ok: boolean;
        data: {
            room: string;
        };
    }>;
    onSendMessage(client: Socket, body: {
        conversationId: string;
        clientMsgId: string;
        text: string;
    }): Promise<{
        ok: boolean;
        data: {
            id: string;
            createdAt: Date;
            conversationId: string;
            senderId: string;
            clientMsgId: string;
            text: string;
        };
    }>;
    onTyping(client: Socket, body: {
        conversationId: string;
        isTyping: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    onDelivered(client: Socket, body: {
        messageId: string;
    }): Promise<{
        ok: boolean;
        skipped: boolean;
    } | {
        ok: boolean;
        skipped?: undefined;
    }>;
    onRead(client: Socket, body: {
        conversationId: string;
        messageIds?: string[];
    }): Promise<{
        ok: boolean;
        updated: number;
    }>;
}
export {};
