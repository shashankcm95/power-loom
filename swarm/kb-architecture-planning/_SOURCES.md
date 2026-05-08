# Source Log

Tracks sources processed during KB authoring. Each source tagged with quality tier; tier influences how its citations weight in authored docs.

## Quality tiers

| Tier | Description | Authority weight | Examples |
|------|-------------|-----------------|----------|
| **1** | Canonical industry texts | Direct authority — cited in authored docs | Designing Data-Intensive Applications (Kleppmann); Clean Architecture (Martin); A Philosophy of Software Design (Ousterhout); Domain-Driven Design (Evans); Software Architecture: The Hard Parts (Ford / Richards / Sadalage / Dehghani); Code Complete (McConnell); The Pragmatic Programmer (Thomas / Hunt) |
| **2** | Respected modern guides | Direct authority for newer / specialized topics | Microservices Patterns (Richardson); Building Evolutionary Architectures (Ford / Parsons / Kua); Refactoring (Fowler); Patterns of Enterprise Application Architecture (Fowler); framework-authoritative documentation (PostgreSQL docs, AWS architecture guidance, etc.) |
| **3** | Community curated | Consensus signal only — not cited as authority | High-traffic GitHub awesome-lists; well-maintained learning-notes repositories (e.g., keyvanakbary/learning-notes); curated dev-resource indices |
| **4** | Trend-aware | Signal but not authority | Blog posts, Medium articles, Stack Overflow accepted answers — useful for spotting emerging patterns or modern interpretations, but not citable in authored docs |

## Tier weighting rules

- **Tier 1** + **Tier 2** count toward both **consensus detection** AND **direct citation** in authored docs
- **Tier 3** + **Tier 4** count toward **consensus detection only** — they help confirm a pattern is recognized but their content does not carry authority
- A pattern needs at least 2 Tier-1+2 source citations to ship as an authored doc
- A Tier-3+4-only pattern can be noted but cannot ship without a Tier-1+2 anchor

## Sources processed

| Date | Source | Tier | URL/path | Sections covered | Notes |
|------|--------|------|----------|------------------|-------|
| (none yet) | - | - | - | - | - |

## Source queue (user-supplied; awaiting processing)

Patterns the user has flagged for ingestion in upcoming sessions. Add new entries to the bottom; remove when processed (move to "Sources processed" table above).

| Date added | URL / path | Tier estimate | User notes / focus area |
|------------|-----------|---------------|------------------------|
| (none yet) | - | - | - |

## Source-quality calibration log

Track how sources actually behaved vs initial tier estimate. If a source consistently surfaces noise / unverified claims / pop-engineering content, downgrade its tier or exclude.

| Source | Initial tier | Adjusted tier | Reason for adjustment |
|--------|--------------|---------------|----------------------|
| (none yet) | - | - | - |

## Excluded sources

Sources reviewed and rejected. Captured here so we don't re-evaluate them.

| Source | Reason for exclusion |
|--------|---------------------|
| (none yet) | - |

## Tips for efficient ingestion

(notes for the user on how to make source-passing efficient)

- **Specific URLs > whole repos**: passing `github.com/X/Y/blob/main/specific-chapter.md` costs much less than "look at repo X." Per-file granularity reduces fetch overhead and keeps me focused.
- **Pre-flag chapters/sections**: "Read Ousterhout chapters 4-6" beats "read Philosophy of Software Design." Saves session budget.
- **Pasted excerpts when feasible**: for sources where copy-paste is fine, that's the most efficient path. Reading text in conversation is faster than fetching URLs.
- **Tier estimate optional**: I can assess tier from source itself; user-supplied estimate is helpful but not required.
