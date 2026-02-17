import { Injectable } from '@nestjs/common';
import { PayoutStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const [ledger, payouts] = await Promise.all([
      this.prisma.walletLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.payout.findMany({
        where: { userId },
      }),
    ]);

    const paid = payouts
      .filter((payout) => payout.status === PayoutStatus.PAID)
      .reduce((sum, payout) => sum + payout.amount, 0);
    const pending = payouts
      .filter((payout) => payout.status === PayoutStatus.PENDING)
      .reduce((sum, payout) => sum + payout.amount, 0);

    const credits = ledger
      .filter((entry) => entry.direction === 'CREDIT')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const debits = ledger
      .filter((entry) => entry.direction === 'DEBIT')
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      balance: paid + credits - debits,
      pending,
      payoutSummary: {
        paid,
        pending,
        totalPayouts: payouts.length,
      },
      ledger,
    };
  }

  async getPayouts(userId: string) {
    return this.prisma.payout.findMany({
      where: { userId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            platform: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
