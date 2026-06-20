'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlFetch } from '@/lib/client';

export function ReviewForm({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await graphqlFetch(
      `mutation($input: CreateReviewInput!) { createReview(input: $input) { id } }`,
      { input: { subscriptionId, rating, comment: comment || undefined } },
    );
    setDone(true);
    router.refresh();
  }

  if (done) return <p className="alert alert-success">Thank you for your review!</p>;

  return (
    <form onSubmit={onSubmit} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: '1rem' }}>Leave a review</h3>
      <div className="form-group">
        <label htmlFor={`rating-${subscriptionId}`}>Rating</label>
        <select id={`rating-${subscriptionId}`} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} stars</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor={`comment-${subscriptionId}`}>Comment (optional)</label>
        <textarea id={`comment-${subscriptionId}`} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <button type="submit" className="btn btn-secondary">Submit review</button>
    </form>
  );
}
