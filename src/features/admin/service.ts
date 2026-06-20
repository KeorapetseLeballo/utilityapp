import { prisma } from '@/lib/prisma';

export async function getAdminStats() {
  const [pendingProviders, activeListings, activeSubscriptions, openDisputes, flaggedMessages] =
    await Promise.all([
      prisma.providerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.serviceListing.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.occurrence.count({ where: { status: 'DISPUTED' } }),
      prisma.message.count({ where: { flagged: true } }),
    ]);

  return {
    pendingProviders,
    activeListings,
    activeSubscriptions,
    openDisputes,
    flaggedMessages,
  };
}

export async function listPendingProviders() {
  return prisma.providerProfile.findMany({
    where: { verificationStatus: 'PENDING' },
    include: { user: true, neighborhood: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listDisputes() {
  return prisma.occurrence.findMany({
    where: { status: 'DISPUTED' },
    include: {
      subscription: {
        include: {
          resident: true,
          listing: { include: { provider: { include: { user: true } }, category: true } },
        },
      },
    },
    orderBy: { disputedAt: 'desc' },
  });
}

export async function listFlaggedMessages() {
  return prisma.message.findMany({
    where: { flagged: true },
    include: {
      sender: true,
      subscription: {
        include: {
          resident: true,
          listing: { include: { provider: { include: { user: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listNeighborhoodsAdmin() {
  return prisma.neighborhood.findMany({
    include: {
      _count: { select: { users: true, listings: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createNeighborhood(data: {
  name: string;
  slug: string;
  description?: string;
  postcodes: string[];
}) {
  return prisma.neighborhood.create({ data });
}
