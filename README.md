# FitPilotHQ

EVE Online fit analysis tool focused on character sync, EFT fit evaluation, skill gap analysis, and training-time estimation.

## Status

Early development. The repository already has a working technical foundation and active feature work, but the project is still evolving and should be treated as in-progress rather than production-ready.

## Project goals

FitPilotHQ is intended to:

- sync EVE characters through EVE SSO and ESI
- analyze EFT fits against stored character state
- show missing skills and prerequisites
- estimate training time for missing requirements
- compare multiple characters for the same fit

## Current state

What exists today:

- Docker-first local runtime with Next.js, Prisma, and PostgreSQL
- EVE SSO login flow and character sync routes
- database models for characters, skills, attributes, and reference data
- generated and seeded static data for skills, prerequisites, and item requirements
- a pure fit-analysis pipeline under `src/lib/fits`
- JSON APIs for single-character analysis and multi-character comparison
- browser pages for a fit analyzer and a comparison tool
- regression tests, smoke scripts, and CI checks for fit-analysis tooling

What to assume is still in progress:

- item coverage is not complete for the full EVE item universe
- UX and API contracts may still change while the product direction settles
- operational polish, deployment guidance, and contributor workflows are still being refined

## Planned features

Planned, incomplete, or still evolving work includes:

- broader and more accurate item requirement coverage
- richer analysis output and debug tooling
- further hardening of sync and runtime workflows
- better product polish around saved workflows and comparison UX
- continued refinement of readiness scoring and requirement resolution

## Tech stack

- Next.js App Router
- React 19
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Zod
- Docker Compose

## Architecture direction

The project is intentionally split across three data domains:

- ESI: live character state only, including characters, skills, attributes, and queue data
- PostgreSQL: runtime source of truth for normalized application data
- generated reference data: skill catalogs, prerequisites, item definitions, and item requirements used as seed input, not as runtime lookups

Core business logic is intended to stay in pure modules under `src/lib`, while Next.js pages and API routes remain thin adapters.

## Local setup

FitPilotHQ is developed and verified through Docker.

1. Copy the sample env file if needed.

```bash
cp .env.example .env
```

2. Start the stack.

```bash
docker compose up --build
```

3. Verify health.

```bash
curl http://localhost:3000/api/health
```

4. Useful verification commands.

```bash
docker compose exec -T app npm run typecheck
docker compose exec -T app npm run test:fits
docker compose exec -T app npm run smoke:fits
docker compose exec -T app npm run smoke:drake-sample
docker compose exec -T app npm run smoke:drake-runtime
docker compose exec -T app npm run report:fit-coverage
docker compose exec -T app npm run report:unknown-items
```

Container startup currently runs Prisma client generation, applies migrations, prepares reference data, seeds PostgreSQL, and starts the Next.js development server.

## Development roadmap

The project is being developed in phases.

1. Infrastructure and auth
2. Character sync
3. Static data layer
4. Fit analysis engine
5. API and UI flows
6. Hardening and observability
7. Advanced comparison and scoring features

See [ROADMAP.md](ROADMAP.md) for the concise phase breakdown.

## Contributing

The project is still early-stage and the structure will continue to evolve.

- keep pure business logic in `src/lib`
- keep API routes thin
- prefer Docker-based verification
- open an issue before making large behavioral or architectural changes

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).