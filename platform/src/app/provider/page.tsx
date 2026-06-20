import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { getUserWithRelations } from '@/features/auth/service';
import { getProviderListings } from '@/features/listings/service';
import { getProviderSubscriptions } from '@/features/subscriptions/service';
import { getProviderEarnings } from '@/lib/payments';
import { formatPrice } from '@/lib/client';
import { SubscriptionActions } from '@/components/SubscriptionActions';
import { CreateListingForm } from '@/components/CreateListingForm';
import { ProviderProfileForm } from '@/components/ProviderProfileForm';
import Link from 'next/link';

export default async function ProviderHubPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');
  if (sessionUser.role !== 'PROVIDER' && sessionUser.role !== 'ADMIN') redirect('/dashboard');

  const user = await getUserWithRelations(sessionUser.id);
  const profile = user?.providerProfile ?? null;
  const listings = await getProviderListings(sessionUser.id);
  const subscriptions = await getProviderSubscriptions(sessionUser.id);
  const earnings = await getProviderEarnings(sessionUser.id);

  return (
    <main>
      <h1>Provider hub</h1>
      <p style={{ color: 'var(--ink-muted)' }}>Manage listings, subscribers, and earnings.</p>

      {!profile ? (
        <div className="alert alert-error">No provider profile found.</div>
      ) : (
        <>
          <div className="stat-row" style={{ margin: '1.5rem 0' }}>
            <div className="stat">
              <div className="stat-value">{listings.length}</div>
              <div className="stat-label">Listings</div>
            </div>
            <div className="stat">
              <div className="stat-value">{subscriptions.filter((s) => s.status === 'ACTIVE').length}</div>
              <div className="stat-label">Active subscribers</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatPrice(earnings.total)}</div>
              <div className="stat-label">Total earnings</div>
            </div>
            <div className="stat">
              <div className="stat-value">
                <span className={`badge badge-${profile.verificationStatus === 'APPROVED' ? 'verified' : 'pending'}`}>
                  {profile.verificationStatus}
                </span>
              </div>
              <div className="stat-label">Verification</div>
            </div>
          </div>

          {profile.verificationStatus !== 'APPROVED' && (
            <div className="alert alert-error">
              Your profile is pending admin approval. Complete your profile below while you wait.
            </div>
          )}

          <ProviderProfileForm
            bio={profile.bio ?? ''}
            insuranceUrl={profile.insuranceUrl ?? ''}
            licenseUrl={profile.licenseUrl ?? ''}
            backgroundCheck={profile.backgroundCheck}
          />

          {profile.verificationStatus === 'APPROVED' && <CreateListingForm />}

          <h2 style={{ marginTop: '2rem' }}>Your listings</h2>
          {listings.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)' }}>No listings yet.</p>
          ) : (
            <div className="grid-2">
              {listings.map((l) => (
                <div key={l.id} className="card">
                  <h3 style={{ fontSize: '1.1rem' }}>{l.title}</h3>
                  <p style={{ color: 'var(--ink-muted)' }}>{formatPrice(l.monthlyPrice)}/mo · {l.status}</p>
                  <Link href={`/listings/${l.id}`}>View public page →</Link>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: '2rem' }}>Subscribers</h2>
          {subscriptions.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)' }}>No subscribers yet.</p>
          ) : (
            subscriptions.map((sub) => (
              <div key={sub.id} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <strong>{sub.resident.name}</strong> — {sub.listing.title}
                    <p style={{ margin: 0, color: 'var(--ink-muted)' }}>Status: {sub.status}</p>
                  </div>
                  <SubscriptionActions subscriptionId={sub.id} status={sub.status} role="provider" />
                </div>
                {sub.occurrences.map((o) => (
                  <div key={o.id} style={{ marginTop: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{new Date(o.scheduledAt).toLocaleString()}</span>
                    <form action="/api/actions/complete-occurrence" method="POST">
                      <input type="hidden" name="occurrenceId" value={o.id} />
                      <button type="submit" className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>
                        Mark complete
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}
