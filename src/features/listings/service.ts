import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const gardenFields = z.object({
  propertySize: z.enum(['small', 'medium', 'large']),
  visitFrequency: z.enum(['weekly', 'biweekly', 'monthly']),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
});

const transportFields = z.object({
  schoolsServed: z.array(z.string()).min(1),
  pickupWindowStart: z.string(),
  pickupWindowEnd: z.string(),
  dropWindowStart: z.string(),
  dropWindowEnd: z.string(),
  maxChildren: z.number().int().min(1).max(20),
  requiresBackgroundCheck: z.boolean().default(true),
});

const goodsFields = z.object({
  deliveryDays: z.array(z.number().int().min(0).max(6)).min(1),
  minimumOrder: z.number().int().min(0),
  products: z.array(z.string()).min(1),
});

export const createListingSchema = z.object({
  categorySlug: z.enum(['garden', 'transport', 'goods']),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  monthlyPrice: z.number().int().min(100),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  capacity: z.number().int().min(1).max(100).default(10),
  autoAccept: z.boolean().default(false),
  categoryFields: z.record(z.unknown()),
});

function validateCategoryFields(slug: string, fields: Record<string, unknown>) {
  switch (slug) {
    case 'garden':
      return gardenFields.parse(fields);
    case 'transport':
      return transportFields.parse(fields);
    case 'goods':
      return goodsFields.parse(fields);
    default:
      throw new Error('Unknown category');
  }
}

export async function listNeighborhoods() {
  return prisma.neighborhood.findMany({ orderBy: { name: 'asc' } });
}

export async function getNeighborhoodBySlug(slug: string) {
  return prisma.neighborhood.findUnique({ where: { slug } });
}

export async function listListings(filters: {
  neighborhoodId: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  return prisma.serviceListing.findMany({
    where: {
      neighborhoodId: filters.neighborhoodId,
      status: 'ACTIVE',
      ...(filters.categorySlug
        ? { category: { slug: filters.categorySlug } }
        : {}),
      ...(filters.minPrice != null ? { monthlyPrice: { gte: filters.minPrice } } : {}),
      ...(filters.maxPrice != null ? { monthlyPrice: { lte: filters.maxPrice } } : {}),
    },
    include: {
      category: true,
      provider: { include: { user: true } },
      subscriptions: { where: { status: { in: ['ACTIVE', 'PENDING'] } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getListing(id: string, neighborhoodId?: string) {
  const listing = await prisma.serviceListing.findUnique({
    where: { id },
    include: {
      category: true,
      neighborhood: true,
      provider: { include: { user: true } },
      subscriptions: {
        where: { status: 'ACTIVE' },
        include: {
          reviews: true,
        },
      },
    },
  });

  if (!listing) return null;
  if (neighborhoodId && listing.neighborhoodId !== neighborhoodId) {
    throw new Error('Listing not available in your neighborhood');
  }

  return listing;
}

export async function createListing(providerUserId: string, input: unknown) {
  const data = createListingSchema.parse(input);
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: providerUserId },
    include: { user: true },
  });

  if (!profile) throw new Error('Provider profile required');
  if (profile.verificationStatus !== 'APPROVED') {
    throw new Error('Provider must be verified before publishing listings');
  }

  const category = await prisma.serviceCategory.findUnique({
    where: { slug: data.categorySlug },
  });
  if (!category) throw new Error('Category not found');

  const validatedFields = validateCategoryFields(data.categorySlug, data.categoryFields);

  const activeCount = await prisma.subscription.count({
    where: {
      listing: { providerId: profile.id },
      status: { in: ['ACTIVE', 'PENDING'] },
    },
  });

  if (activeCount >= 100) {
    throw new Error('Provider capacity limit reached');
  }

  return prisma.serviceListing.create({
    data: {
      providerId: profile.id,
      categoryId: category.id,
      neighborhoodId: profile.neighborhoodId,
      title: data.title,
      description: data.description,
      monthlyPrice: data.monthlyPrice,
      frequency: data.frequency,
      capacity: data.capacity,
      autoAccept: data.autoAccept,
      categoryFields: validatedFields,
      status: 'ACTIVE',
    },
    include: { category: true, provider: { include: { user: true } } },
  });
}

export async function getProviderListings(providerUserId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: providerUserId },
  });
  if (!profile) return [];

  return prisma.serviceListing.findMany({
    where: { providerId: profile.id },
    include: {
      category: true,
      subscriptions: { where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function averageRating(listing: {
  subscriptions: { reviews: { rating: number }[] }[];
}): number | null {
  const ratings = listing.subscriptions.flatMap((s) => s.reviews.map((r) => r.rating));
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}
