import { Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
type JwtPayload = {
    sub: string;
    email?: string;
    iat?: number;
    exp?: number;
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly users;
    constructor(users: UsersService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        fullName: string | null;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
