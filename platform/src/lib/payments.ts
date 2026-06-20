import { prisma } from './prisma';
import { calculatePlatformFee, billingPeriodEnd } from './scheduling';
import type { PaymentStatus } from '@prisma/client';

const PLATFORM_FEE = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);

export async function createSubscriptionPayment(
  subscriptionId: string,
  amountCents: number,
  periodStart: Date,
): Promise<void> {
  const platformFee = calculatePlatformFee(amountCents, PLATFORM_FEE);
  const providerAmount = amountCents - platformFee;

  await prisma.payment.create({
    data: {
      subscriptionId,
      amount: amountCents,
      platformFee,
      providerAmount,
      status: 'PENDING',
      periodStart,
      periodEnd: billingPeriodEnd(periodStart),
    },
  });
}

export async function markPaymentPaid(paymentId: string, stripePaymentId?: string): Promise<void> {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'PAID' satisfies PaymentStatus,
      stripePaymentId: stripePaymentId ?? null,
    },
  });
}

export async function simulatePaymentSuccess(subscriptionId: string): Promise<void> {
  const pending = await prisma.payment.findFirst({
    where: { subscriptionId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  if (pending) {
    await markPaymentPaid(pending.id, `sim_${Date.now()}`);
  }
}

export async function getProviderEarnings(providerUserId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: providerUserId },
    include: {
      listings: {
        include: {
          subscriptions: {
            include: {
              payments: { where: { status: 'PAID' } },
            },
          },
        },
      },
    },
  });

  if (!profile) return { total: 0, payments: [] };

  const payments = profile.listings.flatMap((l) =>
    l.subscriptions.flatMap((s) => s.payments),
  );
  const total = payments.reduce((sum, p) => sum + p.providerAmount, 0);
  return { total, payments };
}
