# Tech Stack Guide

Reference for the default senior fullstack stack: **Next.js + TypeScript + GraphQL + PostgreSQL + Prisma**.

## Frontend (Next.js + React)

### App Router conventions

- Use `src/app/` for routes, layouts, and server components by default.
- Keep client components in leaf nodes; pass serializable props from server components.
- Co-locate feature UI under `src/features/<domain>/`.

### Data fetching

```typescript
// Server Component — preferred for initial data
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
  const users = await prisma.user.findMany({ take: 20 });
  return <UserList users={users} />;
}
```

```typescript
// Client Component — interactive or realtime UI
'use client';

import { useQuery } from '@apollo/client';
import { GET_USERS } from '@/graphql/queries';

export function UserListClient() {
  const { data, loading, error } = useQuery(GET_USERS);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Failed to load users.</p>;
  return <ul>{data.users.map((u) => <li key={u.id}>{u.email}</li>)}</ul>;
}
```

### Anti-patterns

- Fetching secrets or DB clients in client components.
- Mixing business logic into page files instead of services.
- Overusing `'use client'` at layout boundaries.

## Backend (Node.js + GraphQL)

### Schema-first workflow

1. Define types and operations in `src/graphql/schema.graphql` or code-first schema module.
2. Implement resolvers in `src/graphql/resolvers/`.
3. Keep resolvers thin; delegate to services in `src/services/`.

```typescript
// src/services/userService.ts
import { prisma } from '@/lib/prisma';

export async function listUsers(limit = 20) {
  return prisma.user.findMany({ take: limit, orderBy: { createdAt: 'desc' } });
}
```

### REST vs GraphQL

| Use REST | Use GraphQL |
|----------|-------------|
| Webhooks, file uploads, public cacheable endpoints | Aggregated reads across domains |
| Simple CRUD with stable contracts | Mobile/clients needing flexible field selection |
| Third-party integrations expecting REST | Real-time subscriptions (with care) |

## Database (PostgreSQL + Prisma)

### Modeling rules

- Prefer UUID/cuid primary keys for distributed systems.
- Add `createdAt` / `updatedAt` on mutable entities.
- Index foreign keys and high-cardinality filter columns.
- Use migrations for every schema change; never edit production schema manually.

```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())

  @@index([authorId])
}
```

### Connection management

- Use a singleton Prisma client (see scaffold `src/lib/prisma.ts`).
- In serverless, prefer connection poolers (Neon, Supabase pooler, PgBouncer).
- Set statement timeouts and log slow queries in staging.

## Auth

Default recommendation for new apps:

1. **Session cookies** for first-party web apps (HttpOnly, Secure, SameSite).
2. **JWT access + refresh** for mobile/API clients.
3. Centralize auth checks in middleware and GraphQL context.

Never store plaintext passwords. Use bcrypt/argon2 and rate-limit login endpoints.

## Testing pyramid

| Layer | Tooling | Focus |
|-------|---------|-------|
| Unit | Vitest/Jest | Services, utilities, pure functions |
| Integration | Vitest + test DB | Prisma repos, GraphQL resolvers |
| E2E | Playwright | Critical user journeys |

## Observability

- Structured JSON logs with `requestId`, `userId`, `route`.
- OpenTelemetry traces around DB and external HTTP calls.
- Error tracking (Sentry) with release tags tied to git SHA.

## Deployment defaults

- Containerize with multi-stage Docker builds.
- Run migrations as a deploy step, not at app boot in multiple replicas.
- Use health checks: `/api/health` for liveness, DB ping for readiness.

## Related docs

- Architecture decisions: [architecture_patterns.md](architecture_patterns.md)
- Day-to-day workflow: [development_workflows.md](development_workflows.md)
