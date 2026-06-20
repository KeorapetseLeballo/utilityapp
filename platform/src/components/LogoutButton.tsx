'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/');
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={logout} style={{ padding: '0.5rem 1rem' }}>
      Sign out
    </button>
  );
}
