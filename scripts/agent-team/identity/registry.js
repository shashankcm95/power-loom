// identity/registry.js — storage substrate, identity normalization, and
// read-only projections (cmdList, cmdStats) + lifecycle mutators (cmdPrune,
// cmdUnretire) extracted from agent-identity.js per HT.1.3 (5-module split +
// ADR-0002 bridge-script entrypoint criterion).
//
// Module characteristics:
//   - Owns STORE_PATH + LOCK_PATH + DEFAULT_ROSTERS + PRUNE_DEFAULTS
//   - Wraps `_lib/lock.js` via local `withLock` (captures module-scoped LOCK_PATH)
//   - All file system + locking operations live here (single owner)
//   - Imports trust-scoring helpers for cmdStats's aggregate-projection logic
//   - cmdStats relocated here from lifecycle-spawn per HT.1.3-verify FLAG-1
//     (read-only projector; sibling to cmdList; not a spawn-mutator)

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { withLock: sharedWithLock } = require('../_lib/lock');
const { writeAtomic: writeAtomicShared } = require('../_lib/atomic-write');
const {
  tierOf,
  aggregateQualityFactors,
  computeRecencyDecay,
  computeQualityTrend,
  computeTaskComplexityWeightedPass,
  computeWeightedTrustScore,
} = require('./trust-scoring');

// HETS_IDENTITY_STORE env var lets tests + ephemeral runs point at a temp file.
const STORE_PATH = process.env.HETS_IDENTITY_STORE ||
  path.join(os.homedir(), '.claude', 'agent-identities.json');
const LOCK_PATH = STORE_PATH + '.lock';

// Default rosters — small enough to survive a single chaos run, large enough
// that 3 parallel actors of one persona always get distinct identities.
const DEFAULT_ROSTERS = {
  // Auditor family (chaos-test-focused, original 5)
  '01-hacker': ['zoe', 'ren', 'kai'],
  '02-confused-user': ['sam', 'alex', 'rafael'],
  '03-code-reviewer': ['nova', 'jade', 'blair'],
  '04-architect': ['mira', 'theo', 'ari'],
  '05-honesty-auditor': ['quinn', 'lior', 'aki'],
  // Builder family (product-focused, H.2.1+)
  '06-ios-developer': ['riley', 'morgan', 'taylor'],
  '07-java-backend': ['sasha', 'cam', 'pat'],
  '08-ml-engineer': ['chen', 'priya', 'omar'],
  '09-react-frontend': ['dev', 'jamie', 'casey'],
  '10-devops-sre': ['iris', 'hugo', 'jules'],
  '11-data-engineer': ['fin', 'niko', 'rae'],
  '12-security-engineer': ['vlad', 'mio', 'eli'],
  '13-node-backend': ['noor', 'evan', 'kira'],
  // Documentary family (research-focused, H.8.6+ via /research; HT.1.6 — closes
  // drift-note 60 sub-decision 3 + drift-note 65 option-axis-conflation finding:
  // contracts ship at H.8.6 with `persona: <fixed>` shape but DEFAULT_ROSTERS
  // membership was independent axis silently left absent until HT.1.6).
  '14-codebase-locator': ['scout', 'nav', 'atlas'],
  '15-codebase-analyzer': ['lex', 'dex', 'kit'],
  '16-codebase-pattern-finder': ['vega', 'nori', 'pip'],
};

// H.6.6 — lifecycle thresholds (prune defaults).
const PRUNE_DEFAULTS = {
  retireMinVerdicts: 10,
  retirePassRateMax: 0.3,
  specialistMinVerdicts: 5,
  specialistPassRateMin: 0.8,
  specialistMinInvocations: 3,
};

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

// H.3.2 — wraps shared lock primitive with module-scoped LOCK_PATH.
// Co-located with LOCK_PATH per HT.1.3-verify drift-note A — must NOT be
// moved to dispatcher or trust-scoring; relies on registry-internal LOCK_PATH.
function withLock(fn) { return sharedWithLock(LOCK_PATH, fn); }

function writeStore(store) {
  // HT.audit-followup H4: migrated from inline pid-only tmp-suffix
  // (collision-prone under PID reuse / async-retry race) to `_lib/atomic-write.js`
  // shared primitive which uses pid + hrtime + crypto nonce.
  writeAtomicShared(STORE_PATH, store);
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
      // H.6.6 — Lifecycle primitives + forward-compatible schema for H.7.0.
      retired: false,
      retiredAt: null,
      retiredReason: null,
      parent: null,
      generation: 0,
      traits: {
        skillFocus: null,
        kbFocus: [],
        taskDomain: null,
      },
      // H.7.0-prep — Hybrid quality factors history.
      quality_factors_history: [],
    };
  }
  return store.identities[id];
}

// Backfill function — inject default values for fields added in later schema
// phases on identities that pre-date them.
//
// Phase tags (most recent first):
//   H.7.0 — spawnsSinceFullVerify, lastFullVerifyAt
//   H.6.6 — retired/retiredAt/retiredReason, parent, generation, traits
//   H.7.0-prep — quality_factors_history
function _backfillSchema(identity) {
  if (identity.retired === undefined) identity.retired = false;
  if (identity.retiredAt === undefined) identity.retiredAt = null;
  if (identity.retiredReason === undefined) identity.retiredReason = null;
  if (identity.parent === undefined) identity.parent = null;
  if (identity.generation === undefined) identity.generation = 0;
  if (!identity.traits) {
    identity.traits = { skillFocus: null, kbFocus: [], taskDomain: null };
  }
  if (!Array.isArray(identity.quality_factors_history)) {
    identity.quality_factors_history = [];
  }
  if (identity.spawnsSinceFullVerify === undefined) identity.spawnsSinceFullVerify = 0;
  if (identity.lastFullVerifyAt === undefined) identity.lastFullVerifyAt = null;
  return identity;
}

// _computeRecommendation — used by cmdPrune. Identifies retire + tag-specialist
// candidates per the lifecycle thresholds.
function _computeRecommendation(identity, thresholds = PRUNE_DEFAULTS) {
  const v = identity.verdicts || { pass: 0, partial: 0, fail: 0 };
  const total = v.pass + v.partial + v.fail;
  const passRate = total === 0 ? 0 : v.pass / total;
  const recs = [];

  if (identity.retired) {
    return { skip: true, reason: 'already-retired' };
  }

  if (total >= thresholds.retireMinVerdicts && passRate < thresholds.retirePassRateMax) {
    recs.push({
      action: 'retire',
      reason: `passRate=${passRate.toFixed(2)} < ${thresholds.retirePassRateMax} over ${total} verdicts`,
    });
  }

  if (total >= thresholds.specialistMinVerdicts && passRate >= thresholds.specialistPassRateMin) {
    const skillCounts = identity.skillInvocations || {};
    const dominantSkill = Object.entries(skillCounts)
      .filter(([, n]) => n >= thresholds.specialistMinInvocations)
      .sort((a, b) => b[1] - a[1])[0];
    if (dominantSkill) {
      const [skill, count] = dominantSkill;
      if (!(identity.specializations || []).includes(skill)) {
        recs.push({
          action: 'tag-specialist',
          skill,
          invocations: count,
          reason: `passRate=${passRate.toFixed(2)} >= ${thresholds.specialistPassRateMin}; ${skill} invoked ${count}x (>=${thresholds.specialistMinInvocations})`,
        });
      }
    }
  }

  return { skip: recs.length === 0, recommendations: recs, total, passRate };
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

// cmdStats — relocated to registry.js per HT.1.3-verify FLAG-1 (read-only
// projector; sibling to cmdList; not a spawn-mutator).
function cmdStats(args) {
  const store = readStore();
  if (args.identity) {
    const data = store.identities[args.identity];
    if (!data) {
      console.error(`Unknown identity: ${args.identity}`);
      process.exit(1);
    }
    _backfillSchema(data);
    const total = data.verdicts.pass + data.verdicts.partial + data.verdicts.fail;
    const aggregateQF = aggregateQualityFactors(data.quality_factors_history);
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
      // H.7.0 — drift-detection counters
      spawnsSinceFullVerify: data.spawnsSinceFullVerify,
      lastFullVerifyAt: data.lastFullVerifyAt,
      // H.7.0 — observable-only diagnostics
      recency_decay_factor: recencyDecayFactor,
      qualityTrend,
      task_complexity_weighted_pass: taskComplexityWeightedPass,
      // H.7.0-prep — multi-axis quality signal
      aggregate_quality_factors: aggregateQF,
      // H.7.2 — supplemental weighted trust score
      weighted_trust_score: computeWeightedTrustScore(data, aggregateQF),
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  // Aggregate by persona
  const byPersona = {};
  for (const [, data] of Object.entries(store.identities)) {
    if (!byPersona[data.persona]) byPersona[data.persona] = { identities: 0, totalSpawns: 0, verdicts: { pass: 0, partial: 0, fail: 0 } };
    byPersona[data.persona].identities += 1;
    byPersona[data.persona].totalSpawns += data.totalSpawns;
    byPersona[data.persona].verdicts.pass += data.verdicts.pass;
    byPersona[data.persona].verdicts.partial += data.verdicts.partial;
    byPersona[data.persona].verdicts.fail += data.verdicts.fail;
  }
  console.log(JSON.stringify({ totalIdentities: Object.keys(store.identities).length, byPersona }, null, 2));
}

function cmdPrune(args) {
  const apply = !!args.auto;
  const thresholds = { ...PRUNE_DEFAULTS };
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

module.exports = {
  // Constants
  STORE_PATH,
  LOCK_PATH,
  DEFAULT_ROSTERS,
  PRUNE_DEFAULTS,
  // Storage primitives
  ensureDir,
  emptyStore,
  readStore,
  writeStore,
  withLock,
  // Identity helpers
  ensureIdentity,
  _backfillSchema,
  _computeRecommendation,
  // Subcommand handlers
  cmdInit,
  cmdList,
  cmdStats,
  cmdPrune,
  cmdUnretire,
};
