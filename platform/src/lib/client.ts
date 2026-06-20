export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100);
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CATEGORY_META: Record<string, { label: string; emoji: string; desc: string }> = {
  garden: { label: 'Garden Services', emoji: '🌿', desc: 'Monthly lawn care, trimming, and upkeep' },
  transport: { label: 'School Transport', emoji: '🚌', desc: 'Safe, recurring school runs in your area' },
  goods: { label: 'Neighborhood Goods', emoji: '📦', desc: 'Regular delivery of essentials from local sellers' },
};
