You are working inside the FitPilotHQ repository.

Goal:
Implement an automatic SDE+ESI resolution pipeline for unknown EFT items so that missing item definitions can be recovered automatically, persisted safely, and reused by the runtime analysis pipeline.

Critical architectural constraints:
- Preserve the existing architecture:
  - runtime analysis must stay DB-backed
  - do NOT read generated JSON files directly during runtime fit analysis
  - do NOT call ESI from the core fit analysis pipeline
- SDE is the primary source of truth for static item intelligence
- ESI is an auxiliary discovery/enrichment source for unknown items
- Business logic must remain framework-agnostic under src/lib
- Unknown items must remain non-blocking and visible when confidence is low
- Manual overrides remain fallback only, not the primary source of truth

Current problem:
The analysis pipeline currently reports results like:
- 21 total requirement(s)
- 4 missing skill(s)
- 3 unknown item(s)

We want to automatically reduce unknown items by introducing a safe data recovery flow based on:
1) SDE-generated/static seeded data
2) ESI-assisted lookup for items not yet covered by the DB

==================================================
HIGH-LEVEL DESIGN
==================================================

Implement a two-layer strategy:

Layer A — SDE-first dataset generation
- Expand or improve the existing static generation pipeline so that item definitions and requirement data are generated more completely from SDE-derived inputs
- Keep generated artifacts as seed input only
- Seed PostgreSQL tables from generated artifacts
- Runtime continues to read only from DB tables

Layer B — ESI-assisted unknown item recovery
- When an EFT item is not found in DB-backed item definitions, enqueue it for an out-of-band recovery workflow
- The recovery workflow may use ESI to:
  - search the item by name
  - resolve likely type IDs
  - fetch universe type details
  - extract enrichments useful for classification and matching
- The recovery workflow must NOT run inline inside the main fit analysis request path unless explicitly invoked via a separate maintenance/admin action
- The result of recovery must be persisted into DB tables for later reuse

==================================================
WHAT TO BUILD
==================================================

1. Add a new DB-backed recovery model layer in Prisma

Add tables/models for something like:

- UnknownItemObservation
  - id
  - normalizedName
  - originalName
  - kind (ship, item, drone, charge, implant, booster, subsystem, unknown)
  - sourceFitTextHash or fit reference if useful
  - firstSeenAt
  - lastSeenAt
  - seenCount
  - status: pending | matched | ambiguous | rejected
  - lastError nullable

- ItemResolutionCandidate
  - id
  - unknownItemObservationId
  - candidateTypeId
  - candidateName
  - source: sde | esi | lexical | manual
  - confidenceScore
  - confidenceReason
  - accepted boolean
  - createdAt

- ItemAlias
  - id
  - aliasNormalized
  - canonicalTypeId
  - canonicalName
  - source: manual | auto-sde | auto-esi
  - confidenceScore nullable
  - reviewStatus: accepted | pending | rejected
  - createdAt
  - updatedAt

Keep existing ItemDefinition and ItemRequirementSkill as the runtime source for resolved item requirements.

2. Add a pure unknown-item observation writer

Implement a pure + persistence-safe module that, during analysis, records unknown items without breaking the pipeline.

Requirements:
- If an item cannot be resolved in resolveFitRequirements(), it should still be returned in unknownItems
- Additionally, write or upsert an UnknownItemObservation
- Increment seenCount and update lastSeenAt
- Do not crash analysis if observation persistence fails
- Keep this side effect outside the pure computation core where appropriate

3. Add an SDE completion/improvement pipeline

Improve the current generator/seed pipeline so it:
- generates broader item coverage from SDE-derived inputs
- normalizes names consistently
- captures item categories / group metadata if available
- derives requirement relationships as completely as possible
- produces seed artifacts that are then imported into DB

Requirements:
- keep generator scripts separate from runtime
- add validation output:
  - number of seeded items
  - number of seeded requirement links
  - coverage by category/group
  - skipped items with reasons

4. Add an ESI-assisted resolver service

Create a new module such as:
- src/lib/reference-data/esi-item-recovery.ts
- src/lib/reference-data/recover-unknown-items.ts

This service should:
- take pending UnknownItemObservation records
- try to resolve them in this order:

  Step A — alias lookup
  - check existing ItemAlias table
  - if found and accepted, use it

  Step B — lexical lookup against ItemDefinition
  - use normalized names
  - reuse or adapt the unknown-item-suggestions scoring logic
  - if confidence is very high, create an ItemAlias with source=auto-sde

  Step C — ESI search
  - search candidate names using the unknown item’s originalName and normalized variants
  - if a strong match is found, fetch type details
  - use returned metadata to classify the candidate
  - do NOT blindly accept weak or ambiguous matches

  Step D — requirement derivation
  - if the resolved type already exists in ItemDefinition, attach alias only
  - if the type does not exist yet, create or upsert ItemDefinition
  - populate minimal classification data needed for future matching
  - only populate ItemRequirementSkill automatically if confidence is high and there is a deterministic derivation path from available static/dogma data
  - otherwise persist the candidate as pending review

  Step E — persistence
  - store all evaluated candidates in ItemResolutionCandidate
  - if accepted, create/update ItemAlias
  - if sufficient requirement data exists, upsert ItemRequirementSkill rows
  - mark observation as matched / ambiguous / rejected

5. Keep analysis runtime clean

Do NOT call ESI from:
- analyzeFit()
- resolveFitRequirements()
- API routes used by end users for fit analysis

Instead:
- analysis should consult DB-backed ItemDefinition + ItemRequirementSkill + accepted ItemAlias
- unknown items found at runtime are recorded for later recovery
- optional admin/maintenance endpoints or scripts may trigger the recovery workflow

6. Add accepted alias support into the resolution pipeline

Update the fit requirement resolution flow so it resolves items in this order:
- exact normalized ItemDefinition match
- accepted ItemAlias lookup
- manual override fallback
- unresolved => unknownItems

Do not let ItemAlias bypass safety:
- only accepted aliases should be used by runtime
- pending aliases must not affect analysis

7. Add admin/maintenance scripts

Create scripts such as:
- pnpm tsx scripts/recover-unknown-items.ts
- pnpm tsx scripts/report-unknown-items.ts
- pnpm tsx scripts/report-resolution-coverage.ts

The recovery script should:
- process pending observations in batches
- retry safely
- log outcomes
- support dry-run mode
- support max-items limit

The reporting scripts should show:
- most seen unknown items
- auto-resolved items
- ambiguous items needing review
- coverage improvements over time

8. Add API/admin endpoints only if useful

Optionally add protected/internal endpoints:
- POST /api/admin/reference-data/recover-unknown-items
- GET /api/admin/reference-data/unknown-items
- GET /api/admin/reference-data/resolution-report

These endpoints must:
- be thin
- call library modules
- not contain business logic

9. Update types and analysis output

Extend result types to expose:
- unknownItems
- unknownItemSuggestions
- autoResolvedAliasesUsed (if any accepted aliases were used)
- dataWarnings

Important:
- distinguish between:
  - exact DB match
  - alias-based match
  - manual override
  - unresolved unknown item

10. Add tests

Add tests for:
- exact match from ItemDefinition
- accepted alias resolution
- pending alias is ignored
- unknown item observation is recorded
- lexical high-confidence auto-resolution creates accepted alias
- ambiguous lexical match does not auto-accept
- ESI candidate with weak confidence remains pending
- recovery pipeline upserts aliases safely
- runtime analysis uses accepted alias without calling ESI
- regression fixture:
  a fit that previously produced 3 unknown items now produces fewer unknown items after recovery pipeline has run

11. Add safety rules and thresholds

Define thresholds/constants in one place:
- lexical acceptance threshold
- top-vs-second margin threshold
- category compatibility rules
- allowed auto-accept sources
- when requirement derivation is allowed automatically
- when review is required

Document them with comments.
Be conservative.

==================================================
IMPLEMENTATION RULES
==================================================

- Keep modules small and typed
- Prefer pure functions in src/lib
- Keep route handlers and scripts thin
- Do not overengineer background jobs
- Batch processing is enough
- Do not add unrelated EVE features
- Do not hide uncertainty
- Make unknown handling non-blocking and observable

==================================================
EXPECTED OUTCOME
==================================================

After implementation:
- runtime fit analysis still uses DB-backed lookups only
- unknown items are automatically observed and queued
- SDE improves baseline coverage
- ESI assists recovery for uncovered items
- accepted aliases and recovered definitions reduce future unknown items automatically
- the same fit should gradually stop reporting:
  - 3 unknown item(s)
when recoverable matches exist

Deliverables:
- Prisma schema changes
- migration(s)
- SDE pipeline improvements
- ESI recovery modules
- alias support in runtime lookup
- admin/maintenance scripts
- tests
- brief explanation of assumptions and what still requires manual review