---
last_updated: 2026-05-10T01:30:00-07:00
last_session_phase: HT.0.4 SHIPPED — personas + contracts audit complete
git_branch_at_last_save: main
git_commit_at_last_save: a8eea24
master_plan: swarm/thoughts/shared/plans/2026-05-09-HT.0-hardening-track-master-plan.md
master_plan_status: approved
v3_revision_pre_approval_run: ht0-master-plan-review-20260509-141613
v3_1_revision_pre_approval_run: ht0-master-plan-review-v3-20260509-143810
ht_0_1_research_artifact: swarm/thoughts/shared/research/2026-05-09-HT.0.1-hooks-audit.md
ht_0_2_research_artifact: swarm/thoughts/shared/research/2026-05-09-HT.0.2-substrate-scripts-audit.md
ht_0_3_research_artifact: swarm/thoughts/shared/research/2026-05-09-HT.0.3-slash-commands-audit.md
ht_0_4_research_artifact: swarm/thoughts/shared/research/2026-05-09-HT.0.4-personas-contracts-audit.md
---

# Hardening Track — Live State

## Where we are

**Master plan status: APPROVED.** **HT.0.1 SHIPPED.** **HT.0.2 SHIPPED.** **HT.0.3 SHIPPED.** **HT.0.4 SHIPPED.** Two rounds of parallel pre-approval verification on the plan plus first four audit phases complete:
- Round 1 (theo + nova on v2): 24 FLAGs surfaced (10 HIGH, 7 MEDIUM, 7 LOW); v3 absorbed all HIGH FLAGs + most MEDIUM/LOW
- Round 2 (ari + jade on v3): NEEDS-REVISION minor — 9 mechanical fixes + corrections; v3.1 absorbed all
- HT.0.1 hooks layer audit: 22 files inventoried, 5 quality bars applied, 8 active forcing-instruction markers verified in hooks layer (10 family-wide), 4 doc-staleness gaps surfaced, forbidden-phrase grep gate passed clean
- HT.0.2 substrate scripts audit: 27 files inventoried (9839 LoC; 2.81× HT.0.1 surface), 5 quality bars applied, 5 inline `parseFrontmatter` divergences post-H.8.7 mapped, subprocess invocation safety verified clean (no `execSync(string)` paths remain), kb-resolver/adr.js symlink-check parity verified (different shapes, same intent), forbidden-phrase grep gate passed clean
- HT.0.3 slash commands audit: 13 files inventoried (1089 LoC; 11% of HT.0.2 surface), 5 quality bars applied, all referenced scripts/agents/skills resolve (17+ scripts, 5 agents, 4 skills, plus install.sh + plan-template + compliance-probe), `commands/build-team.md` Step 1.5 (H.8.5) wiring intact, `commands/research.md` ↔ `commands/implement.md` (H.8.6) RPI workflow consistency verified, 5-convention path-reference inconsistency mapped, forbidden-phrase grep gate passed clean
- HT.0.4 personas + contracts audit: 33 files inventoried (2044 LoC; 21% of HT.0.2 surface), 5 quality bars applied, all 18 contract `kb_scope.default` refs resolve via kb-resolver, 13 functional + 6 antiPattern checks enumerated in contract-verifier, **`noCritiqueLanguage` antiPatternCheck unimplemented but referenced by all 3 documentary contracts (14/15/16) — H.3.6 dispatch path locks all documentary actor verdicts at `partial`**, master plan contract count off-by-one ("19" claimed, 18 actual), persona MD asymmetry for 14/15/16 surfaced per architect FLAG-2 (decision-required item for HT.0.9), forbidden-phrase grep gate passed clean **on first pass** (no rephrasing needed)

H.8.x cleanup arc complete (PRs #117-#121 merged). Soak counter at 0/N from H.8.x runtime track.

## Phase status snapshot

- [x] Master plan pre-approval round 1 (theo + nova; 24 FLAGs; NEEDS-REVISION)
- [x] Master plan v3 absorbing 9 unique HIGH FLAGs + MEDIUM/LOW
- [x] Master plan pre-approval round 2 (ari + jade; NEEDS-REVISION minor)
- [x] Master plan v3.1 absorbing mechanical fixes
- [x] Master plan status: approved (no third pre-approval per ari recommendation)
- [x] HT.0.1 — Hooks layer audit (22 files; 8 active forcing-instruction markers verified; 4 stated-vs-actual gaps surfaced; forbidden-phrase grep gate passed clean)
- [x] HT.0.2 — Substrate scripts audit (27 files; 5 inline `parseFrontmatter` divergences mapped; subprocess invocation surface clean; kb-resolver/adr.js symlink-check parity verified; 15 follow-up items for HT.0.9; forbidden-phrase grep gate passed clean)
- [x] HT.0.3 — Slash commands audit (13 files; all script/agent/skill references resolve; build-team Step 1.5 + research/implement RPI workflow verified; 5 path-reference conventions mapped; 13 follow-up items for HT.0.9; forbidden-phrase grep gate passed clean)
- [x] HT.0.4 — Personas + contracts audit (33 files: 18 contracts + 13 personas + super-agent.md; all 18 kb_scope.default refs resolve; documentary 14/15/16 asymmetry surfaced for HT.0.9 explicit decision; `noCritiqueLanguage` antiPatternCheck unimplemented gap mapped; master plan contract count off-by-one observed; 14 follow-up items for HT.0.9; forbidden-phrase grep gate passed clean on first pass)
- [ ] HT.0.5 — KB + pattern docs audit
- [ ] HT.0.6 — ADR system audit
- [ ] HT.0.7 — Tests + CI audit
- [ ] HT.0.8 — Cross-cutting four-dimensional audit
- [ ] HT.0.9 — Synthesis to prioritized refactor backlog
- [ ] (Optional) Chaos-test run before HT.2 to catch what audit missed
- [ ] HT.1.1 – HT.1.N — Execute backlog (top-15 max)
- [ ] HT.2 — Final docs/README sweep
- [ ] Soak gate after HT.2 (5+ clean phases before H.9.x)

## Latest artifacts (research + plans + commits)

- Master plan: `swarm/thoughts/shared/plans/2026-05-09-HT.0-hardening-track-master-plan.md` (status: APPROVED v3.1)
- Round-1 reviews: `swarm/run-state/ht0-master-plan-review-20260509-141613/{theo,nova}.md`
- Round-2 reviews: `swarm/run-state/ht0-master-plan-review-v3-20260509-143810/{ari,jade}.md`
- HT.0.1 research artifact: `swarm/thoughts/shared/research/2026-05-09-HT.0.1-hooks-audit.md` (22 files inventoried; documentary; forbidden-phrase grep gate passed)
- HT.0.2 research artifact: `swarm/thoughts/shared/research/2026-05-09-HT.0.2-substrate-scripts-audit.md` (27 files inventoried; documentary; forbidden-phrase grep gate passed)
- HT.0.3 research artifact: `swarm/thoughts/shared/research/2026-05-09-HT.0.3-slash-commands-audit.md` (13 files inventoried; documentary; forbidden-phrase grep gate passed)
- HT.0.4 research artifact: `swarm/thoughts/shared/research/2026-05-09-HT.0.4-personas-contracts-audit.md` (33 files inventoried; documentary; forbidden-phrase grep gate passed clean on first pass)
- Sub-plans: none yet (HT.0.9 produces first refactor backlog at `swarm/thoughts/shared/plans/2026-05-XX-HT.1-refactor-backlog.md`)
- Last shipped: HT.0.4 commit (in this session) on `main` (will land at the cutover commit below)

## Open questions / blockers

None blocking. HT.0.1 + HT.0.2 + HT.0.3 + HT.0.4 shipped clean. HT.0.5a (KB + pattern docs audit) ready in next session, followed sequentially by HT.0.5b.

Soft items for HT-end retrospective:
1. HT-state.md actually load-bearing? (theo FLAG-8 punt) — HT.0.1 + HT.0.2 + HT.0.3 + HT.0.4 dogfood: state file served as resume anchor in all four sessions (HT.0.2 + HT.0.3 ran continuous post-/compact via "continue" prompts; HT.0.4 ran post-/compact via "continue"). Consistent evidence for keep across 4 phases.
2. Forbidden-phrase grep false-positive rate? (jade FLAG-3 + ari NEW-1) — HT.0.1 result: 2 matches, both legitimate (rephrased). HT.0.2 result: 2 matches, both legitimate (one paraphrased master-plan quote; one swapped "must be" → "is found as"). HT.0.3 result: 5 matches in initial sweep — 4 used "broken" from the literal master-plan special-focus bullet ("no broken refs") + 1 used "need to" inside a literal rule-file quote. All 5 paraphrased to documentary form. **HT.0.4 result: 0 matches on first pass — first phase to author clean without rephrasing.** Empirical FP rate after 4 phases: 0/9 (all 9 prior matches were real critique-language slips warranting rephrasing; HT.0.4 contributes 0 to numerator and denominator). Continue tracking.
3. HT.0.5a → HT.0.5b sequencing actually 90-120 min? (ari NEW-3 — empirical answer at HT.0.5b end)
4. Top-15 cap survives empirical pressure? (theo FLAG-6 / nova FLAG-6 — empirical answer at HT.0.9). HT.0.1: 15 items. HT.0.2: 15 items. HT.0.3: 13 items. HT.0.4: 14 items. 4-phase total: 57 follow-up items pre-deduplication. Many HT.0.4 items cross-reference HT.0.1/HT.0.2/HT.0.3 patterns (multi-responsibility variant, pre-H-phase-tag era cohort, path-convention divergence, claim-vs-implementation gaps) — HT.0.9 dedup will compress significantly.
5. Decision on running optional chaos-test between HT.1.N completion and HT.2

## HT.0.1 follow-up items (for HT.0.9 synthesis)

15 follow-up questions surfaced in `## Follow-up questions for plan phase` section of the HT.0.1 research artifact. Highlights:

- **Mechanical doc fixes** (3): ADR-0001 `files_affected` list (14→16); `_lib/settings-reader.js:3` references retired `plugin-loaded-check.js`; `verify-plan-gate.js:16,139` "11th forcing instruction" stale (actual is 10 family-wide).
- **Stale config artifact** (1): `hooks/settings-reference.json` missing 3 entries + 1 matcher mismatch vs canonical `hooks.json` — deletion-or-update decision for HT.0.9.
- **DRY refactor candidates** (3): `resolveSelfImproveScript` × 3 copies; `hasH2Heading` × 2 copies; inline lock primitive in `session-end-nudge.js` vs `_lib/lock.js` shared.
- **Speculative-API exports** in 3 of 3 `_lib/` modules: 7 named exports total have 0 external callers.
- **Subprocess density** in `auto-store-enrichment.js`: worst-case 22 sequential `spawnSync` per Stop event.
- **Multi-responsibility hooks** (3): auto-store-enrichment, pre-compact-save, session-reset each bundle distinct responsibilities at one lifecycle entrypoint — articulate-or-split decision for HT.0.9.
- **Regex-compile-per-call**: 5 sites recompiling regex per fire (validate-plan-schema, verify-plan-gate, validate-kb-doc, auto-store-enrichment, prompt-enrich-trigger).
- **ADR-0001 invariant 3 phrasing nit**: `session-end-nudge.js:130,142` uses event names like `state_save_failed` instead of literal `error` — tighten hook or relax ADR wording.

## HT.0.2 follow-up items (for HT.0.9 synthesis)

15 follow-up questions surfaced in `## Follow-up questions for plan phase` section of the HT.0.2 research artifact. Highlights:

- **DRY divergence post-`_lib/frontmatter.js`** (5 inline copies): `pattern-runner.js:41-56`, `swarm/hierarchical-aggregate.js:63-80`, `contract-verifier.js:41-51`, `contracts-validate.js:56-71`. Refactor candidate.
- **DRY divergence post-`_lib/lock.js`** (1 inline + 2 try-fallback): `prompt-pattern-store.js:65-114` own primitive (5000ms timeout, 30000ms stale, openSync 'wx' style); `spawn-recorder.js` + `self-improve-store.js` try-fallback paths.
- **Multi-responsibility files** (3): `agent-identity.js` (1698 LoC, 5 responsibilities); `contract-verifier.js` (628 LoC, 6 responsibilities); `contracts-validate.js` (796 LoC, 8 named validators) — articulate-or-split decisions for HT.0.9.
- **`agent-identity.js` 2.12× envelope** (1698 LoC vs 800 max): bundles registry CRUD + verdict recording + trust-score computation + verification-policy + lifecycle (prune/unretire/breed). Special-focus item.
- **Inline data density** (master plan special focus): `architecture-relevance-detector.js` 290 of 538 LoC is `ROUTING_RULES` array; `route-decide.js` ~100 LoC is `KEYWORDS` dict + `SUBSTRATE_META_TOKENS`. Externalize-to-JSON decision for HT.0.9.
- **`agent-identity.js` top docstring stale**: lists 5 of 12 subcommands (predates H.6.6/H.7.0). Mechanical-fix.
- **Per-call regex compilation in `route-decide.js`**: ~90 compiles per `scoreTask` invocation via `buildKeywordRegex` recompilation. Pre-compiled cache opportunity.
- **`adr.js` per-call full-tree read**: ~400 file reads per session via `validate-adr-drift.js` Edits. Cache opportunity.
- **`contracts-validate.js` 4× pattern-file reads**: when running 4 pattern-status validators in same invocation. Cache opportunity.
- **State-file env-override missing** (3 scripts): `scripts/self-improve-store.js`, `scripts/prompt-pattern-store.js`, `scripts/quality-factors-backfill.js` (SPAWN_HISTORY field) lack `HETS_X_PATH` overrides while peer scripts (`agent-identity`, `pattern-recorder`, `spawn-recorder`) follow the convention.
- **`swarm/aggregate.js` + `swarm/hierarchical-aggregate.js` use `__dirname`**: no `findToolkitRoot()` adoption; no env override for `run-state/` location. Refactor candidate.
- **6 scripts with `module.exports` and no in-scope external callers**: `verify-plan-spawn.js`, `adr.js`, `build-spawn-context.js`, `architecture-relevance-detector.js`, plus `agent-identity.js` constants surfaced only via `__test_internals__`. Speculative-API pattern; verify scope-wider at HT.0.3 + HT.0.7.
- **kb-resolver vs adr.js symlink-check parity** (master plan special focus, verified): different shapes (kb-resolver canonicalizes + bounds; adr.js forbids symlinks unconditionally), same intent (defend against symlink-escape). Documentary item.
- **`weight-fit.js` THEORY_WEIGHTS vs `agent-identity.js` WEIGHTS divergence** (file_citations_per_finding 0.10 vs 0.135): intentional per `weight-fit.js` purpose ("compare empirical weights to theory-driven priors"). Documentary item.
- **`prompt-pattern-store.js` Phase-X tag era**: predates H.x convention; last-touched at Phase-G2. Documentary item.

## HT.0.3 follow-up items (for HT.0.9 synthesis)

13 follow-up questions surfaced in `## Follow-up questions for plan phase` section of the HT.0.3 research artifact. Highlights:

- **`commands/build-team.md` 322 LoC bundles 6 responsibilities** (parallel to HT.0.1 hooks finding + HT.0.2 `agent-identity.js` finding): route-decide gate + pre-flight + spawn-context auto-extension + tech-stack-analyzer + per-identity verification (3 trust-tier branches) + capability-request handling. Articulate-or-split decision for HT.0.9.
- **Path-reference convention inconsistency** (5 distinct conventions across 13 files): repo-relative, hardcoded author-machine, `$HOME`-aware, relative-path (`../`), deployed-marketplace. `chaos-test.md` mixes hardcoded author-machine + deployed-marketplace in same file. Consolidation candidate.
- **7 commands lack explicit When-to-use sections**: `security-audit.md`, `review.md`, `prune.md`, `evolve.md`, `forge.md`, `self-improve.md`, `chaos-test.md`. Predate H.7.x convention.
- **4 commands lack What-this-is-NOT sections**: same predates-H.7.x cohort. Mechanical-fix.
- **7 commands carry no phase tags**: same cohort. Documentary observation; matches HT.0.2's `prompt-pattern-store.js` Phase-X-tag era pattern.
- **`commands/self-improve.md` predates H.4.1 auto-loop**: command doc describes only the explicit triage workflow; no forward-link to H.4.1 hook-based auto-loop. Mechanical-fix candidate.
- **`commands/forge.md` + `evolve.md` document hardcoded author-machine paths** for both-locations-write pattern: `~/Documents/claude-toolkit/...`. Substrate scripts use `findToolkitRoot()` for runtime resolution; docs use author-path as readable convention. Documentary observation.
- **Command token cost spread**: 33.3× between smallest (`security-audit` ~150 tokens) and largest (`build-team` ~5000 tokens). `build-team.md` is ~45% embedded bash. Externalize-or-collapse decision for HT.0.9 (parallel to HT.0.2's inline-data observations).
- **`commands/research.md:54-56` references documentary personas 14/15/16**: cross-reference for HT.0.4 inventory (the persona MD asymmetry per architect FLAG-2).
- **`commands/chaos-test.md:80` uses `~/.claude/scripts/compliance-probe.sh`** while same file uses `~/Documents/claude-toolkit/scripts/agent-team/...` at lines 18, 21, 24. Two-path convention in same file. Consolidation candidate.
- **`commands/security-audit.md` and `review.md` are minimal (11-12 LoC)**: thin-delegate pattern. Documentary observation.
- **Command cross-reference patterns vary**: H.7.x and H.8.x era commands use relative paths (`../skills/X/SKILL.md`); older commands use repo-relative or external references. Documentary observation.
- **Build-team Step 1.5 H.8.5 wiring + research/implement H.8.6 RPI consistency both verified intact** (master plan special focus). Documentary item.

## HT.0.4 follow-up items (for HT.0.9 synthesis)

14 follow-up questions surfaced in `## Follow-up questions for plan phase` section of the HT.0.4 research artifact. Highlights:

- **`noCritiqueLanguage` antiPatternCheck unimplemented**: `scripts/agent-team/contract-verifier.js:376-448` antiPatternChecks block lacks the check; all 3 documentary contracts (14/15/16) reference it. H.3.6 dispatch path produces `unknown_check` warn → all documentary actor outputs verdict at `partial`. Implement-vs-codify-as-ADR decision for HT.0.9.
- **`noDuplicateFindingIds` antiPatternCheck implemented but unreferenced**: `contract-verifier.js:439-447` defines the function; zero contract references. Dead-code-removal vs add-to-contracts decision for HT.0.9.
- **Master plan contract count off-by-one**: master plan v3.1 lines 56 + 273 claim "19 contracts"; filesystem evidences 18. Master-plan mechanical fix.
- **Documentary persona MD asymmetry (architect FLAG-2 explicit decision)**: 14/15/16 contracts present; persona MDs absent. Options (a) author MDs, (b) document why no MDs, (c) hybrid stubs — HT.0.9 selects.
- **Documentary persona roster registration absence**: 14/15/16 not in `agent-identity.js:30-46` DEFAULT_ROSTERS; contracts have fixed `persona` field (vs challenger/engineering-task `<set-at-spawn>` shape). Register-rosters vs add-`<set-at-spawn>`-shape vs accept-as-design decision for HT.0.9.
- **`05-honesty-auditor.md:19` literal session-specific transcript path**: embeds an absolute path with a particular `75cc079e-...` session ID. Mechanical-fix candidate (replace with placeholder).
- **`01-hacker.md` + `03-code-reviewer.md` stale path**: both reference `~/Documents/claude-toolkit/hooks/scripts/prompt-pattern-store.js`; actual file at `scripts/prompt-pattern-store.js`. Mechanical-fix.
- **Builder persona MD template divergence**: 6 abbreviated (07-12, 35-37 LoC) + 7 full (01-06, 13, 88-155 LoC). Normalize-vs-accept decision for HT.0.9.
- **04-architect.md H.6.5 convention as cross-layer claim**: documented at persona MD + commands + scripts + pattern-doc levels; integration verified intact. Documentary observation.
- **Pre-H-phase-tag persona cohort**: 01, 02, 03, 05 predate H.x phase numbering (May 1 last-modified). Cross-phase pattern with HT.0.2 + HT.0.3 same-era findings.
- **`02-confused-user.md` mixed path conventions in same file**: line 13 hardcoded author-machine; line 40 deployed-marketplace. Cross-cutting consolidation candidate.
- **Frontmatter field-requirement asymmetry across persona classes**: auditor + documentary require 5 fields; builder + challenger + engineering-task require 6 (add `identity`). Aligns with roster-registration finding.
- **5 contracts use `_doc` / `_documentary_note` underscore-prefix metadata**: not consumed by `contract-verifier.js`; serve as inline documentation. Documentary observation.
- **Per-call regex compilation in contract-verifier checks** (4 sites): `hasSeveritySections:224`, `noEmptyChallengeSection:300`, `noTemplateRepetition:392`, `claimsHaveEvidence:409`. Same shape as HT.0.1 hook-layer pattern; cost amortization differs (verifier fires once-per-actor vs hook fires per-stdin-event). Documentary observation.

## Next concrete step

**Begin HT.0.5a — KB + pattern docs audit.** Per master plan v3.1 methodology (note: HT.0.5a + HT.0.5b sequencing per ari NEW-3 — sequential, not parallel; 5a-first because 5b cross-references pattern docs whose status accuracy is determined in 5a; total combined wallclock 90-120 min):

1. New session: read `swarm/thoughts/shared/HT-state.md` (this file) — confirm HT.0.1 + HT.0.2 + HT.0.3 + HT.0.4 shipped status
2. Read `swarm/thoughts/shared/plans/2026-05-09-HT.0-hardening-track-master-plan.md` — full master plan in context (HT.0.5a scope at line 300-312)
3. Optional: skim HT.0.1-4 research artifacts for cross-references (HT.0.4's research artifact captures persona-pattern bridge gap as out-of-scope-but-flagged; HT.0.2 audited kb-resolver.js)
4. Inventory the files in scope:
   - `skills/agent-team/kb/architecture/**.md` (10 architecture KB docs)
   - `skills/agent-team/kb/hets/*.md` + other kb subtrees (`mobile-dev/`, `backend-dev/`, `web-dev/`, `infra-dev/`, `ml-dev/`, `data-dev/`, `security-dev/`)
   - `skills/agent-team/patterns/*.md` (20 patterns)
   - `skills/agent-team/patterns/README.md` (the pattern table)
5. Apply 5 quality bars (same methodology as HT.0.1 + HT.0.2 + HT.0.3 + HT.0.4)
6. Special focus per master plan: every kb/architecture/ doc has H.8.0 tier structure (Summary / Quick Reference / Full body); H.8.8 hook now enforces this on Edit but pre-existing docs may have drift; bidirectional `related:` invariant clean (H.8.6 took violations 18 → 0; verify still 0); pattern `status:` accuracy (cs3 Track 1 found 9/13 patterns stuck at `implementing` despite shipping); pattern table in README.md matches frontmatter `status:` field of each pattern doc; KB tier-token-target measurements valid (the chaos quinn flagged "80/15/5 mix" as upgraded from "Estimated" to "Realistic" without empirical basis — has empirical telemetry materialized?); SKILL.md phase entries deferred to HT.0.5b
7. **Circular-dependency disclosure (per architect DIP non-checkmark, master plan line 312)**: HT.0.5a is auditing the 10 KB architecture docs that the OTHER audit phases use as yardsticks. Quality bar is structural (tier compliance, status accuracy, bidirectional `related:`) rather than principle correctness — we audit the docs' shape, not their truth.
8. Author research artifact at `swarm/thoughts/shared/research/2026-05-XX-HT.0.5a-kb-patterns-audit.md`
9. Run forbidden-phrase grep gate before marking phase `[x]`
10. Update HT-state.md cutover routine before session ends; chain HT.0.5b methodology entry pointing at SKILL.md + standalone skill packages

**Resume tip from HT.0.4 dogfood**: HT.0.4's parallel-batch reads (18 contracts + super-agent.md + agent-identity.js section in batch 1; 13 persona MDs in batch 2) worked cleanly (2044 LoC across 33 files). HT.0.5a has 10 KB architecture docs + ~20 pattern docs + ~10 hets/* + ~14 stack-specific kb docs ≈ ~54 files. Plan 2-3 parallel batches; KB docs are typically larger (200-600 LoC for full architecture docs vs 100-200 for patterns).

**/compact recommendation before starting HT.0.5a**: this session lands at ~70-80% post-cutover (HT.0.4 audit was smaller than HT.0.2 but ran without /compact between HT.0.3 and HT.0.4). HT.0.5a's expected surface (~54 files) is the largest planned audit phase. **Recommend /compact before HT.0.5a begins** to give the audit a fresh budget.

**Cumulative token cost expected for HT.0.5a**: ~25-35% utilization at start (state + master plan reads); ~70-80% at end if 54 files materialize at 200-LoC average. Largest planned audit phase by file count; comparable to HT.0.2's surface but more parallel-batched.

## Drift-notes captured this run

HT.0.1 surfaced no NEW drift-notes (the 15 follow-up items are all already-known forms — DRY duplicates, doc staleness, multi-responsibility bundling at lifecycle entrypoints, speculative-API exports). All 15 land at HT.0.9 synthesis for categorization (ADR-update / mechanical-fix / refactor-candidate / accept-and-document).

**Pattern-level observation from HT.0.1**: 4 of 4 documentation drift findings (ADR-0001 stale list, settings-reference.json stale, _lib/settings-reader.js comment stale, verify-plan-gate.js comment stale) are doc-side staleness — code shipped but downstream docs/comments did not update. Suggests an HT.2-or-earlier mechanical pass for all "stated source vs current actual" reconciliation. Captured here for HT.0.9 / HT.2 input.

HT.0.2 surfaced no NEW drift-notes — the 15 follow-up items extend the same already-known forms identified in HT.0.1 (DRY divergence, multi-responsibility bundling, speculative-API exports, doc staleness, inline-data sizing). All 15 land at HT.0.9 synthesis.

**Pattern-level observation from HT.0.2**: The DRY divergence pattern is the dominant cross-cutting theme. `_lib/frontmatter.js` (H.8.7) has 5 inline copies post-extraction; `_lib/lock.js` (H.3.2) has 1 inline + 2 try-fallback consumers. Each `_lib/` extraction reduces but does not eliminate divergence — adoption is partial across the substrate-scripts family. Cross-cutting refactor candidate at HT.0.9: a single audit-and-mechanical-replace pass for each extracted helper (`parseFrontmatter`, `withLock`, `findToolkitRoot`).

**Pattern-level observation from HT.0.2 (subprocess invocation surface)**: clean. The H.8.4 fix (`_lib/safe-exec.js`) eliminated all string-build `execSync` paths; remaining subprocess sites use array-form `spawn`/`spawnSync`/`execFileSync` (safe-by-construction). No new safety findings.

HT.0.3 surfaced no NEW drift-notes — the 13 follow-up items extend the same already-known forms identified in HT.0.1 + HT.0.2 (multi-responsibility bundling, inline-data sizing, doc staleness, Phase-X-tag era predating H.x). All 13 land at HT.0.9 synthesis.

**Pattern-level observation from HT.0.3 (path-reference convention)**: 5 distinct path conventions in use across `commands/*.md` — repo-relative, hardcoded author-machine, `$HOME`-aware, relative-path (`../`), deployed-marketplace. `chaos-test.md` mixes two of them in the same file. The substrate scripts (HT.0.2) use `findToolkitRoot()` for runtime resolution; the command docs use a mix of conventions for human-readable references. Cross-cutting consolidation candidate at HT.0.9.

**Pattern-level observation from HT.0.3 (no broken refs)**: All script/agent/skill references resolve. The H.8.4 + H.8.5 wiring (build-spawn-context, build-team Step 1.5) is intact. The H.8.6 RPI workflow (research → plan → implement) is consistent end-to-end. The substrate is internally well-linked despite the convention diversity above.

HT.0.4 surfaced no NEW drift-notes — the 14 follow-up items extend the same already-known forms identified in HT.0.1 + HT.0.2 + HT.0.3 (claim-vs-implementation gaps, dead-code candidates, doc staleness, path-convention divergence, pre-H-phase-tag era, frontmatter-shape divergence). All 14 land at HT.0.9 synthesis.

**Pattern-level observation from HT.0.4 (claim-vs-implementation gap, severe form)**: `noCritiqueLanguage` antiPatternCheck is referenced by all 3 documentary contracts (14/15/16) at `swarm/personas-contracts/14-codebase-locator.contract.json:35` etc., but the implementation is absent from `scripts/agent-team/contract-verifier.js:376-448`. The H.3.6 `unknown_check` dispatch path (added precisely to prevent silent passes) instead surfaces the gap as `antiPatternWarns` increment, locking every documentary actor verdict at `partial`. The H.3.6 fix is working as designed; the gap is upstream — the contract claim has no runtime enforcement. HT.0.9 implement-vs-codify-as-ADR decision.

**Pattern-level observation from HT.0.4 (documentary persona class incomplete)**: The 14/15/16 documentary persona class diverges from both the auditor class (no roster registration; persona MDs absent) AND the shared class (challenger/engineering-task use `<set-at-spawn>` persona; documentary uses fixed persona with no roster). The class shape is consistent within the 3 documentary contracts but differs from peer classes in 3 dimensions: (1) no roster, (2) no persona MD, (3) unimplemented antiPattern check. HT.0.9 categorization either resolves this as a 4th-class shape (codify) or as 3 separate gaps to close.

**Cross-phase observation (HT.0.1 + HT.0.2 + HT.0.3 + HT.0.4)**: The multi-responsibility pattern continues for the first 3 phases (3 hooks → 3 scripts → 1 command) but **does not repeat in HT.0.4** — contracts are uniformly small (36-57 LoC each), and the largest persona MD (04-architect at 155 LoC) bundles convention consistent with the architect's role rather than entry-point accretion. The pattern is "lifecycle-entry-point-accretion," not "always-largest-file-bundles-multi-responsibility." HT.0.4 shows the inverse: persona MDs partition cleanly along the auditor/builder/documentary class axis.

**Cross-phase observation (claim-vs-implementation gaps, escalating)**: HT.0.1 found 4 gaps (all doc-side staleness — comments, ADR-0001 list, settings-reference); HT.0.4 finds 2 gaps with semantic weight (master-plan count off-by-one is mechanical; `noCritiqueLanguage` unimplemented locks documentary verdicts at `partial`). The pattern shows variance — most gaps are mechanical doc-staleness; one (HT.0.4 E.2) is structural and impacts runtime verdict.

## Cumulative token cost so far

(Tracked at end of each session for empirical context-discipline data; informs whether the FIC 40-60% target is realistic given HT phase shape.)

- Session of 2026-05-09 (master plan authoring + state-file authoring): ~70% utilization at end
- Session of 2026-05-09 continued (parallel pre-approval verification on master plan + state-file update): ~75-80% utilization at end.
- Session of 2026-05-09 final (v3 absorption + second-pass parallel verification + v3.1 mechanical fixes + approval): ~85-90% utilization at end. **Two pre-approval rounds (4 spawns total) shipped without compacting between them.** Real-world FIC test summary: meta-session shape (plan-authoring + spawn-coordination + revision-authoring) genuinely cannot stay under 60% in current discipline. Architect FLAG-12 carve-out validated with real data.
- Session of 2026-05-09 post-/compact (HT.0.1 hooks layer audit): ~50-55% utilization at end. Started fresh post-/compact; read HT-state.md + master plan section + research README + 22 hook-layer files; ran 5-bar walkthrough; authored ~600-line research artifact; passed forbidden-phrase grep gate (2 matches, both legitimately rephrased to documentary form). Stayed under 60% FIC ceiling for an audit-shape phase. **First empirical data point that an audit phase fits a single session without /compact when started clean.**
- Session of 2026-05-09 post-/compact (HT.0.2 substrate scripts audit): ~65-70% utilization at end. Started fresh post-/compact; read HT-state.md (cached from prior session) + master plan section + 27 files (9839 LoC; 2.81× HT.0.1 surface) in 5 parallel batches; ran 5-bar walkthrough; authored ~430-line research artifact; passed forbidden-phrase grep gate (2 matches, both legitimately rephrased — one paraphrased a master-plan quote, one swapped "must be" for "is found as"). Crossed 60% ceiling near artifact-authoring; landed at ~70% post-cutover. **Empirical data point: audit phases at 2.5-3× the HT.0.1 LoC surface land at 65-70% (above the 60% FIC ceiling). HT.0.3 is smaller (~12 markdown files vs 27 JS files); expect return to HT.0.1 envelope. The 60% target holds for typical audit shapes; large-LoC audit phases overshoot by ~10%.**
- Session of 2026-05-09 continued (HT.0.3 slash commands audit, no /compact between HT.0.2 and HT.0.3): ~75-80% utilization at end. Continued from HT.0.2 ship state at ~70%; read 13 command files (1089 LoC; 11% of HT.0.2 surface) in single parallel-13 batch; ran 5-bar walkthrough; authored ~340-line research artifact; passed forbidden-phrase grep gate (5 matches, all legitimately rephrased: 4 used "broken" from literal master-plan bullet wording, 1 used "need to" inside a literal rule-file quote). Pre-cutover HT.0.3 was at ~75%; post-cutover ~80%. **Empirical data point: running TWO consecutive audit phases without /compact between them (HT.0.2 9839 LoC + HT.0.3 1089 LoC) lands at ~75-80% — above 60% ceiling but under context wall. The HT.0.3 small-surface advantage was partially absorbed by the carry-over from HT.0.2. Recommended discipline: /compact between consecutive audit phases when the prior phase exceeded 2× HT.0.1 surface. HT.0.4's larger expected surface (~33 files: 19 contracts + 13 personas + super-agent.md) suggests /compact before HT.0.4 starts.**
- Session of 2026-05-10 post-/compact (HT.0.4 personas + contracts audit): ~70-75% utilization at end. Started fresh post-/compact; read HT-state.md + master plan section + 33 files (2044 LoC: 18 contracts + 13 persona MDs + super-agent.md + 200-line agent-identity.js section + 175-line contract-verifier section) in 2 parallel batches (19 + 13); ran 5-bar walkthrough; authored ~315-line research artifact; passed forbidden-phrase grep gate **clean on first pass** (0 matches, no rephrasing needed — first HT phase to do so). Empirical FP rate after 4 phases: 0/9 (HT.0.4 contributes 0 to numerator). **Empirical data point: post-/compact-fresh audit phase at 21% of HT.0.2 surface (2044 vs 9839 LoC) but with deeper conceptual analysis (cross-class shape divergence, claim-vs-implementation gap with severity weight) lands at ~70-75% — between HT.0.1 fresh-clean (~50-55%) and HT.0.2 fresh-clean (~65-70%). The 60% target holds for small audit phases (HT.0.1, HT.0.3-fresh); larger or deeper-analysis phases overshoot by 10-15%. /compact before HT.0.4 was the right call empirically.** Master plan special-focus item E.2 (`noCritiqueLanguage` claim-vs-implementation) is the most semantically weighty gap surfaced across 4 phases.
