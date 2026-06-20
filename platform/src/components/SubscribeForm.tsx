'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlFetch, DAY_NAMES } from '@/lib/client';

type Props = {
  listingId: string;
  categorySlug: string;
  scheduleDays: number[];
};

export function SubscribeForm({ listingId, categorySlug, scheduleDays: defaultDays }: Props) {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>(defaultDays.slice(0, categorySlug === 'goods' ? defaultDays.length : 1));
  const [scheduleTime, setScheduleTime] = useState('07:30');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await graphqlFetch(
        `mutation($input: CreateSubscriptionInput!) {
          createSubscription(input: $input) { id status }
        }`,
        {
          input: {
            listingId,
            scheduleDays: selectedDays,
            scheduleTime: categorySlug !== 'goods' ? scheduleTime : undefined,
            emergencyContact:
              categorySlug === 'transport'
                ? { name: emergencyName, phone: emergencyPhone, relationship: emergencyRelation }
                : undefined,
          },
        },
      );
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: '1.5rem' }}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label>Schedule days</label>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {DAY_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              className={`btn ${selectedDays.includes(i) ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
              onClick={() => toggleDay(i)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {categorySlug !== 'goods' && (
        <div className="form-group">
          <label htmlFor="time">Preferred time</label>
          <input id="time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
        </div>
      )}

      {categorySlug === 'transport' && (
        <>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-muted)' }}>Emergency contact (required for school transport)</p>
          <div className="form-group">
            <label htmlFor="ec-name">Contact name</label>
            <input id="ec-name" required value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="ec-phone">Contact phone</label>
            <input id="ec-phone" required value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="ec-rel">Relationship</label>
            <input id="ec-rel" required value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} />
          </div>
        </>
      )}

      <button type="submit" className="btn btn-accent" disabled={loading || selectedDays.length === 0} style={{ width: '100%' }}>
        {loading ? 'Subscribing…' : 'Subscribe monthly'}
      </button>
    </form>
  );
}
