'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlFetch } from '@/lib/client';

const CATEGORY_DEFAULTS: Record<string, Record<string, unknown>> = {
  garden: { propertySize: 'medium', visitFrequency: 'weekly', includes: ['mowing', 'trimming'], excludes: ['tree removal'] },
  transport: {
    schoolsServed: ['Local Primary'],
    pickupWindowStart: '07:00',
    pickupWindowEnd: '07:45',
    dropWindowStart: '14:00',
    dropWindowEnd: '15:00',
    maxChildren: 4,
    requiresBackgroundCheck: true,
  },
  goods: { deliveryDays: [2, 4, 6], minimumOrder: 5000, products: ['Fresh bread', 'Eggs', 'Milk'] },
};

export function CreateListingForm() {
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState('garden');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      await graphqlFetch(
        `mutation($input: CreateListingInput!) { createListing(input: $input) { id } }`,
        {
          input: {
            categorySlug,
            title: fd.get('title'),
            description: fd.get('description'),
            monthlyPrice: Number(fd.get('monthlyPrice')) * 100,
            frequency: fd.get('frequency'),
            capacity: Number(fd.get('capacity')),
            autoAccept: fd.get('autoAccept') === 'on',
            categoryFields: CATEGORY_DEFAULTS[categorySlug],
          },
        },
      );
      router.refresh();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem' }}>Create a listing</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-group">
        <label htmlFor="category">Category</label>
        <select id="category" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
          <option value="garden">Garden Services</option>
          <option value="transport">School Transport</option>
          <option value="goods">Neighborhood Goods</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required minLength={3} />
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" required minLength={10} />
      </div>
      <div className="form-group">
        <label htmlFor="monthlyPrice">Monthly price (ZAR)</label>
        <input id="monthlyPrice" name="monthlyPrice" type="number" min={1} step={1} required />
      </div>
      <div className="form-group">
        <label htmlFor="frequency">Frequency label</label>
        <select id="frequency" name="frequency">
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="capacity">Max subscribers</label>
        <input id="capacity" name="capacity" type="number" min={1} max={100} defaultValue={10} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" name="autoAccept" />
          Auto-accept new subscriptions
        </label>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Creating…' : 'Publish listing'}
      </button>
    </form>
  );
}
