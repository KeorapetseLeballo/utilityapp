import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const neighborhood = await prisma.neighborhood.upsert({
    where: { slug: 'observatory-cape-town' },
    update: {},
    create: {
      name: 'Observatory',
      slug: 'observatory-cape-town',
      description: 'Pilot neighborhood — Observatory, Cape Town',
      postcodes: ['7925', '7700'],
    },
  });

  const categories = [
    { slug: 'garden', name: 'Garden Services', description: 'Lawn care and garden upkeep', icon: '🌿' },
    { slug: 'transport', name: 'School Transport', description: 'Safe school runs', icon: '🚌' },
    { slug: 'goods', name: 'Neighborhood Goods', description: 'Local essentials delivery', icon: '📦' },
  ];

  for (const cat of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const _admin = await prisma.user.upsert({
    update: {},
    create: {
      email: 'admin@hearthlane.local',
      passwordHash,
      name: 'Platform Admin',
      role: 'ADMIN',
      neighborhoodId: neighborhood.id,
      postcode: '7925',
    },
  });

  const _resident = await prisma.user.upsert({
    update: {},
    create: {
      email: 'resident@hearthlane.local',
      passwordHash,
      name: 'Sarah Ndlovu',
      phone: '+27 82 555 0101',
      role: 'RESIDENT',
      neighborhoodId: neighborhood.id,
      postcode: '7925',
    },
  });

  const providerUser = await prisma.user.upsert({
    where: { email: 'provider@hearthlane.local' },
    update: {},
    create: {
      email: 'provider@hearthlane.local',
      passwordHash,
      name: 'James van der Berg',
      phone: '+27 82 555 0202',
      role: 'PROVIDER',
      neighborhoodId: neighborhood.id,
      postcode: '7925',
    },
  });

  const gardenCat = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: 'garden' } });
  const transportCat = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: 'transport' } });
  const goodsCat = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: 'goods' } });

  const providerProfile = await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    update: { verificationStatus: 'APPROVED' },
    create: {
      userId: providerUser.id,
      neighborhoodId: neighborhood.id,
      bio: 'Local gardener and transport operator serving Observatory families for 8 years.',
      verificationStatus: 'APPROVED',
      backgroundCheck: true,
      insuranceUrl: 'https://example.com/insurance.pdf',
      licenseUrl: 'https://example.com/license.pdf',
    },
  });

  const pendingProvider = await prisma.user.upsert({
    where: { email: 'pending@hearthlane.local' },
    update: {},
    create: {
      email: 'pending@hearthlane.local',
      passwordHash,
      name: 'New Provider',
      role: 'PROVIDER',
      neighborhoodId: neighborhood.id,
      postcode: '7700',
    },
  });

  await prisma.providerProfile.upsert({
    where: { userId: pendingProvider.id },
    update: {},
    create: {
      userId: pendingProvider.id,
      neighborhoodId: neighborhood.id,
      bio: 'Awaiting verification.',
      verificationStatus: 'PENDING',
    },
  });

  await prisma.serviceListing.upsert({
    where: { id: 'seed-garden-listing' },
    update: {},
    create: {
      id: 'seed-garden-listing',
      providerId: providerProfile.id,
      categoryId: gardenCat.id,
      neighborhoodId: neighborhood.id,
      title: 'Weekly garden maintenance',
      description: 'Professional mowing, edging, and hedge trimming for medium-sized gardens. Equipment included.',
      monthlyPrice: 85000,
      frequency: 'weekly',
      capacity: 12,
      status: 'ACTIVE',
      autoAccept: true,
      categoryFields: {
        propertySize: 'medium',
        visitFrequency: 'weekly',
        includes: ['mowing', 'edging', 'hedge trim'],
        excludes: ['tree removal', 'irrigation repair'],
      },
    },
  });

  await prisma.serviceListing.upsert({
    where: { id: 'seed-transport-listing' },
    update: {},
    create: {
      id: 'seed-transport-listing',
      providerId: providerProfile.id,
      categoryId: transportCat.id,
      neighborhoodId: neighborhood.id,
      title: 'Observatory school run — Rosebank Primary',
      description: 'Safe, reliable morning pickup and afternoon drop-off. GPS-tracked vehicle, 15 years experience.',
      monthlyPrice: 120000,
      frequency: 'weekly',
      capacity: 4,
      status: 'ACTIVE',
      autoAccept: false,
      categoryFields: {
        schoolsServed: ['Rosebank Primary', 'Observatory Junior'],
        pickupWindowStart: '07:00',
        pickupWindowEnd: '07:45',
        dropWindowStart: '14:00',
        dropWindowEnd: '15:30',
        maxChildren: 4,
        requiresBackgroundCheck: true,
      },
    },
  });

  await prisma.serviceListing.upsert({
    where: { id: 'seed-goods-listing' },
    update: {},
    create: {
      id: 'seed-goods-listing',
      providerId: providerProfile.id,
      categoryId: goodsCat.id,
      neighborhoodId: neighborhood.id,
      title: 'Neighborhood pantry box',
      description: 'Fresh bread, eggs, milk, and seasonal produce delivered to your door twice weekly.',
      monthlyPrice: 45000,
      frequency: 'weekly',
      capacity: 20,
      status: 'ACTIVE',
      autoAccept: true,
      categoryFields: {
        deliveryDays: [2, 5],
        minimumOrder: 15000,
        products: ['Fresh bread', 'Free-range eggs', 'Full cream milk', 'Seasonal vegetables'],
      },
    },
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Demo accounts (password: password123):');
  console.log('  Admin:    admin@hearthlane.local');
  console.log('  Resident: resident@hearthlane.local');
  console.log('  Provider: provider@hearthlane.local');
  console.log('  Pending:  pending@hearthlane.local');
  console.log('');
  console.log('Neighborhood: Observatory (postcodes 7925, 7700)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
