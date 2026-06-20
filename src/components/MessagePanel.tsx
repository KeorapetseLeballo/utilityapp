'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { graphqlFetch } from '@/lib/client';

type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: { name: string };
};

export function MessagePanel({ subscriptionId }: { subscriptionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const data = await graphqlFetch<{ messages: Message[] }>(
      `query($id: ID!) { messages(subscriptionId: $id) { id body createdAt sender { name } } }`,
      { id: subscriptionId },
    );
    setMessages(data.messages);
  }, [subscriptionId]);

  useEffect(() => {
    load().catch(() => setError('Could not load messages'));
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await graphqlFetch(
        `mutation($input: SendMessageInput!) { sendMessage(input: $input) { id } }`,
        { input: { subscriptionId, body } },
      );
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    }
  }

  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
      <h3 style={{ fontSize: '1rem' }}>Messages</h3>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: '0.75rem' }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <strong>{m.sender.name}</strong>: {m.body}
            </div>
          ))
        )}
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message provider…" required style={{ flex: 1 }} />
        <button type="submit" className="btn btn-secondary">Send</button>
      </form>
    </div>
  );
}
