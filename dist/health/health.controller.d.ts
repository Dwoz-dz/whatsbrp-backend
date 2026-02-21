import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ping(): {
        status: string;
    };
    dbTest(): Promise<{
        db: string;
        message?: undefined;
    } | {
        db: string;
        message: any;
    }>;
}
