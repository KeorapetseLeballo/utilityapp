import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { getResidentSubscriptions } from '@/features/subscriptions/service';
import { formatPrice } from '@/lib/client';
import { SubscriptionActions } from '@/components/SubscriptionActions';
import { ReviewForm } from '@/components/ReviewForm';
import { MessagePanel } from '@/components/MessagePanel';

export default async function ResidentDashboard() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'RESIDENT' && user.role !== 'ADMIN') redirect('/provider');

  const subscriptions = await getResidentSubscriptions(user.id);

  return (
    <main>
      <h1>My services</h1>
      <p style={{ color: 'var(--ink-muted)' }}>Manage your monthly subscriptions, schedules, and messages.</p>

      <div style={{ margin: '1.5rem 0' }}>
        <Link href="/browse" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Browse new services
        </Link>
      </div>

      {subscriptions.length === 0 ? (
        <div className="empty-state card">
          <p>You have no active subscriptions yet.</p>
          <Link href="/browse" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: '1rem' }}>
            Find a service
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {subscriptions.map((sub) => (
            <article key={sub.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span className={`badge badge-category-${sub.listing.category.slug}`}>{sub.listing.category.name}</span>
                  <h2 style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>{sub.listing.title}</h2>
                  <p style={{ color: 'var(--ink-muted)', margin: 0 }}>
                    {formatPrice(sub.listing.monthlyPrice)}/mo · Status: <strong>{sub.status}</strong>
                  </p>
                </div>
                <SubscriptionActions subscriptionId={sub.id} status={sub.status} role="resident" />
              </div>

              <h3 style={{ fontSize: '1rem', marginTop: '1.25rem' }}>Upcoming visits</h3>
              {sub.occurrences.filter((o) => o.status === 'SCHEDULED').length === 0 ? (
                <p style={{ color: 'var(--ink-muted)' }}>No upcoming visits scheduled.</p>
              ) : (
                <ul style={{ paddingLeft: '1.2rem' }}>
                  {sub.occurrences
                    .filter((o) => o.status === 'SCHEDULED')
                    .map((o) => (
                      <li key={o.id}>
                        {new Date(o.scheduledAt).toLocaleString()} — {o.status}
                      </li>
                    ))}
                </ul>
              )}

              {sub.payments[0] && (
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
                  Latest payment: {formatPrice(sub.payments[0].amount)} ({sub.payments[0].status})
                </p>
              )}

              {sub.status === 'ACTIVE' && (
                <>
                  <ReviewForm subscriptionId={sub.id} />
                  <MessagePanel subscriptionId={sub.id} />
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
