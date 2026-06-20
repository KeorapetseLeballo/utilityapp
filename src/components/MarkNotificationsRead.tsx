'use client';

import { useRouter } from 'next/navigation';
import { graphqlFetch } from '@/lib/client';

export function MarkNotificationsRead() {
  const router = useRouter();

  async function markAll() {
    await graphqlFetch(`mutation { markAllNotificationsRead }`);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={markAll}>
      Mark all read
    </button>
  );
}
