import { prisma } from './prisma';
import type { NotificationType, Prisma } from '@prisma/client';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Prisma.InputJsonValue,
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      metadata,
    },
  });
}

export async function notifyBookingConfirmed(
  residentId: string,
  providerUserId: string,
  listingTitle: string,
) {
  await Promise.all([
    createNotification(
      residentId,
      'BOOKING_CONFIRMED',
      'Subscription confirmed',
      `Your subscription to "${listingTitle}" is active.`,
    ),
    createNotification(
      providerUserId,
      'BOOKING_CONFIRMED',
      'New subscriber',
      `A neighbor subscribed to "${listingTitle}".`,
    ),
  ]);
}

export async function notifyVisitReminder(userId: string, listingTitle: string, when: Date) {
  await createNotification(
    userId,
    'VISIT_REMINDER',
    'Upcoming visit',
    `"${listingTitle}" is scheduled for ${when.toLocaleDateString()} at ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
  );
}

export async function notifyPaymentFailed(userId: string, listingTitle: string) {
  await createNotification(
    userId,
    'PAYMENT_FAILED',
    'Payment failed',
    `We could not process payment for "${listingTitle}". Please update your payment method.`,
  );
}

export async function notifyProviderApproved(userId: string) {
  await createNotification(
    userId,
    'PROVIDER_APPROVED',
    'Profile approved',
    'Your provider profile has been verified. You can now publish listings.',
  );
}

export async function notifyDisputeOpened(userId: string, listingTitle: string) {
  await createNotification(
    userId,
    'DISPUTE_OPENED',
    'Dispute opened',
    `A dispute was opened for "${listingTitle}". Our team will review it.`,
  );
}

export async function notifyNewMessage(userId: string, senderName: string) {
  await createNotification(
    userId,
    'MESSAGE_RECEIVED',
    'New message',
    `${senderName} sent you a message about your subscription.`,
  );
}
