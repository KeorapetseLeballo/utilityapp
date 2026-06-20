import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const createReviewSchema = z.object({
  subscriptionId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function createReview(reviewerId: string, input: unknown) {
  const data = createReviewSchema.parse(input);

  const subscription = await prisma.subscription.findUnique({
    where: { id: data.subscriptionId },
    include: {
      occurrences: true,
    },
  });
  if (!subscription) throw new Error('Subscription not found');
  if (subscription.residentId !== reviewerId) throw new Error('Only residents can review');

  const hasCompleted = subscription.occurrences.some((o) => o.status === 'COMPLETED');
  if (!hasCompleted) throw new Error('Complete at least one visit before reviewing');

  return prisma.review.create({
    data: {
      subscriptionId: data.subscriptionId,
      reviewerId,
      rating: data.rating,
      comment: data.comment,
    },
  });
}

export async function getListingReviews(listingId: string) {
  const reviews = await prisma.review.findMany({
    where: { subscription: { listingId } },
    include: { reviewer: true },
    orderBy: { createdAt: 'desc' },
  });
  return reviews;
}

export const sendMessageSchema = z.object({
  subscriptionId: z.string().min(1),
  body: z.string().min(1).max(2000),
});

export async function sendMessage(senderId: string, input: unknown) {
  const data = sendMessageSchema.parse(input);

  const subscription = await prisma.subscription.findUnique({
    where: { id: data.subscriptionId },
    include: { listing: { include: { provider: true } }, resident: true },
  });
  if (!subscription) throw new Error('Subscription not found');

  const isParticipant =
    subscription.residentId === senderId ||
    subscription.listing.provider.userId === senderId;
  if (!isParticipant) throw new Error('Not authorized');
  if (!['ACTIVE', 'PAUSED', 'PENDING'].includes(subscription.status)) {
    throw new Error('Messaging unavailable for this subscription');
  }

  const message = await prisma.message.create({
    data: {
      subscriptionId: data.subscriptionId,
      senderId,
      body: data.body,
    },
    include: { sender: true },
  });

  const recipientId =
    senderId === subscription.residentId
      ? subscription.listing.provider.userId
      : subscription.residentId;

  const { notifyNewMessage } = await import('@/lib/notifications');
  await notifyNewMessage(recipientId, message.sender.name);

  return message;
}

export async function getMessages(subscriptionId: string, userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      OR: [{ residentId: userId }, { listing: { provider: { userId } } }],
    },
  });
  if (!subscription) throw new Error('Not authorized');

  return prisma.message.findMany({
    where: { subscriptionId },
    include: { sender: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function flagMessage(messageId: string, reporterId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { subscription: { include: { listing: { include: { provider: true } } } } },
  });
  if (!message) throw new Error('Message not found');

  const isParticipant =
    message.subscription.residentId === reporterId ||
    message.subscription.listing.provider.userId === reporterId;
  if (!isParticipant) throw new Error('Not authorized');

  return prisma.message.update({
    where: { id: messageId },
    data: { flagged: true },
  });
}
