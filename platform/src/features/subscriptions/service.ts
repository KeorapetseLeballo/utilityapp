import { addDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { generateOccurrences } from '@/lib/scheduling';
import { createSubscriptionPayment, simulatePaymentSuccess } from '@/lib/payments';
import { notifyBookingConfirmed, notifyDisputeOpened } from '@/lib/notifications';
import { z } from 'zod';

const emergencyContactSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  relationship: z.string().min(2),
});

export const createSubscriptionSchema = z.object({
  listingId: z.string().min(1),
  scheduleDays: z.array(z.number().int().min(0).max(6)).min(1),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  emergencyContact: emergencyContactSchema.optional(),
});

export async function createSubscription(residentId: string, input: unknown) {
  const data = createSubscriptionSchema.parse(input);
  const resident = await prisma.user.findUnique({ where: { id: residentId } });
  if (!resident?.neighborhoodId) throw new Error('Set your neighborhood before subscribing');

  const listing = await prisma.serviceListing.findUnique({
    where: { id: data.listingId },
    include: {
      provider: { include: { user: true } },
      category: true,
      subscriptions: { where: { status: { in: ['ACTIVE', 'PENDING'] } } },
    },
  });

  if (!listing || listing.status !== 'ACTIVE') throw new Error('Listing not available');
  if (listing.neighborhoodId !== resident.neighborhoodId) {
    throw new Error('This service is not in your neighborhood');
  }
  if (listing.subscriptions.length >= listing.capacity) {
    throw new Error('This listing is at capacity');
  }

  const existing = await prisma.subscription.findFirst({
    where: {
      residentId,
      listingId: listing.id,
      status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] },
    },
  });
  if (existing) throw new Error('You already have an active subscription to this listing');

  if (listing.category.slug === 'transport' && !data.emergencyContact) {
    throw new Error('Emergency contact required for school transport');
  }

  const startDate = new Date();
  const billingDay = Math.min(startDate.getDate(), 28);
  const status = listing.autoAccept ? 'ACTIVE' : 'PENDING';

  const subscription = await prisma.subscription.create({
    data: {
      residentId,
      listingId: listing.id,
      status,
      startDate,
      billingDay,
      scheduleDays: data.scheduleDays,
      scheduleTime: data.scheduleTime ?? null,
      emergencyContact: data.emergencyContact ?? undefined,
    },
    include: {
      listing: { include: { provider: { include: { user: true } }, category: true } },
      resident: true,
    },
  });

  if (status === 'ACTIVE') {
    await activateSubscription(subscription.id);
  }

  return subscription;
}

export async function activateSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'ACTIVE' },
    include: {
      listing: { include: { provider: { include: { user: true } } } },
      resident: true,
    },
  });

  const dates = generateOccurrences(
    subscription.startDate,
    subscription.scheduleDays,
    subscription.scheduleTime,
    8,
  );

  await prisma.occurrence.createMany({
    data: dates.map((scheduledAt) => ({
      subscriptionId: subscription.id,
      scheduledAt,
    })),
  });

  await createSubscriptionPayment(
    subscription.id,
    subscription.listing.monthlyPrice,
    subscription.startDate,
  );
  await simulatePaymentSuccess(subscription.id);

  await notifyBookingConfirmed(
    subscription.residentId,
    subscription.listing.provider.userId,
    subscription.listing.title,
  );

  return subscription;
}

export async function acceptSubscription(subscriptionId: string, providerUserId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { listing: { include: { provider: true } } },
  });
  if (!subscription) throw new Error('Subscription not found');
  if (subscription.listing.provider.userId !== providerUserId) {
    throw new Error('Not authorized');
  }
  if (subscription.status !== 'PENDING') throw new Error('Subscription is not pending');

  return activateSubscription(subscriptionId);
}

export async function pauseSubscription(subscriptionId: string, userId: string, until?: Date) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      OR: [
        { residentId: userId },
        { listing: { provider: { userId } } },
      ],
    },
  });
  if (!subscription) throw new Error('Subscription not found');
  if (!['ACTIVE', 'PENDING'].includes(subscription.status)) {
    throw new Error('Cannot pause this subscription');
  }

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'PAUSED',
      pausedUntil: until ?? addDays(new Date(), 14),
    },
  });
}

export async function cancelSubscription(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      OR: [{ residentId: userId }, { listing: { provider: { userId } } }],
    },
  });
  if (!subscription) throw new Error('Subscription not found');

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });
}

export async function skipOccurrence(occurrenceId: string, userId: string) {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
    include: { subscription: true },
  });
  if (!occurrence) throw new Error('Occurrence not found');
  if (occurrence.subscription.residentId !== userId) throw new Error('Not authorized');
  if (occurrence.status !== 'SCHEDULED') throw new Error('Cannot skip this occurrence');

  return prisma.occurrence.update({
    where: { id: occurrenceId },
    data: { status: 'SKIPPED' },
  });
}

export async function completeOccurrence(occurrenceId: string, providerUserId: string) {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
    include: { subscription: { include: { listing: { include: { provider: true } } } } },
  });
  if (!occurrence) throw new Error('Occurrence not found');
  if (occurrence.subscription.listing.provider.userId !== providerUserId) {
    throw new Error('Not authorized');
  }
  if (occurrence.status !== 'SCHEDULED') throw new Error('Cannot complete this occurrence');

  return prisma.occurrence.update({
    where: { id: occurrenceId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

export async function disputeOccurrence(
  occurrenceId: string,
  userId: string,
  reason: string,
) {
  const occurrence = await prisma.occurrence.findUnique({
    where: { id: occurrenceId },
    include: {
      subscription: {
        include: {
          listing: { include: { provider: { include: { user: true } } } },
          resident: true,
        },
      },
    },
  });
  if (!occurrence) throw new Error('Occurrence not found');
  if (occurrence.subscription.residentId !== userId) throw new Error('Not authorized');
  if (occurrence.status !== 'COMPLETED') {
    throw new Error('Can only dispute completed occurrences');
  }

  const updated = await prisma.occurrence.update({
    where: { id: occurrenceId },
    data: {
      status: 'DISPUTED',
      disputedAt: new Date(),
      disputeReason: reason,
    },
  });

  await notifyDisputeOpened(
    occurrence.subscription.listing.provider.userId,
    occurrence.subscription.listing.title,
  );

  return updated;
}

export async function getResidentSubscriptions(residentId: string) {
  return prisma.subscription.findMany({
    where: { residentId },
    include: {
      listing: { include: { category: true, provider: { include: { user: true } } } },
      occurrences: { orderBy: { scheduledAt: 'asc' }, take: 10 },
      payments: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProviderSubscriptions(providerUserId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: providerUserId },
  });
  if (!profile) return [];

  return prisma.subscription.findMany({
    where: { listing: { providerId: profile.id } },
    include: {
      resident: true,
      listing: { include: { category: true } },
      occurrences: { where: { status: 'SCHEDULED' }, orderBy: { scheduledAt: 'asc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUpcomingOccurrences(userId: string, role: 'resident' | 'provider') {
  if (role === 'resident') {
    return prisma.occurrence.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
        subscription: { residentId: userId, status: 'ACTIVE' },
      },
      include: {
        subscription: { include: { listing: { include: { category: true } } } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });
  }

  return prisma.occurrence.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { gte: new Date() },
      subscription: {
        status: 'ACTIVE',
        listing: { provider: { userId } },
      },
    },
    include: {
      subscription: {
        include: { listing: true, resident: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 20,
  });
}
