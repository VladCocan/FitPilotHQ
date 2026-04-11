# Roadmap

This roadmap describes the intended development phases for FitPilotHQ. It is a planning document, not a promise that every phase is complete.

## Phase 1: Infrastructure and auth

Goal: establish the local runtime and authentication baseline.

Key deliverables:

- Dockerized Next.js and PostgreSQL setup
- Prisma schema and migrations
- health endpoint
- EVE SSO entry points

## Phase 2: Character sync

Goal: persist live character state from ESI.

Key deliverables:

- user and character persistence
- skill, attribute, and queue sync
- dashboard for synced characters

## Phase 3: Static data layer

Goal: build the seeded reference-data model used by analysis.

Key deliverables:

- skill catalog seed data
- prerequisite graph seed data
- generated item requirement artifacts
- validation and seed scripts

## Phase 4: Fit analysis engine

Goal: implement a pure, framework-agnostic analysis pipeline.

Key deliverables:

- EFT parser
- requirement resolution
- prerequisite expansion
- skill gap and training-time calculation
- readiness scoring

## Phase 5: API and UI

Goal: expose the analysis pipeline through usable interfaces.

Key deliverables:

- fit analysis API
- comparison API
- single-character analyzer UI
- multi-character comparison UI

## Phase 6: Hardening and observability

Goal: make the system easier to validate and debug.

Key deliverables:

- regression tests
- smoke scripts
- coverage and unknown-item reports
- CI checks

## Phase 7: Advanced features

Goal: improve realism and usability beyond the base workflow.

Key deliverables:

- refined readiness scoring
- better unknown-item handling
- richer comparison outputs
- improved diagnostics and product polish