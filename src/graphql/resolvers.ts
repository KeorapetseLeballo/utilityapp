import { GraphQLScalarType, Kind } from 'graphql';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import * as listingService from '@/features/listings/service';
import * as subscriptionService from '@/features/subscriptions/service';
import * as reviewService from '@/features/reviews/service';
import * as authService from '@/features/auth/service';
import * as adminService from '@/features/admin/service';
import { getProviderEarnings } from '@/lib/payments';

export type GraphQLContext = {
  user: User | null;
};

async function requireUser(ctx: GraphQLContext): Promise<User> {
  if (!ctx.user) throw new Error('Authentication required');
  return ctx.user;
}

async function requireRole(ctx: GraphQLContext, ...roles: User['role'][]): Promise<User> {
  const user = await requireUser(ctx);
  if (!roles.includes(user.role)) throw new Error('Insufficient permissions');
  return user;
}

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) return JSON.parse(ast.value);
    return null;
  },
});

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (value) => (value instanceof Date ? value.toISOString() : value),
  parseValue: (value) => new Date(String(value)),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListing(listing: any) {
  const subs: Array<{ reviews?: { rating: number }[] }> = listing.subscriptions ?? [];
  const avg = listingService.averageRating({
    subscriptions: subs.map((s) => ({ reviews: s.reviews ?? [] })),
  });
  return {
    ...listing,
    providerName: listing.provider.user.name as string,
    averageRating: avg,
    activeSubscribers: subs.length,
  };
}

export const resolvers = {
  JSON: JSONScalar,
  DateTime: DateTimeScalar,

  Query: {
    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) return null;
      return authService.getUserWithRelations(ctx.user.id);
    },

    neighborhoods: () => listingService.listNeighborhoods(),

    categories: () => prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } }),

    listings: async (
      _: unknown,
      args: { categorySlug?: string; minPrice?: number; maxPrice?: number },
      ctx: GraphQLContext,
    ) => {
      const user = await requireUser(ctx);
      if (!user.neighborhoodId) throw new Error('Set your neighborhood first');
      const listings = await listingService.listListings({
        neighborhoodId: user.neighborhoodId,
        ...args,
      });
      return listings.map((l) => mapListing(l));
    },

    listing: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      const listing = await listingService.getListing(id, user.neighborhoodId ?? undefined);
      if (!listing) return null;
      return mapListing(listing);
    },

    mySubscriptions: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return subscriptionService.getResidentSubscriptions(user.id);
    },

    providerSubscriptions: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'PROVIDER', 'ADMIN');
      return subscriptionService.getProviderSubscriptions(user.id);
    },

    providerListings: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'PROVIDER', 'ADMIN');
      const listings = await listingService.getProviderListings(user.id);
      return listings.map((l) => mapListing(l));
    },

    upcomingOccurrences: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      const role = user.role === 'PROVIDER' ? 'provider' : 'resident';
      return subscriptionService.getUpcomingOccurrences(user.id, role);
    },

    listingReviews: async (_: unknown, { listingId }: { listingId: string }) => {
      return reviewService.getListingReviews(listingId);
    },

    messages: async (_: unknown, { subscriptionId }: { subscriptionId: string }, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return reviewService.getMessages(subscriptionId, user.id);
    },

    notifications: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    },

    unreadNotificationCount: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return prisma.notification.count({ where: { userId: user.id, read: false } });
    },

    adminStats: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      await requireRole(ctx, 'ADMIN');
      return adminService.getAdminStats();
    },

    pendingProviders: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      await requireRole(ctx, 'ADMIN');
      return adminService.listPendingProviders();
    },

    providerEarnings: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'PROVIDER', 'ADMIN');
      const { total, payments } = await getProviderEarnings(user.id);
      return { total, paymentCount: payments.length };
    },
  },

  Mutation: {
    createListing: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'PROVIDER');
      const listing = await listingService.createListing(user.id, input);
      return mapListing(listing);
    },

    createSubscription: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'RESIDENT');
      return subscriptionService.createSubscription(user.id, input);
    },

    acceptSubscription: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'PROVIDER');
      return subscriptionService.acceptSubscription(id, user.id);
    },

    pauseSubscription: async (
      _: unknown,
      { id, until }: { id: string; until?: string },
      ctx: GraphQLContext,
    ) => {
      const user = await requireUser(ctx);
      return subscriptionService.pauseSubscription(id, user.id, until ? new Date(until) : undefined);
    },

    cancelSubscription: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return subscriptionService.cancelSubscription(id, user.id);
    },

    skipOccurrence: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'RESIDENT');
      return subscriptionService.skipOccurrence(id, user.id);
    },

    completeOccurrence: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'PROVIDER');
      return subscriptionService.completeOccurrence(id, user.id);
    },

    disputeOccurrence: async (
      _: unknown,
      { id, reason }: { id: string; reason: string },
      ctx: GraphQLContext,
    ) => {
      const user = await requireRole(ctx, 'RESIDENT');
      return subscriptionService.disputeOccurrence(id, user.id, reason);
    },

    createReview: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = await requireRole(ctx, 'RESIDENT');
      return reviewService.createReview(user.id, input);
    },

    sendMessage: async (_: unknown, { input }: { input: unknown }, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return reviewService.sendMessage(user.id, input);
    },

    flagMessage: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return reviewService.flagMessage(id, user.id);
    },

    markNotificationRead: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      return prisma.notification.update({
        where: { id, userId: user.id },
        data: { read: true },
      });
    },

    markAllNotificationsRead: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = await requireUser(ctx);
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      return result.count;
    },

    approveProvider: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      await requireRole(ctx, 'ADMIN');
      return authService.approveProvider(id);
    },

    rejectProvider: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      await requireRole(ctx, 'ADMIN');
      return authService.rejectProvider(id);
    },

    updateProviderProfile: async (
      _: unknown,
      args: {
        bio?: string;
        insuranceUrl?: string;
        licenseUrl?: string;
        backgroundCheck?: boolean;
      },
      ctx: GraphQLContext,
    ) => {
      const user = await requireRole(ctx, 'PROVIDER');
      return prisma.providerProfile.update({
        where: { userId: user.id },
        data: args,
        include: { neighborhood: true },
      });
    },
  },

  ProviderProfile: {
    user: (parent: { userId: string }) =>
      prisma.user.findUnique({ where: { id: parent.userId } }),
    neighborhood: (parent: { neighborhoodId: string }) =>
      prisma.neighborhood.findUnique({ where: { id: parent.neighborhoodId } }),
  },

  ServiceListing: {
    provider: (parent: { providerId: string }) =>
      prisma.providerProfile.findUnique({
        where: { id: parent.providerId },
        include: { neighborhood: true, user: true },
      }),
    neighborhood: (parent: { neighborhoodId: string }) =>
      prisma.neighborhood.findUnique({ where: { id: parent.neighborhoodId } }),
    category: (parent: { categoryId: string }) =>
      prisma.serviceCategory.findUnique({ where: { id: parent.categoryId } }),
  },

  Subscription: {
    listing: async (parent: { listingId: string }) => {
      const listing = await listingService.getListing(parent.listingId);
      return listing ? mapListing(listing) : null;
    },
    resident: (parent: { residentId: string }) =>
      prisma.user.findUnique({ where: { id: parent.residentId } }),
    occurrences: (parent: { id: string }) =>
      prisma.occurrence.findMany({
        where: { subscriptionId: parent.id },
        orderBy: { scheduledAt: 'asc' },
      }),
    payments: (parent: { id: string }) =>
      prisma.payment.findMany({
        where: { subscriptionId: parent.id },
        orderBy: { createdAt: 'desc' },
      }),
  },

  Review: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt,
    reviewer: (parent: { reviewerId: string }) =>
      prisma.user.findUnique({ where: { id: parent.reviewerId } }),
  },

  Message: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt,
    sender: (parent: { senderId: string }) =>
      prisma.user.findUnique({ where: { id: parent.senderId } }),
  },

  Notification: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt,
  },
};

export async function createContext(): Promise<GraphQLContext> {
  const user = await getSessionUser();
  return { user };
}
