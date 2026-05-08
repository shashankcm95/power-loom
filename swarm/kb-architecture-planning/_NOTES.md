# Working Notes — Pattern Discovery

> **READ THIS FIRST every session.** This is the durable memory layer. Without reading this, prior context is lost (Claude has no cross-session memory; substrate filesystem IS the memory).

## Session log

Track which sources were processed in each session. Helps avoid re-processing and shows velocity.

| Session date | Sources processed | New patterns | Duplicates spotted | Outcome |
|--------------|-------------------|--------------|-------------------|---------|
| (none yet)   | -                 | -            | -                 | Phase 1: infrastructure setup |

## Pattern notes

Format per entry. Append new entries to the bottom of this section.

```text
### [Pattern name]
- **Taxonomy slot**: e.g., `crosscut/dependency-rule`
- **Source(s)**: [Title (Author), section/page, tier]
- **Tier**: 1 | 2 | 3 | 4 (per `_SOURCES.md` definitions)
- **Duplicate-of**: link to prior note if same pattern (consensus signal)
- **Key claim**: 1-2 sentences capturing the pattern's core
- **Failure mode if violated**: 1-2 sentences on what breaks if you ignore this
- **Substrate relevance**: drift-note number(s) where this would have helped, OR "foundational" if no specific drift
- **Anti-pattern**: when this gets misapplied
- **Notes**: subtleties, edge cases, when-not-to-use
```

### (no entries yet — ingestion begins in Phase 2)

## Overflow patterns

Patterns surfaced during source ingestion that don't fit current `_TAXONOMY.md`. Captured here for periodic review; promoted to taxonomy expansion after 3+ overflow patterns share a category.

### (no overflow yet)

## Consensus tracker

After each session, update which patterns have multiple-source confirmation. Patterns with 3+ Tier-1+2 sources are priority for authoring.

| Pattern | Sources mentioning | Tier-1+2 count | Priority |
|---------|-------------------|----------------|----------|
| (empty) | -                 | -              | -        |

## Open questions

Things to resolve with the user before authoring proceeds.

- (none yet)

## Authoring queue

Once consensus tracker shows clear winners, queue them here in priority order.

| Order | Pattern | Taxonomy slot | Reason for priority | Status |
|-------|---------|---------------|---------------------|--------|
| (empty) | - | - | - | - |

## Done log

Patterns shipped to `skills/agent-team/kb/architecture/`. Move entries here from authoring queue when PR merges.

| Pattern | Path | Shipped phase | manifest.json updated? |
|---------|------|---------------|------------------------|
| (none yet) | - | - | - |
