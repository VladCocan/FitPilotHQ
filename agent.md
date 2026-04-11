You are building a new project called FitPilotHQ from scratch.

FitPilotHQ is a web app for EVE Online players.

Core product goal:
Given an EFT fit and one or more EVE characters, determine:
- whether the character can fly the fit
- which skills are missing
- how long training will take
- which character is best suited for the fit

The project must be built with a clean architecture from the start.

==================================================
ARCHITECTURAL PRINCIPLES
==================================================

1. Separate data sources clearly:
- ESI is only for live character state:
  - characters
  - skills
  - attributes
  - skill queue
  - optionally saved fittings
- Static/generated data is for:
  - skill catalog
  - skill prerequisites
  - item definitions
  - item skill requirements
- PostgreSQL is the runtime source of truth for normalized app data

2. Runtime must NOT depend on static JSON files directly.
Generated files are allowed as build artifacts or seed input only.
At runtime, the app should use DB-backed lookups.

3. Keep business logic framework-agnostic.
All core logic must live in pure modules under src/lib.
React pages and API routes must be thin.

4. Manual item mappings are allowed only as fallback overrides.
They must not be the primary source of truth.

5. Unknown items must not break analysis.
They should be tracked and reported.

==================================================
TECH STACK
==================================================

Use:
- Next.js App Router
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS
- Docker for local development
- zod for validation

==================================================
PHASED IMPLEMENTATION PLAN
==================================================

Implement the project in the following phases only.
Do not skip phases.

--------------------------------------------------
PHASE 1 — Project bootstrap and infrastructure
--------------------------------------------------

Goal:
Get a working web app + DB + Docker environment.

Tasks:
- initialize Next.js app with TypeScript and Tailwind
- add Prisma and PostgreSQL
- add Dockerfile and docker-compose.yml
- add .env.example
- add health endpoint
- add Prisma schema baseline

Deliverables:
- app runs in Docker
- DB connects
- Prisma migrations work
- GET /api/health returns OK

--------------------------------------------------
PHASE 2 — EVE auth and character sync
--------------------------------------------------

Goal:
Support real EVE login and character sync.

Tasks:
- implement EVE SSO login
- implement auth callback
- persist user + character
- sync character skills, attributes, and queue from ESI
- add dashboard with synced characters

Rules:
- ESI is only for live character state
- keep ESI calls isolated in src/lib/esi.ts or similar

Deliverables:
- user can log in
- character is stored
- sync works
- character skills/attributes/queue are persisted

--------------------------------------------------
PHASE 3 — Static intelligence layer
--------------------------------------------------

Goal:
Build the static knowledge base for requirements.

Tasks:
- seed SkillCatalog into DB
- seed SkillPrerequisite into DB
- design ItemDefinition and ItemRequirementSkill tables
- create generator script for item requirements from simplified SDE-like input
- generate output files as artifacts
- seed generated item data into DB
- add dataset validation scripts

Rules:
- generated files are seed input only
- runtime uses DB, not files
- manual overrides are separate and minimal

Deliverables:
- DB contains item definitions and item requirement skills
- validation script passes
- generated item data is queryable in DB

--------------------------------------------------
PHASE 4 — Core fit analysis engine
--------------------------------------------------

Goal:
Build the full analysis pipeline as pure logic modules.

Tasks:
- implement EFT parser
- implement item lookup against DB-backed generated data
- implement manual override fallback
- implement prerequisite resolver
- implement fit requirement resolver
- implement skill gap engine
- implement SP math utilities
- implement training plan engine
- implement readiness scoring

Rules:
- all core logic must be pure and framework-agnostic
- API routes must not contain business logic
- unknown items must not crash analysis

Deliverables:
- one pure analysis pipeline from fit text + character data to result

--------------------------------------------------
PHASE 5 — Single fit analysis API
--------------------------------------------------

Goal:
Expose the analysis engine through one clean endpoint.

Tasks:
- create POST /api/fits/analyze
- validate input with zod
- load character data from DB
- run the full analysis pipeline
- return structured JSON:
  - parsed fit
  - requirements
  - gap analysis
  - readiness
  - training plan
  - unknown items

Deliverables:
- endpoint works end-to-end
- errors are structured and readable

--------------------------------------------------
PHASE 6 — Minimal product UI
--------------------------------------------------

Goal:
Build only the minimum UI needed to use the product.

Pages:
- /login
- /dashboard
- /fit-analyzer

UI features:
- select character
- paste EFT fit
- analyze
- display readiness
- display missing skills
- display training plan
- display unknown item warnings if relevant

Rules:
- UI must be presentational where possible
- no business logic duplication in client components

Deliverables:
- full single-character workflow is usable from the browser

--------------------------------------------------
PHASE 7 — Hardening and observability
--------------------------------------------------

Goal:
Make the app stable and diagnosable.

Tasks:
- dataset validation script
- mapping coverage report
- smoke test runner using benchmark EFT fixtures
- unknown item tracking
- unknown item prioritization report
- parser regression tests
- CI workflow for typecheck + tests + dataset validation

Rules:
- CI must not depend on live ESI access
- unknown item tracking must be non-blocking

Deliverables:
- test suite green
- CI gate in place
- developer tooling for dataset improvement

--------------------------------------------------
PHASE 8 — Advanced product features
--------------------------------------------------

Goal:
Only after the single-character flow is stable, add advanced features.

Tasks:
- weighted readiness scoring
- unknown item suggestions
- multi-character comparison
- best character for this fit
- optional debug mode for pipeline inspection

Rules:
- reuse existing single-character pipeline
- keep comparison logic framework-agnostic
- no product sprawl

Deliverables:
- compare flow works
- scoring is more realistic
- unknown handling is more actionable

==================================================
RUNTIME SOURCE-OF-TRUTH RULES
==================================================

At runtime:
- character state comes from DB, originally synced from ESI
- item requirements come from DB, originally generated and seeded
- manual overrides are fallback only
- unknown items are tracked, not hidden

Do NOT:
- read generated JSON files directly in runtime analysis
- call ESI to resolve item skill requirements live
- rely on manual mappings as the primary source forever

==================================================
DATABASE DESIGN RULES
==================================================

The schema must include, at minimum:
- User
- Character
- CharacterSkill
- CharacterSkillQueue
- CharacterAttributes
- SkillCatalog
- SkillPrerequisite
- ItemDefinition
- ItemRequirementSkill
- Fit (optional persisted analysis artifact if useful)

Use:
- unique constraints
- indexes on lookup keys
- idempotent seed strategy

==================================================
TESTING RULES
==================================================

Add tests gradually:
- parser tests
- prerequisite resolver tests
- gap engine tests
- training plan tests
- compare tests
- regression tests for benchmark EFT fixtures

Also add:
- smoke test fixtures:
  - simple frigate
  - battlecruiser
  - drone fit
  - missile fit
  - logistics fit
  - weird mixed fit

==================================================
IMPLEMENTATION STYLE
==================================================

- build incrementally
- keep modules small
- prefer pure functions
- keep route handlers thin
- keep React components simple
- do not overengineer caching
- do not add unrelated EVE features early

==================================================
IMPORTANT NON-GOALS FOR EARLY VERSIONS
==================================================

Do NOT build these before the core flow is solid:
- wallet
- assets
- market
- corp dashboards
- notifications
- fitting editor
- remap optimizer
- implant optimizer

==================================================
DEFINITION OF SUCCESS
==================================================

The first true success milestone is:

A real user can:
- log in with EVE SSO
- sync one or more characters
- paste a fit
- see missing skills
- see training time
- see a believable readiness score
- compare characters if multiple are synced

without crashes and with unknown items reported clearly.

==================================================
WORKING MODE
==================================================

Implement one phase at a time.
After each phase:
- explain what was added
- explain assumptions
- identify anything intentionally deferred
Do not jump ahead.