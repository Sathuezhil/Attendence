import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

describe('AuthService', () => {
  const usersService = {
    count: jest.fn(),
    createAdmin: jest.fn(),
    findByEmail: jest.fn(),
    findPublicById: jest.fn(),
    toPublicAdmin: jest.fn(),
  };
  const prisma = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn().mockReturnValue('7d'),
  };

  const publicAdmin = {
    id: 'admin-1',
    name: 'Boss',
    email: 'boss@example.com',
    role: Role.ADMIN,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    usersService.toPublicAdmin.mockImplementation(
      (user: typeof publicAdmin) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }),
    );
    jwtService.signAsync.mockResolvedValue('access-token');
    prisma.refreshToken.create.mockResolvedValue({});
    configService.get.mockReturnValue('7d');

    service = new AuthService(
      usersService as never,
      prisma as never,
      jwtService as never,
      configService as never,
    );
  });

  it('creates the first admin and never returns passwordHash', async () => {
    usersService.count.mockResolvedValue(0);
    usersService.createAdmin.mockResolvedValue({
      ...publicAdmin,
      passwordHash: 'hashed',
      twoFactorEnabled: false,
      twoFactorSecret: 'secret',
    });

    const result = await service.register({
      name: 'Boss',
      email: 'boss@example.com',
      password: 'password12',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.user).toEqual(publicAdmin);
    expect(result).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result)).not.toContain('hashed');
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('rejects a second admin registration', async () => {
    usersService.count.mockResolvedValue(1);

    await expect(
      service.register({
        name: 'Boss',
        email: 'boss@example.com',
        password: 'password12',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps a duplicate email to a conflict error', async () => {
    usersService.count.mockResolvedValue(0);
    usersService.createAdmin.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    await expect(
      service.register({
        name: 'Boss',
        email: 'boss@example.com',
        password: 'password12',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid login credentials', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'boss@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with a valid password and excludes passwordHash', async () => {
    const passwordHash = await hash('password12', 4);
    usersService.findByEmail.mockResolvedValue({
      ...publicAdmin,
      passwordHash,
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    const result = await service.login({
      email: 'boss@example.com',
      password: 'password12',
    });

    expect(result.user.email).toBe('boss@example.com');
    expect(result.accessToken).toBe('access-token');
    expect(JSON.stringify(result)).not.toContain(passwordHash);
  });
});
