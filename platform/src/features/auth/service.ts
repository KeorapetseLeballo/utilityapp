import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  postcodeMatchesNeighborhood,
  registerSchema,
  verifyPassword,
} from '@/lib/auth';
import { notifyProviderApproved } from '@/lib/notifications';

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);

  const neighborhood = await prisma.neighborhood.findUnique({
    where: { id: data.neighborhoodId },
  });
  if (!neighborhood) throw new Error('Neighborhood not found');

  if (!postcodeMatchesNeighborhood(data.postcode, neighborhood.postcodes)) {
    throw new Error('Postcode is not in this neighborhood');
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new Error('Email already registered');

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      phone: data.phone,
      role: data.role,
      neighborhoodId: data.neighborhoodId,
      postcode: data.postcode,
    },
  });

  if (data.role === 'PROVIDER') {
    await prisma.providerProfile.create({
      data: {
        userId: user.id,
        neighborhoodId: data.neighborhoodId,
        verificationStatus: 'PENDING',
      },
    });
  }

  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error('Invalid email or password');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error('Invalid email or password');

  return user;
}

export async function getUserWithRelations(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      neighborhood: true,
      providerProfile: { include: { neighborhood: true } },
    },
  });
}

export async function approveProvider(profileId: string) {
  const profile = await prisma.providerProfile.update({
    where: { id: profileId },
    data: { verificationStatus: 'APPROVED' },
    include: { user: true },
  });
  await notifyProviderApproved(profile.userId);
  return profile;
}

export async function rejectProvider(profileId: string) {
  return prisma.providerProfile.update({
    where: { id: profileId },
    data: { verificationStatus: 'REJECTED' },
  });
}
