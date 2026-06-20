import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { getAdminStats, listPendingProviders, listDisputes, listFlaggedMessages } from '@/features/admin/service';
import { AdminActions } from '@/components/AdminActions';

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const stats = await getAdminStats();
  const pending = await listPendingProviders();
  const disputes = await listDisputes();
  const flagged = await listFlaggedMessages();

  return (
    <main>
      <h1>Admin panel</h1>
      <p style={{ color: 'var(--ink-muted)' }}>Verify providers, review disputes, and moderate messages.</p>

      <div className="stat-row" style={{ margin: '1.5rem 0' }}>
        <div className="stat"><div className="stat-value">{stats.pendingProviders}</div><div className="stat-label">Pending providers</div></div>
        <div className="stat"><div className="stat-value">{stats.activeListings}</div><div className="stat-label">Active listings</div></div>
        <div className="stat"><div className="stat-value">{stats.activeSubscriptions}</div><div className="stat-label">Subscriptions</div></div>
        <div className="stat"><div className="stat-value">{stats.openDisputes}</div><div className="stat-label">Open disputes</div></div>
        <div className="stat"><div className="stat-value">{stats.flaggedMessages}</div><div className="stat-label">Flagged messages</div></div>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Pending provider verification</h2>
        {pending.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>No pending providers.</p>
        ) : (
          pending.map((p) => (
            <div key={p.id} className="card" style={{ marginBottom: '1rem' }}>
              <strong>{p.user.name}</strong> — {p.user.email}
              <p style={{ margin: '0.25rem 0', color: 'var(--ink-muted)' }}>{p.neighborhood.name}</p>
              {p.bio && <p style={{ fontSize: '0.9rem' }}>{p.bio}</p>}
              <AdminActions providerId={p.id} />
            </div>
          ))
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Open disputes</h2>
        {disputes.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>No open disputes.</p>
        ) : (
          disputes.map((d) => (
            <div key={d.id} className="card" style={{ marginBottom: '1rem' }}>
              <strong>{d.subscription.listing.title}</strong>
              <p style={{ margin: 0, color: 'var(--ink-muted)' }}>
                Resident: {d.subscription.resident.name} · Provider: {d.subscription.listing.provider.user.name}
              </p>
              <p style={{ fontSize: '0.9rem' }}>Reason: {d.disputeReason}</p>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Flagged messages</h2>
        {flagged.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>No flagged messages.</p>
        ) : (
          flagged.map((m) => (
            <div key={m.id} className="card" style={{ marginBottom: '1rem' }}>
              <p><strong>{m.sender.name}:</strong> {m.body}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                Subscription: {m.subscription.listing.title}
              </p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
