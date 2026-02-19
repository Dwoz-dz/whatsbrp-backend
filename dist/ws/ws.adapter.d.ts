import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
export declare class WsRedisAdapter extends IoAdapter {
    private adapterConstructor;
    connectToRedis(): Promise<void>;
    createIOServer(port: number, options?: any): any;
}
export declare function setupWsRedisAdapter(app: INestApplication): Promise<void>;
