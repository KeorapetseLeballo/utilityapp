# Architecture Patterns

Patterns for structuring fullstack applications that stay maintainable as teams and traffic grow.

## Layered architecture

```
┌─────────────────────────────────────┐
│  Presentation (Next.js routes/UI)   │
├─────────────────────────────────────┤
│  Application (use cases / services) │
├─────────────────────────────────────┤
│  Domain (entities, invariants)      │
├─────────────────────────────────────┤
│  Infrastructure (DB, APIs, cache)   │
└─────────────────────────────────────┘
```

**Rule:** Dependencies point inward. UI depends on services; services depend on interfaces, not concrete DB drivers in business logic.

## Feature modules

Organize by domain, not by technical type:

```
src/
  features/
    users/
      components/
      services/
      graphql/
      types.ts
    billing/
      ...
  lib/
    prisma.ts
    auth.ts
  app/
    (routes)
```

Benefits: easier ownership, safer refactors, clearer boundaries for testing.

## GraphQL patterns

### N+1 prevention

Use DataLoader or Prisma `include`/`select` strategically:

```typescript
import DataLoader from 'dataloader';

export const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } } });
  const map = new Map(users.map((u) => [u.id, u]));
  return ids.map((id) => map.get(id) ?? null);
});
```

### Error handling

- Return typed GraphQL errors with `extensions.code`.
- Map domain errors to user-safe messages; log internals server-side.
- Fail fast on authZ before expensive resolver work.

## Caching strategy

| Layer | Pattern | TTL guidance |
|-------|---------|--------------|
| CDN | Static assets, public pages | Long (immutable filenames) |
| Redis | Session, rate limits, hot reads | Short to medium |
| App | Memoized service results | Request-scoped or seconds |
| DB | Materialized views for analytics | Refresh on schedule |

**Measure first:** add caching only where profiling shows repeated expensive reads.

## Event-driven extensions

When synchronous flows become brittle:

1. Publish domain events (`user.created`, `invoice.paid`) from services.
2. Process with background workers (BullMQ, SQS, Pub/Sub).
3. Keep handlers idempotent with dedupe keys.

Use this for email, search indexing, webhooks — not for core request/response paths initially.

## Multi-tenant patterns

| Model | When to use |
|-------|-------------|
| Shared schema + `tenantId` column | Most SaaS starting point |
| Schema per tenant | Strong isolation, moderate tenant count |
| DB per tenant | Regulated industries, few large tenants |

Always enforce tenant scope in the service layer, not only in UI filters.

## API versioning

- GraphQL: evolve schema with deprecations and field usage tracking.
- REST: prefix with `/v1`, avoid breaking changes without new version.
- Document sunset timelines in changelog.

## Performance tuning checklist

1. Profile slow endpoints (p95/p99 latency).
2. Inspect DB query plans (`EXPLAIN ANALYZE`).
3. Add indexes for filter/sort columns used together.
4. Paginate list endpoints (cursor-based for large datasets).
5. Batch external API calls; set timeouts and circuit breakers.

## Troubleshooting guide

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Spiky DB connections | Serverless without pooler | Enable PgBouncer/Neon pool |
| Slow GraphQL lists | N+1 queries | DataLoader / eager loading |
| Build failures in CI | Env vars missing | Mirror `.env.example` in CI secrets |
| Hydration errors | Server/client markup mismatch | Audit client-only APIs in RSC tree |
| Memory leaks | Unclosed subscriptions | Cleanup listeners; limit WS connections |

## Migration playbook

1. Add new column/table (nullable or dual-write).
2. Backfill with script/job.
3. Switch reads to new path behind feature flag.
4. Switch writes; monitor error rates.
5. Remove old column after verification window.

## Related docs

- Stack specifics: [tech_stack_guide.md](tech_stack_guide.md)
- Workflow and CI: [development_workflows.md](development_workflows.md)
