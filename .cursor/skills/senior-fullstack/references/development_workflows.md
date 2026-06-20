# Development Workflows

Day-to-day workflow for building, validating, and shipping fullstack applications.

## Local setup

```bash
# Clone and install
git clone <repo>
cd <repo>
npm install

# Environment
cp .env.example .env
# Edit DATABASE_URL and auth secrets

# Database
npm run db:generate
npm run db:migrate

# Dev server
npm run dev
```

### Docker Compose (optional local stack)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Skill scripts workflow

Run from the skill directory or pass absolute paths.

### New project

```bash
python .cursor/skills/senior-fullstack/scripts/fullstack_scaffolder.py ./my-app --dry-run
python .cursor/skills/senior-fullstack/scripts/fullstack_scaffolder.py ./my-app
```

### Project analysis

```bash
python .cursor/skills/senior-fullstack/scripts/project_scaffolder.py . --verbose
python .cursor/skills/senior-fullstack/scripts/project_scaffolder.py . --json > report.json
```

### Code quality scan

```bash
python .cursor/skills/senior-fullstack/scripts/code_quality_analyzer.py --analyze .
python .cursor/skills/senior-fullstack/scripts/code_quality_analyzer.py . --json
```

## Git workflow

1. Branch from `main`: `feat/<ticket>-short-description`
2. Keep commits focused; reference ticket IDs.
3. Open PR when CI green and self-review complete.
4. Squash or merge per team policy; delete branch after merge.

### Commit message format

```
feat(users): add GraphQL mutation for profile updates

Validate input with zod and enforce row-level auth in service layer.
```

## CI pipeline (GitHub Actions baseline)

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: cp .env.example .env
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

## Security checklist

- [ ] All user input validated at boundary (Zod/class-validator).
- [ ] Parameterized queries only (Prisma/ prepared statements).
- [ ] AuthN/AuthZ enforced in services, not just UI.
- [ ] Secrets in env/secret manager — never committed.
- [ ] Dependencies scanned (`npm audit`, Dependabot).
- [ ] CSRF protection for cookie-based auth.
- [ ] Rate limiting on auth and write endpoints.
- [ ] Security headers (CSP, HSTS, X-Frame-Options).

## Scalability guidelines

### Application tier

- Stateless app servers behind load balancer.
- Horizontal scale on CPU/latency metrics.
- Background jobs for long-running work.

### Database tier

- Read replicas for read-heavy workloads.
- Partition/archive old data by time or tenant.
- Monitor connection count, lock waits, cache hit ratio.

### Frontend tier

- Static generation for marketing/content pages.
- ISR or SSR for personalized but cacheable views.
- Client-side code splitting per route/feature.

## Environment matrix

| Environment | Purpose | Data | Deploy trigger |
|-------------|---------|------|----------------|
| local | Dev | Seed/fixtures | Manual |
| preview | PR review | Ephemeral DB | PR open/update |
| staging | Pre-prod validation | Anonymized prod-like | merge to main |
| production | Live traffic | Real | tagged release |

## Troubleshooting

### Database connection errors

1. Verify `DATABASE_URL` host/port/credentials.
2. Confirm Postgres is running (`docker compose ps`).
3. Check pool limits if using serverless + Prisma.

### GraphQL schema drift

1. Regenerate types/clients after schema changes.
2. Run integration tests against updated operations.
3. Deprecate fields before removal; monitor usage.

### Build failures

1. Clear `.next` and reinstall: `rm -rf .next node_modules && npm install`.
2. Ensure Node version matches `.nvmrc` / CI.
3. Fix TypeScript errors locally before pushing.

### Slow CI

1. Cache npm dependencies.
2. Split unit vs integration jobs.
3. Run E2E only on main or nightly if costly.

## Release checklist

- [ ] Migrations reviewed and tested on staging
- [ ] Feature flags configured for risky changes
- [ ] Monitoring dashboards updated
- [ ] Rollback plan documented
- [ ] Post-deploy smoke tests passed

## Related docs

- Stack reference: [tech_stack_guide.md](tech_stack_guide.md)
- Architecture patterns: [architecture_patterns.md](architecture_patterns.md)
