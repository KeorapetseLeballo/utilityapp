import Link from 'next/link';
import { getSessionUser } from '@/lib/session';
import { LogoutButton } from './LogoutButton';

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: 'min(1120px, 100% - 2rem)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 0',
          gap: '1rem',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>
            Hearth<span style={{ color: 'var(--terracotta)' }}>lane</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <Link href="/browse">Browse</Link>
              {user.role === 'RESIDENT' && <Link href="/dashboard">My services</Link>}
              {user.role === 'PROVIDER' && <Link href="/provider">Provider hub</Link>}
              {user.role === 'ADMIN' && <Link href="/admin">Admin</Link>}
              <Link href="/notifications">Alerts</Link>
              <span style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>{user.name}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/register" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Join your block
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
