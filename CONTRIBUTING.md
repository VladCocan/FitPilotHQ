# Contributing

FitPilotHQ is still early-stage. The codebase is usable, but the structure and workflows are still evolving.

## Local development

Use Docker for local runtime and verification.

```bash
cp .env.example .env
docker compose up --build
```

Useful checks:

```bash
docker compose exec -T app npm run typecheck
docker compose exec -T app npm run test:fits
docker compose exec -T app npm run smoke:fits
```

## Project structure

Current and planned structure is centered around these areas:

- `src/app`: UI pages and API routes
- `src/lib`: shared server and application code
- `src/lib/fits`: pure fit-analysis logic
- `prisma`: schema, migrations, and seed logic
- `data/source`: maintained source data
- `data/generated`: generated artifacts used for seeding
- `scripts`: validation, smoke, and reporting tooling

## Coding principles

- keep core logic pure in `src/lib`
- keep API routes thin and validation-focused
- avoid duplicating business logic in React components
- prefer DB-backed runtime lookups over direct file access
- prefer Docker-based verification for runtime behavior

## Issues and discussions

- open an issue for bugs, unclear behavior, or architectural concerns
- open an issue before large refactors or major scope changes
- include reproduction steps or concrete examples where possible

## Expectations

Because the project is still evolving:

- some docs may lag behind current implementation details
- APIs and page behavior may still change
- smaller focused pull requests are preferred over broad rewrites