# Target Taxonomy

Target structure for `skills/agent-team/kb/architecture/`. Each leaf is a single pattern doc; each branch is a domain category. Authoring fills slots; status tracks progress.

## Top-level structure

The KB has two organizational axes:

- **Hierarchical** for domain-specific patterns that decompose cleanly (frontend / backend / data)
- **Flat** for cross-cutting principles that apply across domains (`crosscut/`, `discipline/`)

This hybrid avoids the "where does Idempotency live?" duplication problem of pure hierarchy.

## Tree

```text
kb/architecture/
│
├── crosscut/                     [FLAT — applies across domains]
│   ├── dependency-rule.md          [empty]
│   ├── deep-modules.md             [empty]
│   ├── information-hiding.md       [empty]
│   ├── bounded-contexts.md         [empty]
│   ├── single-responsibility.md    [empty]
│   ├── trade-off-discipline.md     [empty]
│   └── anti-corruption-layer.md    [empty]
│
├── frontend/                     [HIERARCHICAL — UI / client-side]
│   ├── markup/
│   │   ├── semantic-html.md        [empty]
│   │   └── accessibility.md        [empty]
│   ├── state-management/
│   │   ├── client-state.md         [empty]
│   │   └── server-state.md         [empty]
│   └── design-systems/
│       └── component-library.md    [empty]
│
├── backend/                      [HIERARCHICAL — server-side]
│   ├── api-design/
│   │   ├── rest-conventions.md     [empty]
│   │   ├── graphql-shape.md        [empty]
│   │   ├── api-versioning.md       [empty]
│   │   └── pagination.md           [empty]
│   ├── database/
│   │   ├── schema-design.md        [empty]
│   │   ├── migration-strategies.md [empty]
│   │   └── indexing.md             [empty]
│   └── authentication/
│       ├── session-vs-token.md     [empty]
│       └── authorization-models.md [empty]
│
├── data/                         [HIERARCHICAL — data + concurrency]
│   ├── consistency/
│   │   ├── isolation-levels.md     [empty]
│   │   ├── cap-trade-offs.md       [empty]
│   │   └── consistency-models.md   [empty]
│   ├── messaging/
│   │   ├── outbox-pattern.md       [empty]
│   │   ├── saga-pattern.md         [empty]
│   │   └── event-driven-state.md   [empty]
│   ├── caching/
│   │   ├── cache-invalidation.md   [empty]
│   │   └── cache-strategies.md     [empty]
│   └── concurrency/
│       ├── idempotency.md          [empty]
│       ├── locking-strategies.md   [empty]
│       └── eventual-consistency.md [empty]
│
└── discipline/                   [FLAT — engineering practice]
    ├── refusal-patterns.md         [empty]
    ├── adr-template.md             [empty]
    ├── failure-mode-analysis.md    [empty]
    └── trade-off-articulation.md   [empty]
```

## Status legend

- `[empty]` — slot exists but no notes yet
- `[notes]` — notes accumulated in `_NOTES.md`; ready for or in authoring
- `[draft]` — pattern doc exists but incomplete
- `[shipped]` — pattern doc complete and registered in `kb/manifest.json`

## Initial state

All slots `[empty]`. Filling begins with source ingestion (Phase 2).

## Estimated final size

Roughly 35-40 docs across all branches. Slots can be added or removed during convergence detection (Phase 3) based on what sources actually surface.

## Slot rationale

### Why `crosscut/` is flat

Patterns like Idempotency apply to APIs (backend/), message queues (data/messaging/), AND database operations (data/concurrency/). Putting it in one subtree creates duplication or hidden coupling. Flat `crosscut/` lets retrieval pull it once regardless of which domain triggered the lookup.

### Why `discipline/` is flat

Engineering practice (refusal patterns, ADR shape, failure-mode analysis) applies to all coding work, not a specific domain. Flat structure for the same reason as `crosscut/`.

### Why hierarchical for frontend/backend/data

These ARE cleanly domain-decomposable. Schema design has nothing to do with frontend rendering; rest-conventions don't apply to caching strategies. Hierarchical pruning gives bounded retrieval cost when domain is clearly identified.

## Overflow handling

Patterns surfaced during source ingestion that don't fit current taxonomy:

1. Tag as `OVERFLOW` in `_NOTES.md`
2. Capture rationale: why doesn't it fit? what would be needed?
3. After 3+ overflow patterns share a category, propose taxonomy expansion to user
4. Don't expand unilaterally; user signs off on structural changes

## Open questions for the user (resolve before authoring)

- Do we want a `security/` top-level branch separate from `backend/authentication/`? Threat modeling, secrets management, encryption-at-rest could live there.
- Do we want a `testing/` branch under discipline? Test pyramid, contract testing, property-based testing patterns.
- Is `frontend/state-management/` deep enough for two slots, or should it be one consolidated doc?

These can wait for after a few sources are processed. The taxonomy is intentionally provisional.
