#!/usr/bin/env node

// Agent identity registry — assigns and tracks named identities per persona.
// Implements the Agent Identity & Reputation pattern (skills/agent-team/patterns/agent-identity-reputation.md).
//
// Storage: ~/.claude/agent-identities.json (gitignored, absolute path so the tree-tracker
// __dirname-resolution bug does NOT recur here).
//
// Usage:
//   node agent-identity.js init
//   node agent-identity.js assign --persona 04-architect [--task <task-tag>]
//   node agent-identity.js list [--persona 04-architect]
//   node agent-identity.js stats [--identity 04-architect.mira] [--json]
//   node agent-identity.js record --identity 04-architect.mira --verdict pass [--task <tag>]
//                                  [--skills security-audit,review]

const fs = require('fs');
const path = require('path');
const os = require('os');
const { withLock: sharedWithLock } = require('./_lib/lock'); // H.3.2: extract shared

// HETS_IDENTITY_STORE env var lets tests + ephemeral runs point at a temp file
// without polluting the real registry. Default: ~/.claude/agent-identities.json.
const STORE_PATH = process.env.HETS_IDENTITY_STORE ||
  path.join(os.homedir(), '.claude', 'agent-identities.json');
const LOCK_PATH = STORE_PATH + '.lock';

// Default rosters — small enough to survive a single chaos run, large enough that
// 3 parallel actors of one persona always get distinct identities.
const DEFAULT_ROSTERS = {
  // Auditor family (chaos-test-focused, original 5)
  '01-hacker': ['zoe', 'ren', 'kai'],
  '02-confused-user': ['sam', 'alex', 'rafael'],
  '03-code-reviewer': ['nova', 'jade', 'blair'],
  '04-architect': ['mira', 'theo', 'ari'],
  '05-honesty-auditor': ['quinn', 'lior', 'aki'],
  // Builder family (product-focused, H.2.1+)
  '06-ios-developer': ['riley', 'morgan', 'taylor'],   // shipped H.2.1
  '07-java-backend': ['sasha', 'cam', 'pat'],           // shipped H.2.2
  '08-ml-engineer': ['chen', 'priya', 'omar'],          // shipped H.2.2
  '09-react-frontend': ['dev', 'jamie', 'casey'],       // shipped H.2.2
  '10-devops-sre': ['iris', 'hugo', 'jules'],           // shipped H.2.2
  '11-data-engineer': ['fin', 'niko', 'rae'],           // shipped H.2.2
  '12-security-engineer': ['vlad', 'mio', 'eli'],       // shipped H.2.2
  '13-node-backend': ['noor', 'evan', 'kira'],          // shipped H.6.4 — closes Express/Node routing gap surfaced in H.6.1
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { args[key] = next; i++; }
      else args[key] = true;
    }
  }
  return args;
}

function ensureDir() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

function emptyStore() {
  return {
    version: 1,
    rosters: { ...DEFAULT_ROSTERS },
    nextIndex: Object.fromEntries(Object.keys(DEFAULT_ROSTERS).map((k) => [k, 0])),
    identities: {},
  };
}

function readStore() {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) return emptyStore();
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch (e) {
    console.error(`Corrupt store at ${STORE_PATH}: ${e.message}. Refusing to advance.`);
    process.exit(2);
  }
}

// H.3.2: lock primitives extracted to _lib/lock.js. Local withLock wraps the
// shared one with the module-scoped LOCK_PATH for backwards-compat callsites.
function withLock(fn) { return sharedWithLock(LOCK_PATH, fn); }

function writeStore(store) {
  ensureDir();
  const tmp = STORE_PATH + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}

// (H.3.2: old local withLock removed; callsites now use the one defined at line 85
// which delegates to scripts/agent-team/_lib/lock.js. See agent-identity.js:85.)

function tierOf(stats) {
  const total = (stats.verdicts.pass || 0) + (stats.verdicts.partial || 0) + (stats.verdicts.fail || 0);
  if (total < 5) return 'unproven';
  const passRate = (stats.verdicts.pass || 0) / total;
  if (passRate >= 0.8) return 'high-trust';
  if (passRate >= 0.5) return 'medium-trust';
  return 'low-trust';
}

function ensureIdentity(store, persona, name) {
  const id = `${persona}.${name}`;
  if (!store.identities[id]) {
    store.identities[id] = {
      persona,
      name,
      createdAt: new Date().toISOString(),
      lastSpawnedAt: null,
      totalSpawns: 0,
      verdicts: { pass: 0, partial: 0, fail: 0 },
      specializations: [],
      skillInvocations: {},
      // H.6.6 — Lifecycle primitives + forward-compatible schema for H.7.0
      // (evolution loop). These fields are populated/used by `prune` today;
      // `parent` + `generation` + `traits` are forward-compat for H.7.0
      // breeding which will read them when designing inheritance rules.
      retired: false,
      retiredAt: null,
      retiredReason: null,
      parent: null,        // identity-id of the parent (for H.7.0 lineage)
      generation: 0,       // 0 = ancestor (round-robin original); H.7.0 will increment per generation
      traits: {            // computed from history; populated by `prune --auto`
        skillFocus: null,    // dominant skill name from skillInvocations
        kbFocus: [],         // dominant kb_scope refs (from spawn history; H.7.0 work)
        taskDomain: null,    // dominant task tag prefix (e.g., "audit-*", "build-*")
      },
      // H.7.0-prep — Hybrid quality factors history. Per-verdict multi-axis
      // signal captured at record-time; surfaced in `cmdStats` aggregate block.
      // Trust formula (`tierOf`) is INTENTIONALLY UNCHANGED — preserves H.4.2
      // audit transparency. This data exists so H.7.0 weight-design can be
      // empirical (≥20 verdicts target) rather than guessed.
      // Bounded: cap at QUALITY_FACTORS_HISTORY_CAP most-recent entries.
      quality_factors_history: [],
    };
  }
  return store.identities[id];
}

// Backfill function: when reading the store, inject default values for fields
// added in later schema phases on identities that pre-date them. Keeps
// lifecycle/evolution logic safe to invoke against legacy records without
// requiring a one-shot migration script.
//
// Phase tags (most recent first):
//   H.7.0 — spawnsSinceFullVerify, lastFullVerifyAt (drift-detection counter)
//   H.6.6 — retired/retiredAt/retiredReason, parent, generation, traits
//   H.7.0-prep — quality_factors_history
//
// Renamed in H.7.0 from _backfillH66Schema → _backfillSchema (architect-mira
// MEDIUM M-3): phase-tag the FIELDS not the function so future phases extend
// without further renames.
function _backfillSchema(identity) {
  if (identity.retired === undefined) identity.retired = false;
  if (identity.retiredAt === undefined) identity.retiredAt = null;
  if (identity.retiredReason === undefined) identity.retiredReason = null;
  if (identity.parent === undefined) identity.parent = null;
  if (identity.generation === undefined) identity.generation = 0;
  if (!identity.traits) {
    identity.traits = { skillFocus: null, kbFocus: [], taskDomain: null };
  }
  // H.7.0-prep — quality factors history forward-compat backfill
  if (!Array.isArray(identity.quality_factors_history)) {
    identity.quality_factors_history = [];
  }
  // H.7.0 — drift-detection counters per architect-mira M-2 / Decision 7.
  // spawnsSinceFullVerify resets to 0 on each full-verify; counts spot-checks
  // since last full. lastFullVerifyAt is ISO timestamp of last full verify
  // (used for diagnostic surfacing in cmdStats).
  if (identity.spawnsSinceFullVerify === undefined) identity.spawnsSinceFullVerify = 0;
  if (identity.lastFullVerifyAt === undefined) identity.lastFullVerifyAt = null;
  return identity;
}

// H.7.0-prep — bounded growth on quality_factors_history. Cap at 50 most-recent
// entries per identity to prevent unbounded JSON growth across years of runs.
// 50 is sufficient signal for the H.7.0 weight-derivation analysis (target n≥20
// global; per-identity history rarely exceeds 50 in practice).
const QUALITY_FACTORS_HISTORY_CAP = 50;

// H.7.0-prep — compute per-identity aggregate quality factors. Returns null
// for axes where every entry is null (no data captured). Means computed
// over non-null values only — backwards-compat with pre-H.7.0-prep entries.
function aggregateQualityFactors(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const axes = ['findings_per_10k', 'file_citations_per_finding', 'cap_request_actionability', 'tokens'];
  const out = { samples: history.length };
  for (const axis of axes) {
    const vals = history.map((h) => h && h[axis]).filter((v) => typeof v === 'number' && Number.isFinite(v));
    out[axis] = vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  // kb_provenance is bool — express as % verified (or null when no observations)
  const kbVals = history.map((h) => h && h.kb_provenance_verified).filter((v) => typeof v === 'boolean');
  out.kb_provenance_verified_pct = kbVals.length === 0 ? null : (kbVals.filter(Boolean).length / kbVals.length);
  // H.7.1 — convergence axis. Filter to records with non-null convergence
  // (paired runs only). null when no paired data exists; percentage of "agree"
  // over decisive (agree|disagree) entries otherwise. n/a counted in the sample
  // count but excluded from the percentage denominator.
  const convergenceVals = history.map((h) => h && h.convergence)
    .filter((v) => v === 'agree' || v === 'disagree' || v === 'n/a');
  const convergenceDecisive = convergenceVals.filter((v) => v === 'agree' || v === 'disagree');
  out.convergence_agree_pct = convergenceDecisive.length === 0
    ? null
    : (convergenceDecisive.filter((v) => v === 'agree').length / convergenceDecisive.length);
  out.convergence_samples = convergenceVals.length;
  return out;
}

// H.7.0 — task-complexity bucketer. Wraps route-decide.scoreTask to map a
// task signature string to a 3-bucket categorization. Architect-mira
// Decision 2 thresholds (cited from route-decide.js published ROUTE_THRESHOLD
// 0.60 and ROOT_THRESHOLD 0.30):
//   trivial:  score_total < 0.30 (== ROOT_THRESHOLD)
//   standard: 0.30 ≤ score_total < 0.60
//   compound: score_total ≥ 0.60 (== ROUTE_THRESHOLD)
//
// Pure deterministic function; falls back to 'standard' when taskSignature is
// null/empty or scoreTask throws (defensive — matches the conservative-default
// pattern at route-decide.js:354 lowSignal handling).
//
// route-decide-export is required lazily so unit tests that don't exercise
// task-complexity logic don't pay the import cost.
let _routeDecideExportCache = null;
function _getRouteDecide() {
  if (_routeDecideExportCache === null) {
    try {
      _routeDecideExportCache = require('./_lib/route-decide-export.js');
    } catch (e) {
      // If the export module is unavailable (deployment edge case), the
      // bucketer falls back to 'standard' — graceful-degrade, not crash.
      _routeDecideExportCache = false;
    }
  }
  return _routeDecideExportCache;
}

function bucketTaskComplexity(taskSignature) {
  if (taskSignature === null || taskSignature === undefined ||
      typeof taskSignature !== 'string' || taskSignature.trim().length === 0) {
    return 'standard';
  }
  const re = _getRouteDecide();
  if (!re || typeof re.scoreTask !== 'function') return 'standard';
  let result;
  try {
    result = re.scoreTask(taskSignature);
  } catch {
    return 'standard';
  }
  if (!result || typeof result.score_total !== 'number') return 'standard';
  const score = result.score_total;
  if (score < 0.30) return 'trivial';
  if (score < 0.60) return 'standard';
  return 'compound';
}

// H.7.0 — task-complexity-weighted passRate. Architect-mira H-1 formula:
//   Σ(passes_in_bucket × bucket_weight) / Σ(total_in_bucket × bucket_weight)
//
// Bucket weights are theory-driven (will be refit at H.7.5+ with n≥30):
//   trivial:  0.5  (under-counts trivial passes; we want hard passes more)
//   standard: 1.0  (neutral)
//   compound: 1.5  (over-counts compound passes; rewards specialists)
//
// Returns null when history is empty. partial verdicts contribute 0 to the
// pass-numerator (matching tierOf semantics) but 1 to the total-denominator.
const TASK_COMPLEXITY_BUCKET_WEIGHTS = Object.freeze({
  trivial: 0.5,
  standard: 1.0,
  compound: 1.5,
});

function computeTaskComplexityWeightedPass(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  let weightedPasses = 0;
  let weightedTotal = 0;
  for (const entry of history) {
    if (!entry || typeof entry !== 'object') continue;
    const bucket = bucketTaskComplexity(entry.task_signature);
    const w = TASK_COMPLEXITY_BUCKET_WEIGHTS[bucket];
    if (typeof w !== 'number') continue;
    weightedTotal += w;
    if (entry.verdict === 'pass') weightedPasses += w;
  }
  if (weightedTotal === 0) return null;
  return weightedPasses / weightedTotal;
}

// H.7.0 — recency decay factor. Architect-mira CRITICAL C-2: OBSERVABLE only
// at this phase; does NOT enter the score formula until n≥30 per-identity
// verdicts span ≥30 calendar days (currently 0 of 12 active identities meet
// this — would be dominated by mira's 5-day record).
//
// Theory-driven exponential decay with half-life 30 calendar days:
//   decay_per_verdict = exp(-Δdays / 30)
// Returns the weighted-mean recency factor over the history; weights all
// verdicts equally. Result ∈ (0, 1]. Returns null when history is empty or
// when no entries have a valid timestamp.
//
// Cite: Curtis et al. 1988 typical software-engineering memory-window
// (theory-driven; refit gate is H.7.5+ once data permits).
const RECENCY_HALF_LIFE_DAYS = 30;

function computeRecencyDecay(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const now = Date.now();
  const factors = [];
  for (const entry of history) {
    if (!entry || typeof entry.ts !== 'string') continue;
    const t = Date.parse(entry.ts);
    if (!Number.isFinite(t)) continue;
    const dDays = Math.max(0, (now - t) / (1000 * 60 * 60 * 24));
    factors.push(Math.exp(-dDays / RECENCY_HALF_LIFE_DAYS));
  }
  if (factors.length === 0) return null;
  return factors.reduce((a, b) => a + b, 0) / factors.length;
}

// H.7.0 — quality trend (windowed slope). Architect-mira M-1 schema:
//   {
//     window: 3,
//     findings_per_10k: { recent_avg, prior_avg, slope_sign },
//     file_citations_per_finding: { recent_avg, prior_avg, slope_sign },
//   }
// recent_avg = mean over verdicts[-3:]; prior_avg = mean over verdicts[-6:-3];
// slope_sign = 'up' | 'down' | 'flat' (flat when |recent - prior| < 5% × |prior|).
//
// Returns null when n<6 (insufficient sample for windowed slope).
// OBSERVABLE only at H.7.0; consumed by cmdRecommendVerification's drift
// pre-check to fire 'quality-trend-down' on high-trust identities.
const QUALITY_TREND_WINDOW = 3;
const QUALITY_TREND_FLAT_THRESHOLD_PCT = 0.05;

function _windowedAvg(history, axis, startIdx, count) {
  let sum = 0;
  let n = 0;
  for (let i = startIdx; i < startIdx + count && i < history.length; i++) {
    const v = history[i] && history[i][axis];
    if (typeof v === 'number' && Number.isFinite(v)) {
      sum += v;
      n += 1;
    }
  }
  return n === 0 ? null : sum / n;
}

function _slopeSign(recent, prior) {
  if (recent === null || prior === null) return 'flat';
  const delta = recent - prior;
  // Flat threshold = 5% of |prior|. When prior is 0, treat any non-zero
  // delta as the corresponding direction (avoid divide-by-zero).
  const threshold = Math.abs(prior) * QUALITY_TREND_FLAT_THRESHOLD_PCT;
  if (Math.abs(delta) < threshold) return 'flat';
  if (delta > 0) return 'up';
  return 'down';
}

function computeQualityTrend(history) {
  if (!Array.isArray(history) || history.length < 6) return null;
  const N = history.length;
  // recent = last 3; prior = the 3 before that. Verdicts are appended chrono-
  // logically per cmdRecord, so [-3:] is the most recent window.
  const recentStart = N - QUALITY_TREND_WINDOW;
  const priorStart = N - QUALITY_TREND_WINDOW * 2;
  const out = { window: QUALITY_TREND_WINDOW };
  for (const axis of ['findings_per_10k', 'file_citations_per_finding']) {
    const recent = _windowedAvg(history, axis, recentStart, QUALITY_TREND_WINDOW);
    const prior = _windowedAvg(history, axis, priorStart, QUALITY_TREND_WINDOW);
    out[axis] = {
      recent_avg: recent,
      prior_avg: prior,
      slope_sign: _slopeSign(recent, prior),
    };
  }
  return out;
}

// H.7.2 — weighted trust score weights. Theory-driven (n<20 verdicts; cannot
// fit empirically yet). Magnitudes chosen per these citations:
//   findings_per_10k: Dunsmore 2003 ("review effectiveness ~ defect density")
//   file_citations_per_finding: Bacchelli & Bird MSR 2013 ("evidence depth ~ review quality")
//   cap_request_actionability: lower weight; small sample size at H.7.2 (n=1)
//   kb_provenance_verified: contract compliance — equal-weight to evidence axes
//   convergence_agree_pct: HIGHEST; inter-rater reliability literature
//     (Cohen 1960, Krippendorff 2004 — agreement is the gold-standard reliability signal)
//   tokens: efficiency penalty (negative direction)
// All weights tunable in this single object; refit scheduled for H.8.x once n>=20.
//
// H.7.4 — Weight profile version. Surfaced in computeWeightedTrustScore output
// so historical scores can be tagged with their profile-of-origin. Bump on any
// weight-table or normalization-scale change.
//
// H.7.0 (multi-axis ship): bumped from h7.4-empirical-v1 → h7.0-multi-axis-v1.
// New axis added: task_complexity_weighted_pass (in score, +0.10). Two more
// axes (recency_decay_factor, qualityTrend) ship as OBSERVABLE-ONLY this phase
// per architect-mira CRITICAL C-2 (sample-size insufficient to fit empirically;
// will move into score formula at H.7.5+ once n≥30 per-identity verdicts span
// ≥30 days). See pattern doc "Multi-Axis Trust Signal (H.7.0)" section.
const WEIGHT_PROFILE_VERSION = "h7.0-multi-axis-v1";

// H.7.4 — Empirical refit (one-axis adjustment).
// file_citations_per_finding: 0.10 → 0.135 per Pearson r=0.439 (n=20, moderate
//   confidence) over the H.6.x→H.7.3 builder verdict accumulation. See
//   patterns/agent-identity-reputation.md "Empirical Refit (H.7.4)" section.
// All other weights kept at H.7.2 theory values:
//   - findings_per_10k, kb_provenance_verified_pct, cap_request_actionability,
//     convergence_agree_pct: low / insufficient empirical signal at n=20.
//   - tokens: -0.05 (UNCHANGED). Empirical r=0.288 with positive sign-flip
//     would be a confound (90:10 imbalanced verdict sample; both fails in lower
//     token half; substantive tasks → more tokens AND more passes). The negative
//     weight is a deliberate efficiency penalty (normative), not a descriptive
//     prediction. See pattern doc "Tokens override rationale" subsection.
// H.7.0 — task_complexity_weighted_pass added at +0.10 (architect-mira H-1).
// Theory: passRate weighted by task complexity bucket; same Bacchelli & Bird
// MSR 2013 evidence-depth framework as file_citations_per_finding. Bucket
// weights {trivial: 0.5, standard: 1.0, compound: 1.5} applied at axis-compute
// time inside computeTaskComplexityWeightedPass(). Refit gated on H.7.5+ data.
//
// New positive-weights sum after H.7.0 = 0.585 (was 0.535 at H.7.4):
//   0.10 + 0.135 + 0.05 + 0.10 + 0.15 + 0.10 = 0.635 (subtracting the -0.05
//   tokens weight that's separately subtracted) = 0.585 effective bonus from
//   above. BONUS_CAP.max stays at 0.50 — cap-from-above is real and active for
//   top-decile identities (matches the H.7.4 cap-from-above semantic).
const WEIGHTS = Object.freeze({
  findings_per_10k: 0.10,
  file_citations_per_finding: 0.135,
  cap_request_actionability: 0.05,
  kb_provenance_verified_pct: 0.10,
  convergence_agree_pct: 0.15,
  tokens: -0.05,
  task_complexity_weighted_pass: 0.10,
});

// H.7.2 — reference scales for clamp-to-[0,1] linear normalization. Each pair
// is [low, high]: values <= low normalize to 0; values >= high normalize to 1.
// Validated against H.6.x cycle observed data (see pattern doc worked example).
//   findings_per_10k: 0.5->2.5 captures the observed 0.6->1.1 range with headroom
//   file_citations_per_finding: 1.5->6.0 (raised from 4.0 in initial plan; ari/noor
//     both record 5+ which would clamp to 1.0 at the lower ceiling)
//   tokens: 50K->150K (NEGATIVE-direction; weight sign inverts)
// kb_provenance_verified_pct, convergence_agree_pct, cap_request_actionability
// are already in [0,1] from upstream (booleans-as-pct or ratios); pass-through
// with clamp-only safety.
const REFERENCE_SCALES = Object.freeze({
  findings_per_10k: [0.5, 2.5],
  file_citations_per_finding: [1.5, 6.0],
  tokens: [50000, 150000],
  // H.7.0 — task_complexity_weighted_pass already in [0,1] (it's a weighted
  // passRate). Pass-through clamp via the !scale branch in normalizeAxis
  // (see agent-identity.js:268-272). Listed explicitly here for documentation
  // even though `null` would also route to the pass-through path.
  task_complexity_weighted_pass: null,
});

// H.7.2 — bonus cap range. Applied AFTER summing per-axis contributions.
// [-0.10, +0.50] from the H.7.2 plan. The asymmetry reflects that bonus exists
// to differentiate among already-passing identities (rewarding excellence) more
// than to penalize narrow misses; the negative cap is conservative.
const BONUS_CAP = Object.freeze({ min: -0.10, max: 0.50 });

// H.7.2 — clamp-to-[0,1] linear normalization helper. Pure; no side effects.
// Returns null for non-finite numbers (nullable axis); 0 when v <= low; 1 when
// v >= high; linear scaling in between. Mirrors aggregateQualityFactors's
// null-on-no-data semantics (see agent-identity.js:175).
function normalizeAxis(name, raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const scale = REFERENCE_SCALES[name];
  // Pass-through axes (already in [0,1]): kb_provenance_verified_pct,
  // convergence_agree_pct, cap_request_actionability. Clamp only for safety.
  if (!scale) {
    if (raw <= 0) return 0;
    if (raw >= 1) return 1;
    return raw;
  }
  const [low, high] = scale;
  if (raw <= low) return 0;
  if (raw >= high) return 1;
  return (raw - low) / (high - low);
}

// H.7.2 — compute weighted trust score. Pure function; consumes the same `stats`
// object passed to tierOf, plus the precomputed aggregateQF (from
// aggregateQualityFactors). Returns null when there is no quality data to
// compute a score from. Otherwise returns a structured object with full
// per-axis decomposition for audit transparency.
//
// Output shape:
//   {
//     score: number in [0,1],
//     passRate: number in [0,1],
//     quality_bonus: number in [BONUS_CAP.min, BONUS_CAP.max],
//     bonus_capped: boolean,
//     components: { <axis>: { raw, normalized, weight, contribution }, ... },
//     decomposition_note: string  // human-readable summary; comma-separated clauses
//   }
//
// Edge cases:
//   - aggregateQF === null  -> return null (legacy identity, no quality history)
//   - axis missing/null in aggregateQF -> contribution=0; not null-propagated
//   - passRate=0 -> score=0 always (multiplicative composition guarantees this)
//   - bonus exceeds [BONUS_CAP.min, BONUS_CAP.max] -> clamped; bonus_capped=true
//   - score outside [0,1] after composition -> clamped to [0,1] (defense-in-depth)
function computeWeightedTrustScore(stats, aggregateQF) {
  if (aggregateQF === null || aggregateQF === undefined) return null;

  const total = (stats.verdicts.pass || 0) + (stats.verdicts.partial || 0) + (stats.verdicts.fail || 0);
  const passRate = total === 0 ? 0 : (stats.verdicts.pass || 0) / total;

  // H.7.0 — derive task_complexity_weighted_pass from history at score-time
  // (architect-mira CRITICAL C-3: avoids storing on the verdict to prevent
  // the silent-denominator-shift wound). The history is on the stats object;
  // hand-merge the derived axis into aggregateQF so the existing loop
  // machinery picks it up alongside the natively-aggregated axes.
  const taskComplexityAxis = computeTaskComplexityWeightedPass(stats.quality_factors_history || []);
  aggregateQF.task_complexity_weighted_pass = taskComplexityAxis;

  const components = {};
  let bonusSum = 0;
  const notes = [];

  // Iterate the 7 axes carrying weights (H.7.0 added task_complexity_weighted_pass).
  // Order is stable for deterministic JSON output (consumers can rely on key
  // order in V8 for own-property keys).
  const axes = [
    'findings_per_10k',
    'file_citations_per_finding',
    'cap_request_actionability',
    'kb_provenance_verified_pct',
    'convergence_agree_pct',
    'tokens',
    'task_complexity_weighted_pass',
  ];

  for (const axis of axes) {
    const raw = aggregateQF[axis];
    const normalized = normalizeAxis(axis, raw);
    const weight = WEIGHTS[axis];
    const contribution = normalized === null ? 0 : normalized * weight;
    components[axis] = { raw: raw === undefined ? null : raw, normalized, weight, contribution };
    bonusSum += contribution;
    if (normalized === null) notes.push(`${axis}: null (no records)`);
  }

  // Cap the bonus AFTER summing per-axis contributions.
  let bonusCapped = false;
  let qualityBonus = bonusSum;
  if (qualityBonus > BONUS_CAP.max) {
    qualityBonus = BONUS_CAP.max;
    bonusCapped = true;
    notes.push(`bonus capped at ${BONUS_CAP.max} from raw ${bonusSum.toFixed(4)}`);
  } else if (qualityBonus < BONUS_CAP.min) {
    qualityBonus = BONUS_CAP.min;
    bonusCapped = true;
    notes.push(`bonus capped at ${BONUS_CAP.min} from raw ${bonusSum.toFixed(4)}`);
  }

  // Multiplicative composition. passRate=0 -> score=0 regardless of bonus.
  let score = passRate * (1 + qualityBonus);
  // Defense-in-depth: clamp final score to [0,1] in case a future weight-table
  // change produces 1+bonus < 0 or > 2. Today's [-0.10,+0.50] cap precludes both.
  score = Math.max(0, Math.min(1, score));

  if (passRate === 0) notes.push(`score=0 (passRate=0; never had a pass)`);

  return {
    score: Math.round(score * 1000) / 1000,
    passRate: Math.round(passRate * 1000) / 1000,
    quality_bonus: Math.round(qualityBonus * 1000) / 1000,
    bonus_capped: bonusCapped,
    profile: WEIGHT_PROFILE_VERSION,
    components,
    decomposition_note: notes.length === 0 ? 'all axes contributed normally' : notes.join('; '),
  };
}

function cmdInit() {
  withLock(() => {
    if (fs.existsSync(STORE_PATH)) {
      console.error(`Already initialised at ${STORE_PATH}. Refusing to overwrite.`);
      process.exit(1);
    }
    writeStore(emptyStore());
    console.log(JSON.stringify({ action: 'init', path: STORE_PATH, rosters: Object.keys(DEFAULT_ROSTERS) }, null, 2));
  });
}

// H.6.3 (CS-3 H.6.1 forge-orchestration gap, also flagged in H.5.6 mio
// dogfood): scan the persona contract at assign-time and surface any
// `not-yet-authored` skills as a `forgeNeeded` field on the assign output.
// This makes the gap visible to the orchestrator BEFORE spawn (vs surfacing
// it post-hoc in the spawn report). Optional `--require-forged` flag exits
// non-zero when any required skill is not-yet-authored — used by build-team
// pipelines that want to block-on-forge.
function _readPersonaContract(persona) {
  const fs = require('fs');
  const path = require('path');
  // H.7.14 — second fallback now uses shared `findToolkitRoot()` helper
  // instead of hardcoded `~/Documents/claude-toolkit/`. Env override
  // (HETS_CONTRACTS_DIR) preserved as primary fallback.
  const { findToolkitRoot } = require('./_lib/toolkit-root');
  const contractsBase = process.env.HETS_CONTRACTS_DIR ||
    path.join(findToolkitRoot(), 'swarm', 'personas-contracts');
  const fp = path.join(contractsBase, `${persona}.contract.json`);
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

function _scanSkillGaps(contract) {
  if (!contract || !contract.skills) return { required: [], recommended: [] };
  const status = contract.skills.skill_status || {};
  const required = (contract.skills.required || []).map((s) => ({
    skill: s, status: status[s] || 'unknown',
  })).filter((s) => s.status === 'not-yet-authored');
  const recommended = (contract.skills.recommended || []).map((s) => ({
    skill: s, status: status[s] || 'unknown',
  })).filter((s) => s.status === 'not-yet-authored');
  return { required, recommended };
}

function cmdAssign(args) {
  if (!args.persona) {
    console.error('Usage: assign --persona <NN-name> [--task <tag>] [--require-forged]');
    process.exit(1);
  }
  let exitCode = 0;
  let output;
  withLock(() => {
    const store = readStore();
    if (!store.rosters[args.persona]) {
      console.error(`No roster for persona: ${args.persona}. Add one to DEFAULT_ROSTERS or store.rosters.`);
      process.exit(1);
    }
    const fullRoster = store.rosters[args.persona];
    // H.6.6: filter out retired identities. The roster is the universe of
    // possible names; the live pool is roster minus retired. If everyone
    // is retired, fail loud (prevents silent infinite-loop on fully-pruned
    // persona).
    const liveRoster = fullRoster.filter((n) => {
      const id = `${args.persona}.${n}`;
      const existing = store.identities[id];
      return !(existing && existing.retired);
    });
    if (liveRoster.length === 0) {
      console.error(`All identities for persona ${args.persona} are retired. Add new names to roster OR un-retire via 'unretire' subcommand.`);
      process.exit(1);
    }
    if (store.nextIndex[args.persona] === undefined) store.nextIndex[args.persona] = 0;

    // H.7.0 — specialization-aware pick (architect-mira Decision 6).
    // When --task supplied AND any live identity has overlap with the task in
    // its specializations[], prefer that identity (sorted by overlap-count
    // desc; ties → round-robin). Falls back to current round-robin behavior
    // when no overlap exists. Pure additive; no behavioral change for callers
    // that don't pass --task.
    let name;
    let pickReason = 'round-robin';
    if (typeof args.task === 'string' && args.task.length > 0) {
      // Score each live name by overlap count with task signature.
      const scored = liveRoster.map((n) => {
        const id = `${args.persona}.${n}`;
        const existing = store.identities[id];
        const specs = (existing && Array.isArray(existing.specializations)) ? existing.specializations : [];
        let overlap = 0;
        for (const s of specs) {
          if (typeof s !== 'string') continue;
          if (s === args.task) overlap += 2;  // exact match weighs more
          else if (args.task.includes(s) || s.includes(args.task)) overlap += 1;
        }
        return { name: n, overlap };
      });
      const maxOverlap = Math.max(0, ...scored.map((s) => s.overlap));
      if (maxOverlap > 0) {
        // Prefer the highest-overlap candidate; ties broken by round-robin position
        const best = scored.filter((s) => s.overlap === maxOverlap);
        // Use round-robin index modulo best-pool size for deterministic tie-break
        const idx2 = store.nextIndex[args.persona] || 0;
        name = best[idx2 % best.length].name;
        pickReason = 'specialization-overlap';
      }
    }
    if (!name) {
      const idx = store.nextIndex[args.persona];
      name = liveRoster[idx % liveRoster.length];
    }
    // Always advance round-robin counter (matches pre-H.7.0 behavior; keeps
    // the counter rotation in sync regardless of pick reason).
    {
      const idx = store.nextIndex[args.persona];
      store.nextIndex[args.persona] = (idx + 1) % liveRoster.length;
    }

    const identity = _backfillSchema(ensureIdentity(store, args.persona, name));
    identity.lastSpawnedAt = new Date().toISOString();
    identity.totalSpawns += 1;

    writeStore(store);

    // H.6.3: scan contract for skill gaps. Cheap (file read + filter); only
    // runs at assign-time (low frequency). Result joined into the standard
    // assign output as `forgeNeeded` field.
    const contract = _readPersonaContract(args.persona);
    const skillGaps = _scanSkillGaps(contract);
    const forgeNeeded = {
      required: skillGaps.required,        // not-yet-authored required skills (BLOCKERS)
      recommended: skillGaps.recommended,  // not-yet-authored recommended skills (advisory)
    };
    const blocking = forgeNeeded.required.length > 0;

    const fullId = `${args.persona}.${name}`;
    output = {
      action: 'assign',
      persona: args.persona,
      name,
      identity: fullId,
      tier: tierOf(identity),
      totalSpawns: identity.totalSpawns,
      task: args.task || null,
      pickReason,  // H.7.0 — 'specialization-overlap' | 'round-robin'
      forgeNeeded,
    };
    if (blocking) {
      output.warning = `${forgeNeeded.required.length} required skill(s) marked not-yet-authored: ${forgeNeeded.required.map((s) => s.skill).join(', ')}. Forge before spawning OR proceed with KB+contract only.`;
      if (args['require-forged']) {
        output.error = 'assign blocked: --require-forged + missing required skill(s)';
        exitCode = 2;
      }
    }
  });
  console.log(JSON.stringify(output, null, 2));
  if (exitCode) process.exit(exitCode);
}

function cmdList(args) {
  const store = readStore();
  const filter = args.persona;
  const out = {};
  for (const [id, data] of Object.entries(store.identities)) {
    if (filter && data.persona !== filter) continue;
    out[id] = {
      tier: tierOf(data),
      totalSpawns: data.totalSpawns,
      verdicts: data.verdicts,
    };
  }
  console.log(JSON.stringify({ count: Object.keys(out).length, identities: out }, null, 2));
}

function cmdStats(args) {
  const store = readStore();
  if (args.identity) {
    const data = store.identities[args.identity];
    if (!data) {
      console.error(`Unknown identity: ${args.identity}`);
      process.exit(1);
    }
    _backfillSchema(data);  // surface aggregate even on legacy records
    const total = data.verdicts.pass + data.verdicts.partial + data.verdicts.fail;
    // H.7.2 — compute aggregateQF ONCE and pass it both to the surfaced field
    // AND to computeWeightedTrustScore (avoids double-walking the history).
    const aggregateQF = aggregateQualityFactors(data.quality_factors_history);
    // H.7.0 — observable-only diagnostics. Architect-mira CRITICAL C-2:
    // these are surfaced for ranking/audit but do NOT enter the score formula
    // until n≥30 per-identity verdicts span ≥30 days.
    const recencyDecayFactor = computeRecencyDecay(data.quality_factors_history);
    const qualityTrend = computeQualityTrend(data.quality_factors_history);
    const taskComplexityWeightedPass = computeTaskComplexityWeightedPass(data.quality_factors_history);
    const out = {
      identity: args.identity,
      tier: tierOf(data),
      totalSpawns: data.totalSpawns,
      passRate: total === 0 ? null : data.verdicts.pass / total,
      verdicts: data.verdicts,
      specializations: data.specializations,
      skillInvocations: data.skillInvocations,
      createdAt: data.createdAt,
      lastSpawnedAt: data.lastSpawnedAt,
      // H.7.0 — drift-detection counters surfaced for diagnostic visibility.
      // spawnsSinceFullVerify is the input to the recalibration_due trigger
      // in cmdRecommendVerification (>= 10 → forces full-verify regardless
      // of tier). lastFullVerifyAt is the ISO timestamp of last full verify.
      spawnsSinceFullVerify: data.spawnsSinceFullVerify,
      lastFullVerifyAt: data.lastFullVerifyAt,
      // H.7.0 — observable-only diagnostics (CRITICAL C-2). Score formula
      // only consumes task_complexity_weighted_pass at H.7.0; recency_decay
      // and qualityTrend will move into the formula at H.7.5+ once data permits.
      recency_decay_factor: recencyDecayFactor,
      qualityTrend,
      task_complexity_weighted_pass: taskComplexityWeightedPass,
      // H.7.0-prep — multi-axis quality signal. Trust formula (tier) is
      // unchanged; this block surfaces the data H.7.0 weights via the new
      // task_complexity_weighted_pass axis (in score) plus the observable-only
      // axes above.
      aggregate_quality_factors: aggregateQF,
      // H.7.2 — supplemental weighted trust score. Tier (above) remains the
      // audit-default; this is a higher-resolution sibling signal computed from
      // aggregate_quality_factors. Null when no quality history exists. Pure
      // function; auditable via the per-axis `components` decomposition.
      // H.7.0: components.task_complexity_weighted_pass is now populated.
      weighted_trust_score: computeWeightedTrustScore(data, aggregateQF),
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  // aggregate by persona
  const byPersona = {};
  for (const [id, data] of Object.entries(store.identities)) {
    if (!byPersona[data.persona]) byPersona[data.persona] = { identities: 0, totalSpawns: 0, verdicts: { pass: 0, partial: 0, fail: 0 } };
    byPersona[data.persona].identities += 1;
    byPersona[data.persona].totalSpawns += data.totalSpawns;
    byPersona[data.persona].verdicts.pass += data.verdicts.pass;
    byPersona[data.persona].verdicts.partial += data.verdicts.partial;
    byPersona[data.persona].verdicts.fail += data.verdicts.fail;
  }
  console.log(JSON.stringify({ totalIdentities: Object.keys(store.identities).length, byPersona }, null, 2));
}

function cmdAssignChallenger(args) {
  // H.2.3 — asymmetric challenger pattern. Picks an identity to act as
  // challenger, preferring DIFFERENT persona than the implementer to avoid
  // shared blind spots. Falls back to same-persona-different-identity if
  // no different-persona identities are available. Never picks same identity.
  if (!args['exclude-persona'] && !args['exclude-identity']) {
    console.error('Usage: assign-challenger --exclude-persona <NN-name> [--exclude-identity <persona.name>] [--task <tag>]');
    process.exit(1);
  }
  withLock(() => {
    const store = readStore();
    const excludePersona = args['exclude-persona'];
    const excludeIdentity = args['exclude-identity'];

    // Build candidate pool from rosters.
    const candidates = [];
    for (const [persona, names] of Object.entries(store.rosters)) {
      for (const name of names) {
        const id = `${persona}.${name}`;
        if (id === excludeIdentity) continue;
        candidates.push({
          persona, name, id,
          differentPersona: persona !== excludePersona,
        });
      }
    }
    if (candidates.length === 0) {
      console.error('No challenger candidates available (all identities excluded).');
      process.exit(1);
    }

    // Prefer different-persona; fall back to same-persona-different-identity.
    const differentPersonaPool = candidates.filter((c) => c.differentPersona);
    const pool = differentPersonaPool.length > 0 ? differentPersonaPool : candidates;
    const poolType = differentPersonaPool.length > 0 ? 'different-persona' : 'same-persona-different-identity';

    // Round-robin within pool, keyed by excludePersona so different
    // implementer-personas get different challenger rotations.
    if (!store.nextChallengerIndex) store.nextChallengerIndex = {};
    const key = excludePersona || '_default_';
    if (store.nextChallengerIndex[key] === undefined) store.nextChallengerIndex[key] = 0;
    const idx = store.nextChallengerIndex[key];
    const pick = pool[idx % pool.length];
    store.nextChallengerIndex[key] = (idx + 1) % pool.length;

    // Update the picked identity's spawn record.
    const identity = ensureIdentity(store, pick.persona, pick.name);
    identity.lastSpawnedAt = new Date().toISOString();
    identity.totalSpawns += 1;

    writeStore(store);

    console.log(JSON.stringify({
      action: 'assign-challenger',
      challenger: { persona: pick.persona, name: pick.name, identity: pick.id, tier: tierOf(identity) },
      excludedPersona: excludePersona || null,
      excludedIdentity: excludeIdentity || null,
      poolType,
      task: args.task || null,
    }, null, 2));
  });
}

// H.7.1 — assign-pair subcommand. Symmetric-pair pattern needs N distinct
// challengers; today's flow calls assign-challenger N times with manually-
// threaded --exclude-identity flags (kb:hets/symmetric-pair-conventions:24-35).
// This wraps that loop with internal exclusion accumulation so callers
// (build-team.md Step 7) get a single deterministic call. Async-style
// node script (sync filesystem under withLock — same model as cmdAssign).
function cmdAssignPair(args) {
  if (!args.persona) {
    console.error('Usage: assign-pair --persona <NN-name> [--count N] [--task <tag>]');
    process.exit(1);
  }
  const count = parseInt(args.count || '2', 10);
  if (!Number.isFinite(count) || count < 2) {
    console.error(`Invalid --count: ${args.count}. Must be >= 2. For count=1, use assign-challenger.`);
    process.exit(1);
  }

  const pair = [];
  let poolType = null;
  const exclusions = [];

  withLock(() => {
    const store = readStore();
    const excludePersona = args.persona;

    // Build candidate pool ONCE; iterate picks against accumulating exclusions.
    const candidates = [];
    for (const [persona, names] of Object.entries(store.rosters)) {
      for (const name of names) {
        const id = `${persona}.${name}`;
        // H.6.6 parity — skip retired identities (matches cmdAssign live-pool filter).
        const existing = store.identities[id];
        if (existing && existing.retired) continue;
        candidates.push({
          persona, name, id,
          differentPersona: persona !== excludePersona,
        });
      }
    }
    if (candidates.length < count) {
      console.error(`Not enough candidates: requested ${count}, available ${candidates.length} (after retiring filter). Add roster entries OR reduce --count.`);
      process.exit(1);
    }

    for (let i = 0; i < count; i++) {
      const remainingPool = candidates.filter((c) => !exclusions.includes(c.id));
      if (remainingPool.length === 0) {
        console.error(`Roster exhausted after ${pair.length} picks; need ${count}. Add new identities to roster ${excludePersona}.`);
        process.exit(1);
      }
      const differentPersonaPool = remainingPool.filter((c) => c.differentPersona);
      const pool = differentPersonaPool.length > 0 ? differentPersonaPool : remainingPool;
      const thisIterationPoolType = differentPersonaPool.length > 0
        ? 'different-persona'
        : 'same-persona-different-identity';

      // First iteration sets poolType; later iterations only mark 'mixed' if they fall back.
      if (poolType === null) poolType = thisIterationPoolType;
      else if (poolType !== thisIterationPoolType) poolType = 'mixed';

      // Round-robin within the live pool, sharing the nextChallengerIndex bucket
      // keyed by excludePersona (parity with cmdAssignChallenger).
      if (!store.nextChallengerIndex) store.nextChallengerIndex = {};
      const key = excludePersona;
      if (store.nextChallengerIndex[key] === undefined) store.nextChallengerIndex[key] = 0;
      const idx = store.nextChallengerIndex[key];
      const pick = pool[idx % pool.length];
      store.nextChallengerIndex[key] = (idx + 1) % pool.length;

      const identity = ensureIdentity(store, pick.persona, pick.name);
      identity.lastSpawnedAt = new Date().toISOString();
      identity.totalSpawns += 1;

      pair.push(pick.id);
      exclusions.push(pick.id);
    }

    writeStore(store);
  });

  console.log(JSON.stringify({
    action: 'assign-pair',
    pair,
    poolType,
    count: pair.length,
    excludedPersona: args.persona,
    task: args.task || null,
  }, null, 2));
}

// H.2.4 — trust-tiered verification policy. Translates per-identity trust
// (from tierOf) into a verification recommendation: how much to verify,
// whether to spawn a challenger, which expensive checks to skip.
//
// Policy table (per patterns/trust-tiered-verification.md):
//   high-trust    → spot-check only;       no challenger;       skip noTextSimilarityToPriorRun
//   medium-trust  → asymmetric challenger; 1 challenger;        skip nothing
//   low-trust     → symmetric pair;        2 challengers;       skip nothing
//   unproven      → treated as low-trust per pattern doc (cautious default)
const VERIFICATION_POLICY = {
  'high-trust': {
    verification: 'spot-check-only',
    spawnChallenger: false,
    challengerCount: 0,
    skipChecks: ['noTextSimilarityToPriorRun'],
    rationale: 'High pass-rate over >=5 runs — full verification adds latency without catching new bugs',
  },
  'medium-trust': {
    verification: 'asymmetric-challenger',
    spawnChallenger: true,
    challengerCount: 1,
    skipChecks: [],
    rationale: 'Mid pass-rate — full verification + 1 different-persona challenger catches asymmetric blind spots',
  },
  'low-trust': {
    verification: 'symmetric-pair',
    spawnChallenger: true,
    challengerCount: 2,
    skipChecks: [],
    rationale: 'Low pass-rate or unproven — full verification + 2 challengers (different persona preferred) per asymmetric-challenger pattern',
  },
  'unproven': {
    verification: 'symmetric-pair',
    spawnChallenger: true,
    challengerCount: 2,
    skipChecks: [],
    rationale: 'Under 5 runs — treated as low-trust per pattern doc until track record establishes',
  },
};

function cmdTier(args) {
  if (!args.identity) {
    console.error('Usage: tier --identity <persona.name>');
    process.exit(1);
  }
  const store = readStore();
  const data = store.identities[args.identity];
  if (!data) {
    console.error(`Unknown identity: ${args.identity}`);
    process.exit(1);
  }
  const total = data.verdicts.pass + data.verdicts.partial + data.verdicts.fail;
  const passRate = total === 0 ? 0 : data.verdicts.pass / total;
  console.log(JSON.stringify({
    identity: args.identity,
    tier: tierOf(data),
    passRate: Math.round(passRate * 100) / 100,
    totalRuns: total,
    threshold: { highTrust: 0.8, mediumTrust: 0.5, minRuns: 5 },
    verdicts: data.verdicts,
  }, null, 2));
}

// H.7.0 — drift-detection threshold. Architect-mira H-3: theory-driven default
// N=10 (matches retireMinVerdicts). Refit gate at H.7.5+ once 3 high-trust
// identities have ≥30 verdicts each.
const RECALIBRATION_SPAWN_THRESHOLD = 10;

// H.7.0 — full-verify policy used by drift triggers. Same shape as
// VERIFICATION_POLICY['low-trust'] but with a drift-specific rationale slot.
const FULL_VERIFY_POLICY = Object.freeze({
  verification: 'symmetric-pair',
  spawnChallenger: true,
  challengerCount: 2,
  skipChecks: [],
  rationale: 'Full-verify forced by drift trigger; tier policy preempted',
});

const ASYMMETRIC_CHALLENGER_POLICY = Object.freeze({
  verification: 'asymmetric-challenger',
  spawnChallenger: true,
  challengerCount: 1,
  skipChecks: [],
  rationale: 'Drift trigger: task signature outside identity specializations[]',
});

function cmdRecommendVerification(args) {
  if (!args.identity) {
    console.error('Usage: recommend-verification --identity <persona.name> [--task <tag>] [--force-full-verify]');
    process.exit(1);
  }
  const store = readStore();
  const data = store.identities[args.identity];
  if (!data) {
    console.error(`Unknown identity: ${args.identity}`);
    process.exit(1);
  }
  _backfillSchema(data);  // ensure H.7.0 fields exist on legacy records
  const tier = tierOf(data);

  // H.7.0 — drift pre-check block (architect-mira Decision 7). Order is load-
  // bearing; first match wins. The existing tier-table is the fall-through.
  // Each pre-check returns the policy + a recalibration_reason field; the
  // tier-table behavior at the bottom is unchanged from H.7.4.

  // (1) --force-full-verify flag: explicit user override
  if (args['force-full-verify']) {
    console.log(JSON.stringify({
      identity: args.identity,
      tier,
      ...FULL_VERIFY_POLICY,
      recalibration_reason: 'force-full-verify-flag',
    }, null, 2));
    return;
  }

  // (2) recalibration_due: spawnsSinceFullVerify >= threshold
  const recalibrationDue = (data.spawnsSinceFullVerify || 0) >= RECALIBRATION_SPAWN_THRESHOLD;
  if (recalibrationDue) {
    console.log(JSON.stringify({
      identity: args.identity,
      tier,
      ...FULL_VERIFY_POLICY,
      recalibration_reason: 'spawn-counter',
      spawnsSinceFullVerify: data.spawnsSinceFullVerify,
      threshold: RECALIBRATION_SPAWN_THRESHOLD,
    }, null, 2));
    return;
  }

  // (3) high-trust + task-novelty (no specialization overlap)
  if (tier === 'high-trust' && typeof args.task === 'string' && args.task.length > 0) {
    const specs = Array.isArray(data.specializations) ? data.specializations : [];
    const overlap = specs.includes(args.task) ||
      specs.some((s) => typeof s === 'string' && (
        args.task.includes(s) || s.includes(args.task)
      ));
    if (specs.length > 0 && !overlap) {
      console.log(JSON.stringify({
        identity: args.identity,
        tier,
        ...ASYMMETRIC_CHALLENGER_POLICY,
        recalibration_reason: 'task-novelty',
        task: args.task,
        specializations: specs,
      }, null, 2));
      return;
    }
  }

  // (4) high-trust + qualityTrend declining (slope_sign === 'down' on either axis)
  if (tier === 'high-trust') {
    const qt = computeQualityTrend(data.quality_factors_history || []);
    if (qt) {
      const findingsDown = qt.findings_per_10k && qt.findings_per_10k.slope_sign === 'down';
      const citationsDown = qt.file_citations_per_finding && qt.file_citations_per_finding.slope_sign === 'down';
      if (findingsDown || citationsDown) {
        console.log(JSON.stringify({
          identity: args.identity,
          tier,
          ...FULL_VERIFY_POLICY,
          recalibration_reason: 'quality-trend-down',
          qualityTrend: qt,
        }, null, 2));
        return;
      }
    }
  }

  // (5) Fall-through to existing tier-based policy table (unchanged behavior).
  const policy = VERIFICATION_POLICY[tier];
  console.log(JSON.stringify({
    identity: args.identity,
    tier,
    ...policy,
  }, null, 2));
}

// H.7.0 — verification-depth values for the --verification-depth flag.
// 'full', 'asymmetric', 'symmetric' are full-equivalent (counter resets);
// 'spot' is the only one that increments spawnsSinceFullVerify.
const VALID_VERIFICATION_DEPTHS = ['full', 'spot', 'asymmetric', 'symmetric'];
const FULL_EQUIVALENT_DEPTHS = ['full', 'asymmetric', 'symmetric'];

function cmdRecord(args) {
  if (!args.identity || !args.verdict) {
    console.error('Usage: record --identity <persona.name> --verdict pass|partial|fail [--task <tag>] [--skills s1,s2] [--quality-factors-json <json>] [--verification-depth full|spot|asymmetric|symmetric]');
    process.exit(1);
  }
  if (!['pass', 'partial', 'fail'].includes(args.verdict)) {
    console.error(`Invalid verdict: ${args.verdict}. Must be pass|partial|fail.`);
    process.exit(1);
  }
  // H.7.0 — parse --verification-depth (default 'full' for back-compat with
  // all existing callers). Architect-mira M-2: drives the spawnsSinceFullVerify
  // counter that powers the recalibration_due drift trigger.
  const verificationDepth = args['verification-depth'] || 'full';
  if (!VALID_VERIFICATION_DEPTHS.includes(verificationDepth)) {
    console.error(`Invalid --verification-depth: ${verificationDepth}. Must be ${VALID_VERIFICATION_DEPTHS.join('|')}.`);
    process.exit(1);
  }
  // H.7.0-prep — parse optional quality-factors payload up-front; fail loudly
  // on bad JSON so callers don't silently lose signal.
  let qualityFactors = null;
  if (args['quality-factors-json']) {
    try {
      qualityFactors = JSON.parse(args['quality-factors-json']);
      if (typeof qualityFactors !== 'object' || qualityFactors === null) {
        throw new Error('quality-factors-json must decode to an object');
      }
    } catch (e) {
      console.error(`Invalid --quality-factors-json: ${e.message}`);
      process.exit(1);
    }
  }
  withLock(() => {
    const store = readStore();
    const data = store.identities[args.identity];
    if (!data) {
      console.error(`Unknown identity: ${args.identity}. Run "assign" first.`);
      process.exit(1);
    }
    _backfillSchema(data);  // ensure H.7.0-prep + H.7.0 fields exist on legacy records
    data.verdicts[args.verdict] += 1;
    if (args.task && !data.specializations.includes(args.task)) {
      // Track up to 5 most-recent task tags (rough proxy for specialization).
      data.specializations.push(args.task);
      if (data.specializations.length > 5) data.specializations.shift();
    }
    if (args.skills) {
      for (const s of args.skills.split(',').map((x) => x.trim()).filter(Boolean)) {
        data.skillInvocations[s] = (data.skillInvocations[s] || 0) + 1;
      }
    }
    // H.7.0 — drift-detection counter mutation. Full-equivalent depths reset
    // the counter to 0 + stamp lastFullVerifyAt; 'spot' increments. The default
    // 'full' for callers that don't pass the flag preserves H.6.x behavior
    // (counter stays at 0 for legacy identities; no behavior change).
    const ts = new Date().toISOString();
    if (FULL_EQUIVALENT_DEPTHS.includes(verificationDepth)) {
      data.spawnsSinceFullVerify = 0;
      data.lastFullVerifyAt = ts;
    } else {
      // 'spot' — increment counter; do NOT touch lastFullVerifyAt
      data.spawnsSinceFullVerify = (data.spawnsSinceFullVerify || 0) + 1;
    }
    // H.7.0-prep — append per-verdict quality factors entry. Always recorded,
    // even when payload is empty/null — gives us a per-verdict timestamp + verdict
    // shape for future correlation analysis. Bounded by QUALITY_FACTORS_HISTORY_CAP.
    const entry = {
      ts,
      verdict: args.verdict,
      task_signature: args.task || null,
      // Multi-axis signal — null when caller didn't supply (backwards-compat).
      findings_per_10k: qualityFactors && typeof qualityFactors.findings_per_10k === 'number' ? qualityFactors.findings_per_10k : null,
      file_citations_per_finding: qualityFactors && typeof qualityFactors.file_citations_per_finding === 'number' ? qualityFactors.file_citations_per_finding : null,
      cap_request_actionability: qualityFactors && typeof qualityFactors.cap_request_actionability === 'number' ? qualityFactors.cap_request_actionability : null,
      kb_provenance_verified: qualityFactors && typeof qualityFactors.kb_provenance_verified === 'boolean' ? qualityFactors.kb_provenance_verified : null,
      tokens: qualityFactors && typeof qualityFactors.tokens === 'number' ? qualityFactors.tokens : null,
      // H.7.1 — paired-with + convergence (carried in via quality-factors-json from pattern-recorder)
      paired_with: qualityFactors && typeof qualityFactors.paired_with === 'string' ? qualityFactors.paired_with : null,
      convergence: qualityFactors && typeof qualityFactors.convergence === 'string' ? qualityFactors.convergence : null,
      // H.7.0 — task-complexity override (from pattern-recorder propagation).
      // Captured but NOT yet consumed by computeTaskComplexityWeightedPass
      // (which reads task_signature via route-decide). Reserved for H.7.5+.
      task_complexity_override: qualityFactors && typeof qualityFactors.task_complexity_override === 'string' ? qualityFactors.task_complexity_override : null,
    };
    data.quality_factors_history.push(entry);
    if (data.quality_factors_history.length > QUALITY_FACTORS_HISTORY_CAP) {
      data.quality_factors_history = data.quality_factors_history.slice(-QUALITY_FACTORS_HISTORY_CAP);
    }
    writeStore(store);
    console.log(JSON.stringify({
      action: 'record',
      identity: args.identity,
      verdict: args.verdict,
      tier: tierOf(data),
      totalRecorded: data.verdicts.pass + data.verdicts.partial + data.verdicts.fail,
      qualityFactorsRecorded: qualityFactors !== null,
      verificationDepth,
      spawnsSinceFullVerify: data.spawnsSinceFullVerify,
    }, null, 2));
  });
}

// H.6.6 — Lifecycle thresholds. Tunable defaults; identity-specific overrides
// could be added via env or config in a future phase. Conservative bias:
// retire only after 10 verdicts (gives time for trust to stabilize); promote
// to specialist only after 5 verdicts AND a clear skill dominance.
const PRUNE_DEFAULTS = {
  retireMinVerdicts: 10,
  retirePassRateMax: 0.3,
  specialistMinVerdicts: 5,
  specialistPassRateMin: 0.8,
  specialistMinInvocations: 3,
};

function _computeRecommendation(identity, thresholds = PRUNE_DEFAULTS) {
  const v = identity.verdicts || { pass: 0, partial: 0, fail: 0 };
  const total = v.pass + v.partial + v.fail;
  const passRate = total === 0 ? 0 : v.pass / total;
  const recs = [];

  // Already-retired identities don't get re-evaluated
  if (identity.retired) {
    return { skip: true, reason: 'already-retired' };
  }

  // Retire candidate
  if (total >= thresholds.retireMinVerdicts && passRate < thresholds.retirePassRateMax) {
    recs.push({
      action: 'retire',
      reason: `passRate=${passRate.toFixed(2)} < ${thresholds.retirePassRateMax} over ${total} verdicts`,
    });
  }

  // Specialist candidate — find the dominant skill
  if (total >= thresholds.specialistMinVerdicts && passRate >= thresholds.specialistPassRateMin) {
    const skillCounts = identity.skillInvocations || {};
    const dominantSkill = Object.entries(skillCounts)
      .filter(([, n]) => n >= thresholds.specialistMinInvocations)
      .sort((a, b) => b[1] - a[1])[0];
    if (dominantSkill) {
      const [skill, count] = dominantSkill;
      // Only recommend if not already tagged
      if (!(identity.specializations || []).includes(skill)) {
        recs.push({
          action: 'tag-specialist',
          skill,
          invocations: count,
          reason: `passRate=${passRate.toFixed(2)} ≥ ${thresholds.specialistPassRateMin}; ${skill} invoked ${count}× (≥${thresholds.specialistMinInvocations})`,
        });
      }
    }
  }

  return { skip: recs.length === 0, recommendations: recs, total, passRate };
}

function cmdPrune(args) {
  const apply = !!args.auto;
  const thresholds = { ...PRUNE_DEFAULTS };
  // Optional CLI override of any threshold
  for (const k of Object.keys(PRUNE_DEFAULTS)) {
    const cliKey = k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    if (args[cliKey] !== undefined) {
      thresholds[k] = parseFloat(args[cliKey]);
    }
  }

  let summary;
  withLock(() => {
    const store = readStore();
    const out = {
      action: 'prune',
      mode: apply ? 'auto-apply' : 'advisory',
      thresholds,
      retired: [],
      tagged: [],
      skipped: [],
    };

    for (const [id, identity] of Object.entries(store.identities)) {
      _backfillSchema(identity);
      const result = _computeRecommendation(identity, thresholds);
      if (result.skip) continue;

      for (const rec of result.recommendations) {
        if (rec.action === 'retire') {
          out.retired.push({
            identity: id,
            verdicts: identity.verdicts,
            passRate: result.passRate,
            reason: rec.reason,
            applied: apply,
          });
          if (apply) {
            identity.retired = true;
            identity.retiredAt = new Date().toISOString();
            identity.retiredReason = rec.reason;
          }
        }
        if (rec.action === 'tag-specialist') {
          out.tagged.push({
            identity: id,
            skill: rec.skill,
            invocations: rec.invocations,
            reason: rec.reason,
            applied: apply,
          });
          if (apply) {
            if (!identity.specializations.includes(rec.skill)) {
              identity.specializations.push(rec.skill);
            }
            // Also populate traits.skillFocus (the H.7.0 field)
            identity.traits = identity.traits || { skillFocus: null, kbFocus: [], taskDomain: null };
            identity.traits.skillFocus = rec.skill;
          }
        }
      }
    }

    out.totalIdentities = Object.keys(store.identities).length;
    out.retireCount = out.retired.length;
    out.tagCount = out.tagged.length;

    if (apply) writeStore(store);
    summary = out;
  });
  console.log(JSON.stringify(summary, null, 2));
}

function cmdUnretire(args) {
  if (!args.identity) {
    console.error('Usage: unretire --identity <persona.name>');
    process.exit(1);
  }
  withLock(() => {
    const store = readStore();
    const id = args.identity;
    if (!store.identities[id]) {
      console.error(`Unknown identity: ${id}`);
      process.exit(1);
    }
    _backfillSchema(store.identities[id]);
    const before = !!store.identities[id].retired;
    store.identities[id].retired = false;
    store.identities[id].retiredAt = null;
    store.identities[id].retiredReason = null;
    writeStore(store);
    console.log(JSON.stringify({ action: 'unretire', identity: id, wasRetired: before }, null, 2));
  });
}

// H.7.0 — agent-identity breed subcommand. Architect-mira Decision 5 +
// Implementation handoff (lines 114-125 of design doc):
//   agent-identity breed --persona X [--parent <id>] [--name <kid>] [--auto]
//
// Flow:
//   1. Validate args.persona is in DEFAULT_ROSTERS.
//   2. Read store; backfill all identities; filter to live (non-retired).
//   3. Diversity-guard (H-2): refuse when count(generation==0 live) <= 1.
//   4. Population-cap (H-4): refuse when live.length >= rosters[X].length.
//   5. Pick parent: --parent or highest weighted_trust_score (tie → passRate).
//   6. Pick kid name: --name or first roster name not currently in identities.
//   7. User-gate: first breed for this persona AND !args.auto → emit
//      requires_confirmation: true and exit 0; subsequent calls proceed.
//   8. Create kid: parent, generation+1, copy traits, empty verdicts/history.
//   9. writeStore. Output structured JSON.
function cmdBreed(args) {
  if (!args.persona) {
    console.error('Usage: breed --persona <NN-name> [--parent <id>] [--name <kid>] [--auto]');
    process.exit(1);
  }
  let exitCode = 0;
  let output;
  withLock(() => {
    const store = readStore();
    if (!store.rosters[args.persona]) {
      console.error(`No roster for persona: ${args.persona}. Add one to DEFAULT_ROSTERS or store.rosters.`);
      process.exit(1);
    }
    // Backfill ALL identities so generation/traits are present even on legacy.
    for (const id of Object.keys(store.identities)) {
      _backfillSchema(store.identities[id]);
    }

    // Filter live identities of this persona.
    const liveOfPersona = Object.values(store.identities).filter(
      (i) => i.persona === args.persona && !i.retired
    );

    // (3) Diversity-guard: at least 2 generation-0 live identities required
    // (so breeding leaves at least 1 generalist behind). Architect-mira H-2.
    const gen0Live = liveOfPersona.filter((i) => (i.generation || 0) === 0);
    if (gen0Live.length <= 1) {
      output = {
        action: 'breed',
        applied: false,
        error: `diversity-guard: only ${gen0Live.length} generation-0 live identity for ${args.persona}; refusing to breed (would leave 0 generalists).`,
        suggestions: [
          `Add a new generation-0 name to DEFAULT_ROSTERS['${args.persona}']`,
          `Un-retire a previously-retired generation-0 identity via 'unretire --identity ${args.persona}.<name>'`,
        ],
      };
      exitCode = 1;
      return;
    }

    // (4) Population-cap: live.length < rosters[persona].length required.
    // Architect-mira H-4.
    const rosterSize = store.rosters[args.persona].length;
    if (liveOfPersona.length >= rosterSize) {
      output = {
        action: 'breed',
        applied: false,
        error: `population-cap: ${args.persona} at ${liveOfPersona.length}/${rosterSize} live identities; no slot available.`,
        suggestions: [
          `Retire an underperforming identity first (run 'prune --auto')`,
          `Extend the roster: add a name to DEFAULT_ROSTERS['${args.persona}']`,
        ],
      };
      exitCode = 1;
      return;
    }

    // (5) Pick parent.
    let parent;
    if (args.parent) {
      parent = store.identities[args.parent];
      if (!parent || parent.persona !== args.persona || parent.retired) {
        output = {
          action: 'breed',
          applied: false,
          error: `--parent ${args.parent} invalid: must be a live identity belonging to persona ${args.persona}.`,
        };
        exitCode = 1;
        return;
      }
    } else {
      // Rank by weighted_trust_score; tie-break by passRate; final tie-break
      // by createdAt (oldest first — established identities favored).
      const ranked = liveOfPersona.map((i) => {
        const total = (i.verdicts.pass || 0) + (i.verdicts.partial || 0) + (i.verdicts.fail || 0);
        const pr = total === 0 ? 0 : (i.verdicts.pass || 0) / total;
        const aggregateQF = aggregateQualityFactors(i.quality_factors_history);
        const wts = computeWeightedTrustScore(i, aggregateQF);
        return {
          identity: i,
          score: wts ? wts.score : pr,
          passRate: pr,
        };
      });
      ranked.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.passRate !== a.passRate) return b.passRate - a.passRate;
        return (a.identity.createdAt || '').localeCompare(b.identity.createdAt || '');
      });
      parent = ranked[0].identity;
    }

    // (6) Pick kid name.
    let kidName = args.name;
    if (!kidName) {
      const usedNames = new Set(
        Object.values(store.identities)
          .filter((i) => i.persona === args.persona)
          .map((i) => i.name)
      );
      const free = store.rosters[args.persona].filter((n) => !usedNames.has(n));
      if (free.length === 0) {
        output = {
          action: 'breed',
          applied: false,
          error: `no free roster name for ${args.persona}; all roster names already in use (live or retired).`,
          suggestions: [
            `Pass --name <new-name> to introduce a name outside the roster`,
            `Extend the roster: add a name to DEFAULT_ROSTERS['${args.persona}']`,
          ],
        };
        exitCode = 1;
        return;
      }
      kidName = free[0];
    }
    const kidId = `${args.persona}.${kidName}`;
    if (store.identities[kidId]) {
      output = {
        action: 'breed',
        applied: false,
        error: `kid identity ${kidId} already exists; pass --name <fresh-name> or retire the existing first.`,
      };
      exitCode = 1;
      return;
    }

    // (7) User-gate: first breed for this persona AND !args.auto.
    if (!store.breedFirstPromptedFor) store.breedFirstPromptedFor = {};
    const firstBreedForPersona = !store.breedFirstPromptedFor[args.persona];
    if (firstBreedForPersona && !args.auto) {
      // Mark as prompted; user must re-invoke (or pass --auto) to actually breed.
      store.breedFirstPromptedFor[args.persona] = true;
      writeStore(store);
      output = {
        action: 'breed',
        applied: false,
        requires_confirmation: true,
        message: `First breed for persona ${args.persona}. Re-invoke with --auto to confirm or pass --auto on this call to bypass.`,
        plannedKid: kidId,
        plannedParent: `${parent.persona}.${parent.name}`,
        plannedGeneration: (parent.generation || 0) + 1,
        plannedTraitsInherited: parent.traits ? { ...parent.traits } : {},
      };
      return;
    }

    // (8) Create kid.
    const parentId = `${parent.persona}.${parent.name}`;
    const traitsInherited = parent.traits ? { ...parent.traits } : { skillFocus: null, kbFocus: [], taskDomain: null };
    // kbFocus is an array; deep-copy to prevent mutation aliasing.
    if (Array.isArray(traitsInherited.kbFocus)) {
      traitsInherited.kbFocus = [...traitsInherited.kbFocus];
    }
    const newGeneration = (parent.generation || 0) + 1;
    store.identities[kidId] = {
      persona: args.persona,
      name: kidName,
      createdAt: new Date().toISOString(),
      lastSpawnedAt: null,
      totalSpawns: 0,
      verdicts: { pass: 0, partial: 0, fail: 0 },
      specializations: [],
      skillInvocations: {},
      retired: false,
      retiredAt: null,
      retiredReason: null,
      parent: parentId,
      generation: newGeneration,
      traits: traitsInherited,
      quality_factors_history: [],
      // H.7.0 — kid starts fresh per architect-mira note line 185
      // "kid is unproven; the counter is per-identity, not per-lineage."
      spawnsSinceFullVerify: 0,
      lastFullVerifyAt: null,
    };
    writeStore(store);

    // (9) Output.
    output = {
      action: 'breed',
      applied: true,
      kid: kidId,
      parent: parentId,
      generation: newGeneration,
      traits_inherited: traitsInherited,
    };
    // Human-readable stderr summary (architect-mira L-3).
    process.stderr.write(`bred: ${parentId} → ${kidId} (gen ${newGeneration}; traits: ${JSON.stringify(traitsInherited)})\n`);
  });
  console.log(JSON.stringify(output, null, 2));
  if (exitCode) process.exit(exitCode);
}

// H.7.0 — module exports for in-process testing. Pure functions only;
// CLI subcommands stay as-is below. Tests require this module and exercise
// the functions directly without spawning subprocesses (much faster + lets
// us inject HETS_IDENTITY_STORE pointing at a temp file).
module.exports = {
  // Constants
  WEIGHT_PROFILE_VERSION,
  WEIGHTS,
  REFERENCE_SCALES,
  BONUS_CAP,
  RECALIBRATION_SPAWN_THRESHOLD,
  RECENCY_HALF_LIFE_DAYS,
  QUALITY_TREND_WINDOW,
  TASK_COMPLEXITY_BUCKET_WEIGHTS,
  DEFAULT_ROSTERS,
  // Pure helpers
  tierOf,
  bucketTaskComplexity,
  computeTaskComplexityWeightedPass,
  computeRecencyDecay,
  computeQualityTrend,
  aggregateQualityFactors,
  computeWeightedTrustScore,
  normalizeAxis,
  _backfillSchema,
  // Subcommand handlers (for integration testing)
  cmdBreed,
  cmdRecommendVerification,
  cmdAssign,
  cmdRecord,
  cmdStats,
};

// CLI dispatch — only fires when this file is invoked directly (not required).
if (require.main !== module) {
  // Required as a module — skip CLI dispatch.
} else {

const cmd = process.argv[2];
const args = parseArgs(process.argv.slice(3));
switch (cmd) {
  case 'init': cmdInit(); break;
  case 'assign': cmdAssign(args); break;
  case 'assign-challenger': cmdAssignChallenger(args); break;
  case 'assign-pair': cmdAssignPair(args); break;
  case 'tier': cmdTier(args); break;
  case 'recommend-verification': cmdRecommendVerification(args); break;
  case 'list': cmdList(args); break;
  case 'stats': cmdStats(args); break;
  case 'record': cmdRecord(args); break;
  case 'prune': cmdPrune(args); break;
  case 'unretire': cmdUnretire(args); break;
  case 'breed': cmdBreed(args); break;  // H.7.0 — evolution loop L3
  case '__test_internals__':
    // H.7.0 — test-only: dump internals for inline test runners. Not for use
    // by production callers; gated behind explicit subcommand name so it's
    // never accidentally invoked. Used by tests/agent-identity-h70-test.js.
    console.log(JSON.stringify({
      WEIGHT_PROFILE_VERSION,
      WEIGHTS,
      REFERENCE_SCALES,
      BONUS_CAP,
      RECALIBRATION_SPAWN_THRESHOLD,
      RECENCY_HALF_LIFE_DAYS,
      QUALITY_TREND_WINDOW,
      TASK_COMPLEXITY_BUCKET_WEIGHTS,
    }, null, 2));
    break;
  default:
    console.error('Usage: agent-identity.js {init|assign|list|stats|record|prune|unretire|breed} [args]');
    console.error('  prune [--auto] [--retire-min-verdicts N] [--retire-pass-rate-max F] [--specialist-min-verdicts N] [--specialist-pass-rate-min F] [--specialist-min-invocations N]');
    console.error('    Default: advisory (prints recommendations). --auto applies them.');
    console.error('  unretire --identity <persona.name>');
    console.error('    Restore a soft-retired identity to the active pool.');
    console.error('  breed --persona <NN-name> [--parent <id>] [--name <kid>] [--auto]');
    console.error('    H.7.0 — evolution loop. Diversity-guard + population-cap apply.');
    console.error('See https://github.com/anthropics/claude-code for context.');
    process.exit(1);
}

}  // end if (require.main === module) block
