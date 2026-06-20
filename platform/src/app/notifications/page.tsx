import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { MarkNotificationsRead } from '@/components/MarkNotificationsRead';

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Alerts</h1>
          <p style={{ color: 'var(--ink-muted)', margin: 0 }}>{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        {unread > 0 && <MarkNotificationsRead />}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state card" style={{ marginTop: '1.5rem' }}>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((n) => (
            <article
              key={n.id}
              className="card"
              style={{ opacity: n.read ? 0.75 : 1, borderLeft: n.read ? undefined : '4px solid var(--terracotta)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <strong>{n.title}</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--ink-muted)' }}>{n.body}</p>
                </div>
                <time style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(n.createdAt).toLocaleDateString()}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
