import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateFromAuth(input: {
    authProviderId: string;
    email: string;
    displayName: string;
  }) {
    return this.prisma.user.upsert({
      where: { authProviderId: input.authProviderId },
      update: {
        email: input.email,
        displayName: input.displayName,
      },
      create: {
        authProviderId: input.authProviderId,
        email: input.email,
        displayName: input.displayName,
      },
    });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        creatorProfile: true,
        streak: true,
      },
    });
  }

  async getPublicCreator(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        username: true,
        creatorProfile: true,
        streak: true,
      },
    });
  }
}
