import Link from 'next/link';
import { formatPrice } from '@/lib/client';

type ListingCardProps = {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  monthlyPrice: number;
  providerName: string;
  averageRating: number | null;
  verified: boolean;
  frequency: string;
};

export function ListingCard({
  id,
  title,
  categorySlug,
  categoryName,
  monthlyPrice,
  providerName,
  averageRating,
  verified,
  frequency,
}: ListingCardProps) {
  return (
    <article className="card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span className={`badge badge-category-${categorySlug}`}>{categoryName}</span>
        {verified && <span className="badge badge-verified">Verified</span>}
      </div>
      <h3 style={{ fontSize: '1.2rem' }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '0.95rem' }}>
        by {providerName} · {frequency}
      </p>
      {averageRating != null && (
        <p style={{ margin: 0, fontSize: '0.9rem' }}>★ {averageRating.toFixed(1)} from neighbors</p>
      )}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--forest)' }}>
          {formatPrice(monthlyPrice)}<span style={{ fontSize: '0.85rem', fontWeight: 400 }}>/mo</span>
        </strong>
        <Link href={`/listings/${id}`} className="btn btn-primary" style={{ textDecoration: 'none', padding: '0.55rem 1.1rem' }}>
          View
        </Link>
      </div>
    </article>
  );
}
