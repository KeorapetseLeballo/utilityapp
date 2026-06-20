import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { getListing } from '@/features/listings/service';
import { formatPrice } from '@/lib/client';
import { SubscribeForm } from '@/components/SubscribeForm';
import Link from 'next/link';

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const listing = await getListing(id, user.neighborhoodId ?? undefined);
  if (!listing) notFound();

  const fields = listing.categoryFields as Record<string, unknown>;
  const ratings = listing.subscriptions.flatMap((s) => s.reviews.map((r) => r.rating));
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return (
    <main>
      <Link href="/browse" style={{ fontSize: '0.9rem' }}>← Back to browse</Link>

      <div className="grid-2" style={{ marginTop: '1.5rem', alignItems: 'start' }}>
        <div className="card animate-in">
          <span className={`badge badge-category-${listing.category.slug}`}>{listing.category.name}</span>
          {listing.provider.verificationStatus === 'APPROVED' && (
            <span className="badge badge-verified" style={{ marginLeft: '0.5rem' }}>Verified provider</span>
          )}
          <h1 style={{ marginTop: '1rem' }}>{listing.title}</h1>
          <p style={{ color: 'var(--ink-muted)' }}>by {listing.provider.user.name}</p>
          {avg != null && <p>★ {avg.toFixed(1)} average rating</p>}
          <p style={{ marginTop: '1rem' }}>{listing.description}</p>

          <h3 style={{ marginTop: '1.5rem' }}>Service details</h3>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--ink-muted)' }}>
            <li>Frequency: {listing.frequency}</li>
            <li>Capacity: {listing.subscriptions.length} / {listing.capacity} subscribers</li>
            {listing.category.slug === 'garden' && (
              <>
                <li>Property size: {String(fields.propertySize)}</li>
                <li>Visit frequency: {String(fields.visitFrequency)}</li>
              </>
            )}
            {listing.category.slug === 'transport' && (
              <>
                <li>Schools: {(fields.schoolsServed as string[])?.join(', ')}</li>
                <li>Pickup: {String(fields.pickupWindowStart)} – {String(fields.pickupWindowEnd)}</li>
                <li>Max children: {String(fields.maxChildren)}</li>
              </>
            )}
            {listing.category.slug === 'goods' && (
              <>
                <li>Products: {(fields.products as string[])?.join(', ')}</li>
                <li>Minimum order: {formatPrice(Number(fields.minimumOrder ?? 0))}</li>
              </>
            )}
          </ul>
        </div>

        <div className="card animate-in animate-in-delay-1">
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--forest)', margin: '0 0 0.5rem' }}>
            {formatPrice(listing.monthlyPrice)}<span style={{ fontSize: '1rem' }}>/month</span>
          </p>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
            Recurring subscription. Pause or cancel anytime with notice.
          </p>

          {user.role === 'RESIDENT' ? (
            listing.subscriptions.length >= listing.capacity ? (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>This listing is at capacity.</div>
            ) : (
              <SubscribeForm
                listingId={listing.id}
                categorySlug={listing.category.slug}
                scheduleDays={listing.category.slug === 'goods'
                  ? (fields.deliveryDays as number[] ?? [1, 3, 5])
                  : [1, 2, 3, 4, 5]}
              />
            )
          ) : (
            <p style={{ marginTop: '1rem', color: 'var(--ink-muted)' }}>Sign in as a resident to subscribe.</p>
          )}
        </div>
      </div>
    </main>
  );
}
