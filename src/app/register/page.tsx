'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState, Suspense } from 'react';

type Neighborhood = { id: string; name: string; postcodes: string[] };

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') === 'provider' ? 'PROVIDER' : 'RESIDENT';

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(defaultRole);

  useEffect(() => {
    fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ neighborhoods { id name postcodes } }' }),
    })
      .then((r) => r.json())
      .then((j) => setNeighborhoods(j.data?.neighborhoods ?? []))
      .catch(() => setError('Could not load neighborhoods'));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: fd.get('email'),
          password: fd.get('password'),
          name: fd.get('name'),
          phone: fd.get('phone') || undefined,
          role,
          neighborhoodId: fd.get('neighborhoodId'),
          postcode: fd.get('postcode'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed');

      if (role === 'PROVIDER') router.push('/provider');
      else router.push('/browse');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 480 }}>
      <h1>Join Hearthlane</h1>
      <p style={{ color: 'var(--ink-muted)' }}>
        {role === 'PROVIDER'
          ? 'Register as a local provider. Your profile will be reviewed before you can publish listings.'
          : 'Find monthly services from verified neighbors in your area.'}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button type="button" className={`btn ${role === 'RESIDENT' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRole('RESIDENT')}>
          I need services
        </button>
        <button type="button" className={`btn ${role === 'PROVIDER' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setRole('PROVIDER')}>
          I offer services
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={onSubmit} className="card">
        <div className="form-group">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" required minLength={2} />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password (min 8 characters)</label>
          <input id="password" name="password" type="password" required minLength={8} />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" />
        </div>
        <div className="form-group">
          <label htmlFor="neighborhoodId">Neighborhood</label>
          <select id="neighborhoodId" name="neighborhoodId" required>
            <option value="">Select your neighborhood</option>
            {neighborhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="postcode">Your postcode</label>
          <input id="postcode" name="postcode" required placeholder="e.g. 7700" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
