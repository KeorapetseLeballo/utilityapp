# Neighborhood Utilities Platform

A hyperlocal marketplace where **residents** subscribe to recurring neighborhood services — gardening, school transport, household goods, and similar monthly utilities — and **local providers** manage listings, schedules, and payouts through one platform.

This repo holds the product plan, development skills, and (once scaffolded) the application code.

---

## Table of contents

- [What this platform is](#what-this-platform-is)
- [What you may be missing](#what-you-may-be-missing)
- [Implementation plan](#implementation-plan)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Development workflow](#development-workflow)
- [Design guidelines](#design-guidelines)
- [Decisions to make before building](#decisions-to-make-before-building)

---

## What this platform is

| Audience | Goal |
|----------|------|
| **Residents** | Discover trusted local providers, subscribe monthly, manage schedules, pay, and review |
| **Providers** | List services, set availability and pricing, accept subscribers, track earnings |
| **Platform admin** | Verify providers, manage neighborhoods/categories, handle disputes |

**MVP focus:** one pilot neighborhood, three service categories (garden, school transport, goods), recurring monthly subscriptions — not one-off gig bookings.

---

## What you may be missing

These gaps are easy to overlook but should shape the product and architecture from day one. Each item is addressed in the [implementation plan](#implementation-plan) below.

### Product & marketplace

| Gap | Why it matters | When to address |
|-----|----------------|-----------------|
| **Neighborhood boundaries** | Users must only see services in their area (postcode, estate name, or map radius). Without this, trust and relevance break down. | Phase 1 |
| **Two-sided onboarding** | Residents and providers need separate flows: browse/book vs list/verify/schedule. | Phase 1 |
| **Recurring subscriptions** | Monthly garden care and school runs are subscriptions with renewals, pauses, and cancellations — not single checkout events. | Phase 3 |
| **Category-specific flows** | Transport needs routes, schools, pickup windows, and emergency contacts. Goods need stock and delivery slots. Gardening needs visit frequency and property size. | Phase 2 |
| **Trust layer** | Reviews, verified profiles, optional background checks (especially child transport), insurance/license uploads. | Phase 5 |
| **Payments & payouts** | Who charges whom? Platform fee? Provider payouts (Stripe Connect)? Refunds and disputes? | Phase 4 |
| **Scheduling & capacity** | Recurring calendars, blackout dates, provider capacity limits, reminders before each visit/pickup. | Phase 3 |
| **In-app messaging** | Communication tied to active subscriptions; avoid exposing personal phone numbers too early. | Phase 5 |
| **Pause, skip, and cancel rules** | “Skip this week,” holiday pauses, notice periods — essential for monthly services. | Phase 3 |
| **Cold-start problem** | Empty marketplaces fail. Seed one neighborhood with anchor providers before public launch. | Phase 7 |

### Operations, legal & trust

| Gap | Why it matters | When to address |
|-----|----------------|-----------------|
| **Child transport compliance** | Background checks, liability, pickup authorization, emergency contacts. Highest-risk category. | Phase 2 (fields) / Phase 5 (verification) |
| **Dispute resolution** | Missed pickups, damaged goods, no-show visits need a clear process and admin tools. | Phase 5–6 |
| **Data privacy** | GDPR, POPIA, or local privacy law — consent, data retention, export/delete. | Phase 1 (auth) / ongoing |
| **Notifications** | Email/SMS/push for booking confirmations, payment failures, tomorrow’s visit, schedule changes. | Phase 6 |
| **Admin moderation** | Approve providers, manage categories, review flagged messages and reports. | Phase 6 |

### Go-to-market

| Gap | Why it matters | When to address |
|-----|----------------|-----------------|
| **Offline habit** | Many neighborhood services already run on WhatsApp. The platform must be easier or more trustworthy, not just another listing site. | Phase 7 (pilot UX) |
| **Mobile-first usage** | Residents book on their phone. Responsive web first; native apps later if needed. | All UI phases |
| **Localization** | Currency, language, and local regulations depend on your launch country. | Phase 0 decision |

---

## Implementation plan

### Phase 0 — Foundation (Week 1)

**Goal:** Scaffold the app, define the domain model, and set up local development.

**Deliverables:**
- Next.js + TypeScript + GraphQL + PostgreSQL + Prisma (see [Tech stack](#tech-stack))
- Core Prisma models:

  | Model | Purpose |
  |-------|---------|
  | `User` | Roles: `RESIDENT`, `PROVIDER`, `ADMIN` |
  | `Neighborhood` | Name, boundary (postcodes or geo) |
  | `ProviderProfile` | Verification status, bio, service area |
  | `ServiceCategory` | Garden, transport, goods |
  | `ServiceListing` | Title, pricing model, frequency, category-specific fields |
  | `Subscription` | Resident ↔ listing, status, billing cycle |
  | `Occurrence` | Individual scheduled visit/pickup/delivery |
  | `Payment` / `Invoice` | Billing records |
  | `Review` | Post-completion ratings |
  | `Message` | In-app chat (optional in MVP) |

- Feature-based folder layout:

  ```
  src/features/
    auth/
    neighborhoods/
    listings/
    subscriptions/
    scheduling/
    payments/
    reviews/
  ```

- Docker Compose for local PostgreSQL
- `.env.example` with `DATABASE_URL` and GraphQL URL

**Addresses missing items:** localization decision, database indexes, audit timestamps (`createdAt` / `updatedAt`).

---

### Phase 1 — Auth & neighborhood gate (Week 2)

**Goal:** Users sign up, land in the correct neighborhood, and providers enter a verification queue.

**Resident flow:**
- Sign up → select or verify neighborhood (postcode lookup)
- Dashboard shell

**Provider flow:**
- Sign up → create provider profile → status `PENDING` until admin approves

**Tech:**
- Session cookies (HttpOnly, Secure, SameSite)
- Middleware: users only see listings in their neighborhood
- GraphQL: `me`, `neighborhood`, `registerProvider`

**Addresses missing items:** neighborhood boundaries, two-sided onboarding, data privacy basics.

---

### Phase 2 — Service discovery & listings (Week 3)

**Goal:** Residents browse services; providers create category-aware listings.

**Resident:**
- Browse by category: Garden | School transport | Goods
- Filter by price, rating, availability
- Service detail page with provider info and reviews

**Provider:**
- Listing wizard with category-specific fields
- Set monthly price, visit frequency, capacity

**Category-specific minimum fields:**

| Category | Extra fields |
|----------|--------------|
| Garden | Property size, visit frequency, includes/excludes |
| School transport | Schools served, pickup/drop windows, max children, emergency contact |
| Goods | Delivery days, minimum order, product list |

**Addresses missing items:** category-specific flows, cold-start seed data structure, mobile-first listing cards.

---

### Phase 3 — Subscriptions & scheduling (Week 4)

**Goal:** Core booking loop for recurring monthly services.

**Flow:**
1. Resident selects “Subscribe monthly”
2. Chooses schedule (e.g. every Tuesday; Mon–Fri school run)
3. Provider accepts (or auto-accept if enabled)
4. System generates upcoming `Occurrence` records

**Features:**
- Pause subscription (holidays)
- Skip a single occurrence
- Cancel with notice period
- Provider marks occurrence complete; resident confirms or disputes

**GraphQL:** `createSubscription`, `pauseSubscription`, `listUpcomingOccurrences`, `completeOccurrence`

**Addresses missing items:** recurring subscriptions, scheduling, capacity limits, pause/skip/cancel rules.

---

### Phase 4 — Payments (Week 5)

**Goal:** Monthly billing with platform fee and provider payouts.

**MVP approach (Stripe or local equivalent):**
- Recurring billing per subscription
- Platform fee (e.g. 10%) via Connect/split payments
- Webhook handlers for success/failure
- Invoice history (residents) and earnings dashboard (providers)

**Do not build custom payment logic** — use the provider’s subscription and Connect APIs.

**Addresses missing items:** payments & payouts, refund policy hooks.

---

### Phase 5 — Trust, reviews & messaging (Week 6)

**Goal:** Build confidence between neighbors.

- Post-completion reviews (1–5 stars + text)
- Provider verification badge (admin-approved)
- In-app messaging tied to active subscriptions
- Report/block user
- Dispute flag on occurrences

**Addresses missing items:** trust layer, in-app messaging, dispute resolution entry point, transport verification uploads.

---

### Phase 6 — Notifications & admin (Week 7)

**Notifications:**
- Email: booking confirmed, payment failed, visit tomorrow, subscription paused
- Later: SMS for school transport reminders

**Admin panel:**
- Approve/reject providers
- Manage categories and neighborhoods
- View disputes and flagged messages

**Addresses missing items:** notifications, admin moderation, dispute workflow.

---

### Phase 7 — Polish, test & pilot launch (Week 8)

**Quality:**
```bash
python .cursor/skills/senior-fullstack/scripts/code_quality_analyzer.py .
python .cursor/skills/senior-fullstack/scripts/project_scaffolder.py . --verbose
```

**Testing:**
| Layer | Tool | Focus |
|-------|------|-------|
| Unit | Vitest | Pricing, schedule generation, subscription state machine |
| Integration | Vitest + test DB | GraphQL resolvers, Prisma |
| E2E | Playwright | Subscribe → accept → complete → review |

**Launch:** One pilot neighborhood, 3–5 seed providers, invite-only residents.

**Addresses missing items:** cold-start seeding, offline-habit UX (fast booking, clear trust signals).

---

### Build order

```
Phase 0: Scaffold + DB
    ↓
Phase 1: Auth + Neighborhood
    ↓
Phase 2: Listings + Discovery
    ↓
Phase 3: Subscriptions + Schedule
    ↓
Phase 4: Payments
    ↓
Phase 5: Trust + Reviews
    ↓
Phase 6: Admin + Notifications
    ↓
Phase 7: Pilot Launch
```

---

## Tech stack

Aligned with the **senior-fullstack** skill in `.cursor/skills/senior-fullstack/`:

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| API | GraphQL (Apollo Server) |
| Database | PostgreSQL + Prisma |
| Auth | Session cookies (MVP) |
| Payments | Stripe (or local equivalent) |
| Testing | Vitest + Playwright |
| Local DB | Docker Compose (PostgreSQL 16) |

UI design follows the **frontend-design** skill in `.cursor/skills/frontend-design/` — community-focused, distinctive typography, no generic “AI slop” aesthetics.

---

## Prerequisites

Install these before starting:

- **Node.js** 20+ and **npm** 10+
- **Python** 3.10+ (for project scaffolder scripts)
- **Docker** and **Docker Compose** (for local PostgreSQL)
- **Git**

Optional but recommended:

- [Stripe CLI](https://stripe.com/docs/stripe-cli) (Phase 4 payments)
- [Cursor](https://cursor.com) with project skills enabled

---

## Getting started

The application lives in `platform/` and is ready to run.

### 1. Start PostgreSQL

From the repo root:

```bash
docker compose up -d
```

### 2. Install and run

```bash
cd platform
cp .env.example .env   # skip if .env already exists
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo accounts (password: `password123`)

| Role | Email |
|------|-------|
| Admin | admin@hearthlane.local |
| Resident | resident@hearthlane.local |
| Provider | provider@hearthlane.local |

**Pilot neighborhood:** Observatory (postcodes `7925`, `7700`)

See [platform/README.md](platform/README.md) for full details.

---

## Project structure

```
Utilities app/
├── README.md                          # This file — product plan + setup
├── docker-compose.yml                 # Local PostgreSQL
├── .cursor/skills/
│   ├── frontend-design/               # UI design skill
│   └── senior-fullstack/              # Fullstack patterns + scaffolder
│       ├── scripts/
│       │   ├── fullstack_scaffolder.py
│       │   ├── project_scaffolder.py
│       │   └── code_quality_analyzer.py
│       └── references/
│           ├── tech_stack_guide.md
│           ├── architecture_patterns.md
│           └── development_workflows.md
└── platform/                          # Generated app (after Phase 0 scaffold)
    ├── src/
    │   ├── app/                       # Next.js routes
    │   ├── features/                  # Domain modules (add during build)
    │   ├── graphql/                   # Schema + resolvers
    │   └── lib/                       # Prisma, auth, utilities
    ├── prisma/
    │   └── schema.prisma
    ├── package.json
    └── .env.example
```

---

## Development workflow

1. **Branch:** `feat/<ticket>-short-description` from `main`
2. **Build by phase:** Follow the [implementation plan](#implementation-plan) in order — auth before payments, listings before subscriptions
3. **Use skills in Cursor:**
   - UI work → reference `.cursor/skills/frontend-design/SKILL.md`
   - Architecture, GraphQL, Prisma → reference `.cursor/skills/senior-fullstack/references/`
4. **Commit format:** `feat(subscriptions): add pause and skip occurrence`
5. **Before PR:** `npm run test && npm run lint`

Full workflow details: `.cursor/skills/senior-fullstack/references/development_workflows.md`

---

## Design guidelines

When building UI (landing page, listing cards, booking flows):

- **Tone:** Organic, community, trustworthy — a local noticeboard upgraded, not corporate SaaS
- **Typography:** Distinctive display font + readable body font (avoid Inter, Roboto, Arial)
- **Color:** Cohesive palette with CSS variables; dominant color + sharp accent
- **Motion:** Staggered card reveals, clear booking confirmation moments
- **Layout:** Mobile-first; generous spacing on marketing pages, efficient density in dashboards

Full guidance: `.cursor/skills/frontend-design/SKILL.md`

---

## Decisions to make before building

Answer these before Phase 1 to avoid rework:

| Decision | Options | Impact |
|----------|---------|--------|
| **Launch geography** | Country / city | Payments, transport compliance, privacy law |
| **Neighborhood definition** | Postcode, estate name, map polygon | Auth middleware, listing filters |
| **Payment model** | Platform collects vs Connect-only | Phase 4 architecture |
| **Provider verification** | Self-serve vs admin-approved (recommended for MVP) | Phase 1 provider flow |
| **School transport in MVP?** | Yes / Phase 2 | Compliance complexity |
| **Pilot neighborhood** | Name + boundaries | Seed data and launch scope |

---

## License

Private — all rights reserved unless otherwise specified.
