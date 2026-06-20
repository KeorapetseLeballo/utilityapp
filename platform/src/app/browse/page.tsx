import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ListingCard } from '@/components/ListingCard';
import Link from 'next/link';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.neighborhoodId) redirect('/register');

  const params = await searchParams;
  const categorySlug = params.category;

  const listings = await prisma.serviceListing.findMany({
    where: {
      neighborhoodId: user.neighborhoodId,
      status: 'ACTIVE',
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: {
      category: true,
      provider: { include: { user: true } },
      subscriptions: {
        where: { status: 'ACTIVE' },
        include: { reviews: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const categories = await prisma.serviceCategory.findMany();

  return (
    <main>
      <h1>Browse services</h1>
      <p style={{ color: 'var(--ink-muted)' }}>
        Services available in your neighborhood. All listings are from verified local providers.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
        <Link href="/browse" className={`btn ${!categorySlug ? 'btn-primary' : 'btn-secondary'}`} style={{ textDecoration: 'none' }}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/browse?category=${c.slug}`}
            className={`btn ${categorySlug === c.slug ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textDecoration: 'none' }}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="empty-state card">
          <p>No listings in this category yet. Check back soon or try another category.</p>
        </div>
      ) : (
        <div className="grid-3">
          {listings.map((listing) => {
            const ratings = listing.subscriptions.flatMap((s) => s.reviews.map((r) => r.rating));
            const averageRating =
              ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

            return (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                categorySlug={listing.category.slug}
                categoryName={listing.category.name}
                monthlyPrice={listing.monthlyPrice}
                providerName={listing.provider.user.name}
                averageRating={averageRating}
                verified={listing.provider.verificationStatus === 'APPROVED'}
                frequency={listing.frequency}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
