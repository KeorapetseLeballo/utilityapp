import Link from 'next/link';
import { CATEGORY_META } from '@/lib/client';

export default function HomePage() {
  return (
    <>
      <section
        style={{
          minHeight: '72vh',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '3rem',
          alignItems: 'center',
          width: 'min(1120px, 100% - 2rem)',
          margin: '0 auto',
          padding: '3rem 0',
        }}
        className="hero"
      >
        <div className="animate-in">
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.8rem', color: 'var(--terracotta)', fontWeight: 600 }}>
            Your block, your services
          </p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', maxWidth: '14ch' }}>
            Monthly utilities from neighbors you can trust
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--ink-muted)', maxWidth: '42ch' }}>
            Garden care, school runs, and local goods — booked once, renewed every month.
            Verified providers. Clear schedules. No group-chat chaos.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Find services near me
            </Link>
            <Link href="/register?role=provider" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              List your service
            </Link>
          </div>
        </div>

        <div
          className="animate-in animate-in-delay-2"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: 'var(--shadow)',
            transform: 'rotate(1.5deg)',
          }}
        >
          <p style={{ margin: '0 0 1rem', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
            Popular on Hearthlane
          </p>
          {Object.entries(CATEGORY_META).map(([slug, meta], i) => (
            <div
              key={slug}
              style={{
                padding: '1rem 0',
                borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '1.75rem' }}>{meta.emoji}</span>
              <div>
                <strong>{meta.label}</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-muted)' }}>{meta.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <main>
        <h2>Built for recurring neighborhood needs</h2>
        <div className="grid-3" style={{ marginTop: '1.5rem' }}>
          {[
            { title: 'Neighborhood-only', text: 'See services in your postcode. No random city-wide listings.' },
            { title: 'Monthly subscriptions', text: 'Pause for holidays, skip a week, cancel with notice — built in.' },
            { title: 'Verified providers', text: 'Admin-approved profiles, reviews, and in-app messaging.' },
            { title: 'Smart scheduling', text: 'Pick your days. Get reminders before each visit or pickup.' },
            { title: 'Transparent billing', text: 'Monthly invoices with platform fee breakdown for providers.' },
            { title: 'Dispute support', text: 'Flag issues on completed visits. Admin review when needed.' },
          ].map((item, i) => (
            <div key={item.title} className={`card animate-in animate-in-delay-${(i % 3) + 1}`}>
              <h3 style={{ fontSize: '1.05rem' }}>{item.title}</h3>
              <p style={{ margin: 0, color: 'var(--ink-muted)' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .hero { grid-template-columns: 1fr !important; min-height: auto !important; }
        }
      `}</style>
    </>
  );
}
