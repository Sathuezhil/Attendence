import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PublicAdmin } from '../common/types/public-admin';
import { PrismaService } from '../prisma/prisma.service';

const publicAdminSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toPublicAdmin(
    user: Pick<
      User,
      'id' | 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'
    >,
  ): PublicAdmin {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  count(): Promise<number> {
    return this.prisma.user.count();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findPublicById(id: string): Promise<PublicAdmin | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicAdminSelect,
    });
  }

  createAdmin(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: Role.ADMIN,
      },
    });
  }
}
