'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlFetch } from '@/lib/client';

type Props = {
  subscriptionId: string;
  status: string;
  role: 'resident' | 'provider';
};

export function SubscriptionActions({ subscriptionId, status, role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState('');

  async function mutate(mutation: string, vars?: Record<string, unknown>) {
    setLoading(mutation);
    try {
      await graphqlFetch(mutation, vars);
      router.refresh();
    } finally {
      setLoading('');
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {role === 'provider' && status === 'PENDING' && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={!!loading}
          onClick={() =>
            mutate(`mutation($id: ID!) { acceptSubscription(id: $id) { id } }`, { id: subscriptionId })
          }
        >
          Accept
        </button>
      )}
      {['ACTIVE', 'PENDING'].includes(status) && (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!loading}
          onClick={() =>
            mutate(`mutation($id: ID!) { pauseSubscription(id: $id) { id } }`, { id: subscriptionId })
          }
        >
          Pause
        </button>
      )}
      {!['CANCELLED'].includes(status) && (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!loading}
          onClick={() =>
            mutate(`mutation($id: ID!) { cancelSubscription(id: $id) { id } }`, { id: subscriptionId })
          }
        >
          Cancel
        </button>
      )}
    </div>
  );
}
