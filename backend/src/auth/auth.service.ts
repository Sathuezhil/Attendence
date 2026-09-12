import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AppConfiguration } from '../config/configuration';
import { PublicAdmin } from '../common/types/public-admin';
import { durationToMs } from '../common/utils/duration';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthResponse, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;
const INVALID_CREDENTIALS = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const adminCount = await this.usersService.count();
    if (adminCount > 0) {
      throw new ForbiddenException('An admin account already exists');
    }

    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS);

    try {
      const user = await this.usersService.createAdmin({
        name: dto.name,
        email: dto.email,
        passwordHash,
      });

      return this.issueAuth(this.usersService.toPublicAdmin(user));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.issueAuth(this.usersService.toPublicAdmin(user));
  }

  async me(admin: PublicAdmin): Promise<PublicAdmin> {
    const current = await this.usersService.findPublicById(admin.id);
    if (!current) {
      throw new UnauthorizedException();
    }

    return current;
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueAuth(this.usersService.toPublicAdmin(stored.user));
  }

  async logout(adminId: string): Promise<{ success: true }> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: adminId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { success: true };
  }

  private async issueAuth(user: PublicAdmin): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn', {
      infer: true,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(
          Date.now() + durationToMs(refreshExpiresIn, 7 * 24 * 60 * 60 * 1000),
        ),
      },
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
