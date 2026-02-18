import { Injectable, NotFoundException } from '@nestjs/common';
import { StepStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { addDays, startOfDay, startOfToday } from '@/common/utils/date';

@Injectable()
export class DailyStepsService {
  constructor(private readonly prisma: PrismaService) {}

  private pickSteps<T>(items: T[], count: number): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  async assignDailyStepsForUser(userId: string, date = startOfToday()) {
    const normalizedDate = startOfDay(date);

    const existing = await this.prisma.userDailyStep.findMany({
      where: {
        userId,
        dateAssigned: normalizedDate,
      },
      include: {
        dailyStep: true,
      },
    });

    if (existing.length > 0) {
      return existing;
    }

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return [];
    }

    const targetedCandidates = await this.prisma.dailyStep.findMany({
      where: {
        active: true,
        AND: [
          {
            OR: [{ targetGoals: { isEmpty: true } }, { targetGoals: { has: profile.goal } }],
          },
          {
            OR: [
              { targetGrowthStyles: { isEmpty: true } },
              { targetGrowthStyles: { has: profile.growthStyle } },
            ],
          },
          {
            OR: [
              { targetNiches: { isEmpty: true } },
              { targetNiches: { has: profile.primaryNiche } },
              { targetNiches: { has: 'OTHER' } },
            ],
          },
        ],
      },
    });

    const fallbackCandidates = await this.prisma.dailyStep.findMany({
      where: { active: true },
    });

    const targetCount = Math.min(5, Math.max(3, targetedCandidates.length || 3));
    const selectedFromTarget = this.pickSteps(targetedCandidates, targetCount);

    const missing = Math.max(0, targetCount - selectedFromTarget.length);
    const selectedFallback = this.pickSteps(
      fallbackCandidates.filter(
        (step) => !selectedFromTarget.find((picked) => picked.id === step.id),
      ),
      missing,
    );

    const selected = [...selectedFromTarget, ...selectedFallback];

    if (!selected.length) {
      return [];
    }

    await this.prisma.userDailyStep.createMany({
      data: selected.map((step) => ({
        userId,
        dailyStepId: step.id,
        dateAssigned: normalizedDate,
      })),
      skipDuplicates: true,
    });

    return this.prisma.userDailyStep.findMany({
      where: {
        userId,
        dateAssigned: normalizedDate,
      },
      include: {
        dailyStep: true,
      },
    });
  }

  async getTodaySteps(userId: string) {
    return this.assignDailyStepsForUser(userId, startOfToday());
  }

  private async updateStreak(userId: string, completionDate: Date) {
    const date = startOfDay(completionDate);
    const yesterday = addDays(date, -1);

    const streak = await this.prisma.streak.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    if (streak.lastCompletedDate && startOfDay(streak.lastCompletedDate).getTime() === date.getTime()) {
      return streak;
    }

    const nextCurrentStreak =
      streak.lastCompletedDate &&
      startOfDay(streak.lastCompletedDate).getTime() === yesterday.getTime()
        ? streak.currentStreak + 1
        : 1;

    return this.prisma.streak.update({
      where: { userId },
      data: {
        currentStreak: nextCurrentStreak,
        longestStreak: Math.max(streak.longestStreak, nextCurrentStreak),
        lastCompletedDate: date,
      },
    });
  }

  async completeStep(userId: string, userDailyStepId: string, evidenceUrl?: string) {
    const step = await this.prisma.userDailyStep.findFirst({
      where: {
        id: userDailyStepId,
        userId,
      },
    });

    if (!step) {
      throw new NotFoundException('Daily step not found');
    }

    if (step.status !== StepStatus.COMPLETED) {
      await this.prisma.userDailyStep.update({
        where: { id: userDailyStepId },
        data: {
          status: StepStatus.COMPLETED,
          evidenceUrl,
          completedAt: new Date(),
        },
      });
      await this.updateStreak(userId, new Date());
    }

    return this.prisma.userDailyStep.findUnique({
      where: { id: userDailyStepId },
      include: {
        dailyStep: true,
      },
    });
  }

  async getStreak(userId: string) {
    return this.prisma.streak.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async assignDailyStepsForAllUsers(date = startOfToday()) {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      await this.assignDailyStepsForUser(user.id, date);
    }

    return users.length;
  }

  async cleanExpiredAssignedSteps(cutoffDate = startOfToday()) {
    const result = await this.prisma.userDailyStep.updateMany({
      where: {
        status: StepStatus.ASSIGNED,
        dateAssigned: {
          lt: cutoffDate,
        },
      },
      data: {
        status: StepStatus.SKIPPED,
      },
    });

    return result.count;
  }
}
