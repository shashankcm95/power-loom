---
last_updated: 2026-05-09T22:50:00-07:00
last_session_phase: HT.0.2 SHIPPED — substrate scripts audit complete
git_branch_at_last_save: main
git_commit_at_last_save: 4ee35e5
master_plan: swarm/thoughts/shared/plans/2026-05-09-HT.0-hardening-track-master-plan.md
master_plan_status: approved
v3_revision_pre_approval_run: ht0-master-plan-review-20260509-141613
v3_1_revision_pre_approval_run: ht0-master-plan-review-v3-20260509-143810
ht_0_1_research_artifact: swarm/thoughts/shared/research/2026-05-09-HT.0.1-hooks-audit.md
ht_0_2_research_artifact: swarm/thoughts/shared/research/2026-05-09-HT.0.2-substrate-scripts-audit.md
---

# Hardening Track — Live State

## Where we are

**Master plan status: APPROVED.** **HT.0.1 SHIPPED.** **HT.0.2 SHIPPED.** Two rounds of parallel pre-approval verification on the plan plus first two audit phases complete:
- Round 1 (theo + nova on v2): 24 FLAGs surfaced (10 HIGH, 7 MEDIUM, 7 LOW); v3 absorbed all HIGH FLAGs + most MEDIUM/LOW
- Round 2 (ari + jade on v3): NEEDS-REVISION minor — 9 mechanical fixes + corrections; v3.1 absorbed all
- HT.0.1 hooks layer audit: 22 files inventoried, 5 quality bars applied, 8 active forcing-instruction markers verified in hooks layer (10 family-wide), 4 doc-staleness gaps surfaced, forbidden-phrase grep gate passed clean
- HT.0.2 substrate scripts audit: 27 files inventoried (9839 LoC; 2.81× HT.0.1 surface), 5 quality bars applied, 5 inline `parseFrontmatter` divergences post-H.8.7 mapped, subprocess invocation safety verified clean (no `execSync(string)` paths remain), kb-resolver/adr.js symlink-check parity verified (different shapes, same intent), forbidden-phrase grep gate passed clean

H.8.x cleanup arc complete (PRs #117-#121 merged). Soak counter at 0/N from H.8.x runtime track.

## Phase status snapshot

- [x] Master plan pre-approval round 1 (theo + nova; 24 FLAGs; NEEDS-REVISION)
- [x] Master plan v3 absorbing 9 unique HIGH FLAGs + MEDIUM/LOW
- [x] Master plan pre-approval round 2 (ari + jade; NEEDS-REVISION minor)
- [x] Master plan v3.1 absorbing mechanical fixes
- [x] Master plan status: approved (no third pre-approval per ari recommendation)
- [x] HT.0.1 — Hooks layer audit (22 files; 8 active forcing-instruction markers verified; 4 stated-vs-actual gaps surfaced; forbidden-phrase grep gate passed clean)
- [x] HT.0.2 — Substrate scripts audit (27 files; 5 inline `parseFrontmatter` divergences mapped; subprocess invocation surface clean; kb-resolver/adr.js symlink-check parity verified; 15 follow-up items for HT.0.9; forbidden-phrase grep gate passed clean)
- [ ] HT.0.3 — Slash commands audit
- [ ] HT.0.4 — Personas + contracts audit
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
- Sub-plans: none yet (HT.0.9 produces first refactor backlog at `swarm/thoughts/shared/plans/2026-05-XX-HT.1-refactor-backlog.md`)
- Last shipped: HT.0.1 commit `4ee35e5` on `main`

## Open questions / blockers

None blocking. HT.0.1 + HT.0.2 shipped clean. HT.0.3 (slash commands audit) ready in next session.

Soft items for HT-end retrospective:
1. HT-state.md actually load-bearing? (theo FLAG-8 punt) — HT.0.1 + HT.0.2 dogfood: state file served as resume anchor post-/compact in both sessions; consistent evidence for keep across 2 phases.
2. Forbidden-phrase grep false-positive rate? (jade FLAG-3 + ari NEW-1) — HT.0.1 result: 2 matches, both legitimate (rephrased). HT.0.2 result: 2 matches, both legitimate (one paraphrased master-plan quote; one swapped "must be" → "is found as"). Empirical FP rate after 2 phases: 0/4 (all 4 were real critique-language slips that warranted rephrasing). Continue tracking.
3. HT.0.5a → HT.0.5b sequencing actually 90-120 min? (ari NEW-3 — empirical answer at HT.0.5b end)
4. Top-15 cap survives empirical pressure? (theo FLAG-6 / nova FLAG-6 — empirical answer at HT.0.9). HT.0.2 surfaced 15 follow-up items (same count as HT.0.1). 2-phase total: 30 follow-up items pre-deduplication. Some HT.0.2 items extend HT.0.1 patterns (DRY divergence, multi-responsibility) — HT.0.9 dedup will compress.
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

## Next concrete step

**Begin HT.0.3 — Slash commands audit.** Per master plan v3.1 methodology:

1. New session: read `swarm/thoughts/shared/HT-state.md` (this file) — confirm HT.0.1 + HT.0.2 shipped status
2. Read `swarm/thoughts/shared/plans/2026-05-09-HT.0-hardening-track-master-plan.md` — full master plan in context (HT.0.3 scope at line 254)
3. Optional: skim HT.0.1 + HT.0.2 research artifacts for cross-references (some commands invoke audited substrate scripts — e.g. `commands/build-team.md` invokes `agent-identity.js`, `route-decide.js`, `build-spawn-context.js`)
4. Inventory the ~12 command files: `commands/*.md` (build-plan, build-team, chaos-test, evolve, forge, implement, plan, prune, research, review, security-audit, self-improve, verify-plan)
5. Apply 5 quality bars (same methodology as HT.0.1 + HT.0.2)
6. Special focus per master plan: each command's documented flow references actual scripts/files (no broken refs); command-to-callsite mapping; `commands/build-team.md` Step 1.5 (H.8.5) wiring intact; `commands/research.md` + `commands/implement.md` (H.8.6) workflow consistency; deprecated patterns flagged; token budget per command
7. Author research artifact at `swarm/thoughts/shared/research/2026-05-XX-HT.0.3-slash-commands-audit.md`
8. Run forbidden-phrase grep gate before marking phase `[x]`
9. Update HT-state.md cutover routine before session ends

**Resume tip from HT.0.2 dogfood**: HT.0.3 has FEWER files than HT.0.1/HT.0.2 (~12 vs 22 vs 27) but each is markdown documentation (typically 50-300 LoC). Read 3-4 in parallel batches; budget similar to HT.0.1.

**Cumulative token cost expected for HT.0.3**: ~15-25% utilization at start (state + master plan reads); ~40-50% at end (fewer files than prior phases; markdown is typically less LoC-dense than JS). Comfortably under FIC ceiling.

## Drift-notes captured this run

HT.0.1 surfaced no NEW drift-notes (the 15 follow-up items are all already-known forms — DRY duplicates, doc staleness, multi-responsibility bundling at lifecycle entrypoints, speculative-API exports). All 15 land at HT.0.9 synthesis for categorization (ADR-update / mechanical-fix / refactor-candidate / accept-and-document).

**Pattern-level observation from HT.0.1**: 4 of 4 documentation drift findings (ADR-0001 stale list, settings-reference.json stale, _lib/settings-reader.js comment stale, verify-plan-gate.js comment stale) are doc-side staleness — code shipped but downstream docs/comments did not update. Suggests an HT.2-or-earlier mechanical pass for all "stated source vs current actual" reconciliation. Captured here for HT.0.9 / HT.2 input.

HT.0.2 surfaced no NEW drift-notes — the 15 follow-up items extend the same already-known forms identified in HT.0.1 (DRY divergence, multi-responsibility bundling, speculative-API exports, doc staleness, inline-data sizing). All 15 land at HT.0.9 synthesis.

**Pattern-level observation from HT.0.2**: The DRY divergence pattern is the dominant cross-cutting theme. `_lib/frontmatter.js` (H.8.7) has 5 inline copies post-extraction; `_lib/lock.js` (H.3.2) has 1 inline + 2 try-fallback consumers. Each `_lib/` extraction reduces but does not eliminate divergence — adoption is partial across the substrate-scripts family. Cross-cutting refactor candidate at HT.0.9: a single audit-and-mechanical-replace pass for each extracted helper (`parseFrontmatter`, `withLock`, `findToolkitRoot`).

**Pattern-level observation from HT.0.2 (subprocess invocation surface)**: clean. The H.8.4 fix (`_lib/safe-exec.js`) eliminated all string-build `execSync` paths; remaining subprocess sites use array-form `spawn`/`spawnSync`/`execFileSync` (safe-by-construction). No new safety findings.

## Cumulative token cost so far

(Tracked at end of each session for empirical context-discipline data; informs whether the FIC 40-60% target is realistic given HT phase shape.)

- Session of 2026-05-09 (master plan authoring + state-file authoring): ~70% utilization at end
- Session of 2026-05-09 continued (parallel pre-approval verification on master plan + state-file update): ~75-80% utilization at end.
- Session of 2026-05-09 final (v3 absorption + second-pass parallel verification + v3.1 mechanical fixes + approval): ~85-90% utilization at end. **Two pre-approval rounds (4 spawns total) shipped without compacting between them.** Real-world FIC test summary: meta-session shape (plan-authoring + spawn-coordination + revision-authoring) genuinely cannot stay under 60% in current discipline. Architect FLAG-12 carve-out validated with real data.
- Session of 2026-05-09 post-/compact (HT.0.1 hooks layer audit): ~50-55% utilization at end. Started fresh post-/compact; read HT-state.md + master plan section + research README + 22 hook-layer files; ran 5-bar walkthrough; authored ~600-line research artifact; passed forbidden-phrase grep gate (2 matches, both legitimately rephrased to documentary form). Stayed under 60% FIC ceiling for an audit-shape phase. **First empirical data point that an audit phase fits a single session without /compact when started clean.**
- Session of 2026-05-09 post-/compact (HT.0.2 substrate scripts audit): ~65-70% utilization at end. Started fresh post-/compact; read HT-state.md (cached from prior session) + master plan section + 27 files (9839 LoC; 2.81× HT.0.1 surface) in 5 parallel batches; ran 5-bar walkthrough; authored ~430-line research artifact; passed forbidden-phrase grep gate (2 matches, both legitimately rephrased — one paraphrased a master-plan quote, one swapped "must be" for "is found as"). Crossed 60% ceiling near artifact-authoring; landed at ~70% post-cutover. **Empirical data point: audit phases at 2.5-3× the HT.0.1 LoC surface land at 65-70% (above the 60% FIC ceiling). HT.0.3 is smaller (~12 markdown files vs 27 JS files); expect return to HT.0.1 envelope. The 60% target holds for typical audit shapes; large-LoC audit phases overshoot by ~10%.**
