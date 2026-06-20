'use client';

import { useRouter } from 'next/navigation';
import { graphqlFetch } from '@/lib/client';

export function AdminActions({ providerId }: { providerId: string }) {
  const router = useRouter();

  async function approve() {
    await graphqlFetch(`mutation($id: ID!) { approveProvider(id: $id) { id } }`, { id: providerId });
    router.refresh();
  }

  async function reject() {
    await graphqlFetch(`mutation($id: ID!) { rejectProvider(id: $id) { id } }`, { id: providerId });
    router.refresh();
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
      <button type="button" className="btn btn-primary" onClick={approve}>Approve</button>
      <button type="button" className="btn btn-secondary" onClick={reject}>Reject</button>
    </div>
  );
}
