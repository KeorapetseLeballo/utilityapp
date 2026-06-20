# Hearthlane Platform

Neighborhood utilities marketplace — recurring garden care, school transport, and local goods.

## Quick start

**Prerequisites:** Node.js 20+, Docker (for PostgreSQL)

```bash
# From repo root — start database
docker compose up -d

# From platform directory
cd platform
cp .env.example .env   # skip if .env already exists
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo accounts

Password for all: `password123`

| Role | Email |
|------|-------|
| Admin | admin@hearthlane.local |
| Resident | resident@hearthlane.local |
| Provider | provider@hearthlane.local |
| Pending provider | pending@hearthlane.local |

**Pilot neighborhood:** Observatory, Cape Town (postcodes `7925`, `7700`)

## What's implemented

| Phase | Feature |
|-------|---------|
| 0 | Next.js 15, GraphQL, PostgreSQL, Prisma schema |
| 1 | Auth (session cookies), neighborhood gate, postcode validation |
| 2 | Category listings (garden, transport, goods), browse & filters |
| 3 | Monthly subscriptions, scheduling, pause/cancel/skip, occurrences |
| 4 | Simulated payments with platform fee split |
| 5 | Reviews, in-app messaging, provider verification |
| 6 | Notifications, admin panel (approve providers, disputes, flagged messages) |
| 7 | Seed data, unit tests, production build |

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run test         # Unit tests
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed demo data
npm run db:reset     # Reset database
```

## Architecture

```
src/
  app/           # Next.js pages & API routes
  features/      # Domain services (auth, listings, subscriptions, admin)
  graphql/       # GraphQL schema & resolvers
  lib/           # Prisma, auth, scheduling, payments, notifications
  components/    # UI components
```

## Environment

See `.env.example` for required variables. Stripe keys are optional (payments are simulated in MVP).
