---
last_updated: 2026-05-09T19:45:00-07:00
last_session_phase: HT.0.1 SHIPPED — hooks layer audit complete
git_branch_at_last_save: main
git_commit_at_last_save: d9fa89f
master_plan: swarm/thoughts/shared/plans/2026-05-09-HT.0-hardening-track-master-plan.md
master_plan_status: approved
v3_revision_pre_approval_run: ht0-master-plan-review-20260509-141613
v3_1_revision_pre_approval_run: ht0-master-plan-review-v3-20260509-143810
ht_0_1_research_artifact: swarm/thoughts/shared/research/2026-05-09-HT.0.1-hooks-audit.md
---

# Hardening Track — Live State

## Where we are

**Master plan status: APPROVED.** **HT.0.1 SHIPPED.** Two rounds of parallel pre-approval verification on the plan plus first audit phase complete:
- Round 1 (theo + nova on v2): 24 FLAGs surfaced (10 HIGH, 7 MEDIUM, 7 LOW); v3 absorbed all HIGH FLAGs + most MEDIUM/LOW
- Round 2 (ari + jade on v3): NEEDS-REVISION minor — 9 mechanical fixes + corrections; v3.1 absorbed all
- HT.0.1 hooks layer audit: 22 files inventoried, 5 quality bars applied, 8 active forcing-instruction markers verified in hooks layer (10 family-wide), 4 doc-staleness gaps surfaced, forbidden-phrase grep gate passed clean

H.8.x cleanup arc complete (PRs #117-#121 merged). Soak counter at 0/N from H.8.x runtime track.

## Phase status snapshot

- [x] Master plan pre-approval round 1 (theo + nova; 24 FLAGs; NEEDS-REVISION)
- [x] Master plan v3 absorbing 9 unique HIGH FLAGs + MEDIUM/LOW
- [x] Master plan pre-approval round 2 (ari + jade; NEEDS-REVISION minor)
- [x] Master plan v3.1 absorbing mechanical fixes
- [x] Master plan status: approved (no third pre-approval per ari recommendation)
- [x] HT.0.1 — Hooks layer audit (22 files; 8 active forcing-instruction markers verified; 4 stated-vs-actual gaps surfaced; forbidden-phrase grep gate passed clean)
- [ ] HT.0.2 — Substrate scripts audit
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
- Sub-plans: none yet (HT.0.9 produces first refactor backlog at `swarm/thoughts/shared/plans/2026-05-XX-HT.1-refactor-backlog.md`)
- Last shipped: PR #121 (H.8.8 validate-kb-doc.js); commit `d9fa89f` on `main`

## Open questions / blockers

None blocking. HT.0.1 shipped clean. HT.0.2 (substrate scripts audit) ready in next session.

Soft items for HT-end retrospective:
1. HT-state.md actually load-bearing? (theo FLAG-8 punt) — HT.0.1 dogfood: state file did serve as resume anchor post-/compact (this session); modest evidence for keep.
2. Forbidden-phrase grep false-positive rate? (jade FLAG-3 + ari NEW-1) — HT.0.1 result: 2 matches, both legitimate prescriptive prose (rephrased to documentary; carve-outs not needed). Empirical FP rate after 1 phase: 0/2 (both were real). Continue tracking.
3. HT.0.5a → HT.0.5b sequencing actually 90-120 min? (ari NEW-3 — empirical answer at HT.0.5b end)
4. Top-15 cap survives empirical pressure? (theo FLAG-6 / nova FLAG-6 — empirical answer at HT.0.9)
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

## Next concrete step

**Begin HT.0.2 — Substrate scripts audit.** Per master plan v3.1 methodology:

1. New session: read `swarm/thoughts/shared/HT-state.md` (this file) — confirm HT.0.1 shipped status
2. Read `swarm/thoughts/shared/plans/2026-05-09-HT.0-hardening-track-master-plan.md` — full master plan in context (HT.0.2 scope at line 233)
3. Optional: skim `swarm/thoughts/shared/research/2026-05-09-HT.0.1-hooks-audit.md` for HT.0.1 cross-references (some HT.0.1 findings touch substrate scripts that HT.0.2 audits — e.g. `validate-adr-drift.js` invokes `scripts/agent-team/adr.js` via subprocess)
4. Inventory the ~25 files in scope: `scripts/agent-team/*.js` (route-decide, kb-resolver, adr.js, build-spawn-context, contract-verifier, agent-identity, tree-tracker, budget-tracker, hierarchical-aggregate, contracts-validate, _h70-test, etc.) + `scripts/agent-team/_lib/*.js` (lock, runState, toolkit-root, file-path-pattern, frontmatter, safe-exec) + `scripts/*.js` (self-improve-store) + `swarm/aggregate.js` + `swarm/hierarchical-aggregate.js`
5. Apply 5 quality bars (same methodology as HT.0.1)
6. Special focus per master plan: kb-resolver.js (435 LoC at envelope edge); architecture-relevance-detector.js (538 LoC + ROUTING_RULES inline); subprocess invocation safety; path-traversal `findDocPath` symlink check parity (kb-resolver vs adr.js); DRY divergence post-_lib/frontmatter.js + _lib/safe-exec.js extraction
7. Author research artifact at `swarm/thoughts/shared/research/2026-05-XX-HT.0.2-substrate-scripts-audit.md`
8. Run forbidden-phrase grep gate before marking phase `[x]`
9. Update HT-state.md cutover routine before session ends

**Resume tip from HT.0.1 dogfood**: read files in 3-4 parallel batches of 5 (smaller files first); preserve progress incrementally via `## Progress marker` section + `chore(ht):` commit cadence at natural sub-breaks (per nova FLAG-4). HT.0.2 has more files than HT.0.1 (~25 vs 22) but similar shape; expect comparable token budget.

**Cumulative token cost expected for HT.0.2**: ~20-30% utilization at start (state + master plan reads); ~55-65% at end (more files than HT.0.1; consider /compact at the natural sub-break after `_lib/` audit if the cumulative drift is uncomfortable). Stays under FIC ceiling with discipline.

## Drift-notes captured this run

HT.0.1 surfaced no NEW drift-notes (the 15 follow-up items are all already-known forms — DRY duplicates, doc staleness, multi-responsibility bundling at lifecycle entrypoints, speculative-API exports). All 15 land at HT.0.9 synthesis for categorization (ADR-update / mechanical-fix / refactor-candidate / accept-and-document).

**Pattern-level observation from HT.0.1**: 4 of 4 documentation drift findings (ADR-0001 stale list, settings-reference.json stale, _lib/settings-reader.js comment stale, verify-plan-gate.js comment stale) are doc-side staleness — code shipped but downstream docs/comments did not update. Suggests an HT.2-or-earlier mechanical pass for all "stated source vs current actual" reconciliation. Captured here for HT.0.9 / HT.2 input.

## Cumulative token cost so far

(Tracked at end of each session for empirical context-discipline data; informs whether the FIC 40-60% target is realistic given HT phase shape.)

- Session of 2026-05-09 (master plan authoring + state-file authoring): ~70% utilization at end
- Session of 2026-05-09 continued (parallel pre-approval verification on master plan + state-file update): ~75-80% utilization at end.
- Session of 2026-05-09 final (v3 absorption + second-pass parallel verification + v3.1 mechanical fixes + approval): ~85-90% utilization at end. **Two pre-approval rounds (4 spawns total) shipped without compacting between them.** Real-world FIC test summary: meta-session shape (plan-authoring + spawn-coordination + revision-authoring) genuinely cannot stay under 60% in current discipline. Architect FLAG-12 carve-out validated with real data.
- Session of 2026-05-09 post-/compact (HT.0.1 hooks layer audit): ~50-55% utilization at end. Started fresh post-/compact; read HT-state.md + master plan section + research README + 22 hook-layer files; ran 5-bar walkthrough; authored ~600-line research artifact; passed forbidden-phrase grep gate (2 matches, both legitimately rephrased to documentary form). Stayed under 60% FIC ceiling for an audit-shape phase. **First empirical data point that an audit phase fits a single session without /compact when started clean.**
