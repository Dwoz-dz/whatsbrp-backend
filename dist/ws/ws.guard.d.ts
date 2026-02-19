import { CanActivate } from '@nestjs/common';
import { UsersService } from '../users/users.service';
export declare class WsJwtGuard implements CanActivate {
    private readonly users;
    constructor(users: UsersService);
    canActivate(context: any): Promise<boolean>;
    private fromAuthHeader;
}
