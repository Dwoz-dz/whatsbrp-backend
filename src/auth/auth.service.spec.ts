import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersMock = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('register creates user', async () => {
    usersMock.findByEmail.mockResolvedValue(null);

    usersMock.createUser.mockResolvedValue({
      id: 'u_test',
      email: 'test@brp.com',
      fullName: 'Test',
      passwordHash: 'hash',
      status: UserStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await service.register({
      email: 'test@brp.com',
      password: '12345678',
      fullName: 'Test',
    });

    expect(res.email).toBe('test@brp.com');
    expect(usersMock.createUser).toHaveBeenCalled();
  });
});
