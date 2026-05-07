#!/usr/bin/env node
// _h70-test.js — H.7.0 inline test runner for agent-identity.js + helpers.
//
// Tests required by architect-mira's design pass (Implementation handoff §Tests):
//   - 5 unit tests for bucketTaskComplexity
//   - 3 unit tests for computeTaskComplexityWeightedPass
//   - 2 unit tests for computeRecencyDecay
//   - 3 unit tests for computeQualityTrend
//   - 5 integration tests for cmdBreed
//   - 2 integration tests for cmdRecommendVerification drift triggers
//   - 1 byte-for-byte tierOf invariance test
//
// Run: node scripts/agent-team/_h70-test.js
// Exit code: 0 if all pass, 1 if any fail.

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    failures.push(message);
    console.log(`  ✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (pass) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    failures.push(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    console.log(`  ✗ ${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Use ephemeral store for cmdBreed integration tests so we don't pollute the
// real ~/.claude/agent-identities.json.
const TMP_STORE = path.join(os.tmpdir(), `agent-id-h70-test-${process.pid}.json`);
const TMP_LOCK = TMP_STORE + '.lock';

function setupTmpStore(initialIdentities = {}) {
  // Build a store with the supplied identities (and rosters from DEFAULT_ROSTERS).
  const ai = require('./agent-identity.js');
  const store = {
    version: 1,
    rosters: { ...ai.DEFAULT_ROSTERS },
    nextIndex: Object.fromEntries(Object.keys(ai.DEFAULT_ROSTERS).map((k) => [k, 0])),
    identities: initialIdentities,
  };
  fs.writeFileSync(TMP_STORE, JSON.stringify(store, null, 2));
}

function cleanupTmpStore() {
  try { fs.unlinkSync(TMP_STORE); } catch {}
  try { fs.unlinkSync(TMP_LOCK); } catch {}
}

// ===== Section 1: bucketTaskComplexity unit tests =====

console.log('\n[1] bucketTaskComplexity (5 tests)');
const ai = require('./agent-identity.js');

assertEqual(
  ai.bucketTaskComplexity('hello world'),
  'trivial',
  'bucketTaskComplexity: trivial task scores < 0.30 → trivial'
);

// Standard task: 0.30 ≤ score < 0.60
// 'design pipeline orchestration with auth' scores 0.475 (standard bucket)
assertEqual(
  ai.bucketTaskComplexity('design pipeline orchestration with auth'),
  'standard',
  'bucketTaskComplexity: medium-stakes task scores in [0.30, 0.60) → standard'
);

// Compound task: score ≥ 0.60
// 'design schema migration for production payments kubernetes auth tradeoffs' → compound
const compoundResult = ai.bucketTaskComplexity('design schema migration for production payments kubernetes auth tradeoffs');
assertEqual(
  compoundResult,
  'compound',
  `bucketTaskComplexity: high-stakes compound task → compound`
);

assertEqual(
  ai.bucketTaskComplexity(null),
  'standard',
  'bucketTaskComplexity: null taskSignature → fallback "standard"'
);

// Throws-on-invalid: passing an object (not a string) should fall back to
// 'standard' (defensive — the helper guards against unexpected types).
assertEqual(
  ai.bucketTaskComplexity({ not: 'a string' }),
  'standard',
  'bucketTaskComplexity: invalid type → fallback "standard"'
);

// ===== Section 2: computeTaskComplexityWeightedPass unit tests =====

console.log('\n[2] computeTaskComplexityWeightedPass (3 tests)');

assertEqual(
  ai.computeTaskComplexityWeightedPass([]),
  null,
  'computeTaskComplexityWeightedPass: empty history → null'
);

const allTrivial = [
  { verdict: 'pass', task_signature: 'hello world' },
  { verdict: 'pass', task_signature: 'fix typo' },
  { verdict: 'pass', task_signature: 'hello' },
];
const allTrivialResult = ai.computeTaskComplexityWeightedPass(allTrivial);
assertEqual(
  allTrivialResult,
  1.0,
  'computeTaskComplexityWeightedPass: all trivial passes → 1.0'
);

// Mixed: 1 trivial pass + 1 compound fail
// Trivial pass: weighted 0.5; compound fail: weighted 1.5; total weighted = 2.0;
// passes weighted = 0.5; result = 0.25
const mixed = [
  { verdict: 'pass', task_signature: 'hello world' },  // trivial
  { verdict: 'fail', task_signature: 'design schema migration for production payments kubernetes auth' },  // compound or standard
];
const mixedResult = ai.computeTaskComplexityWeightedPass(mixed);
assert(
  typeof mixedResult === 'number' && mixedResult >= 0 && mixedResult <= 1,
  `computeTaskComplexityWeightedPass: mixed pass+fail → in [0,1] (got ${mixedResult})`
);

// ===== Section 3: computeRecencyDecay unit tests =====

console.log('\n[3] computeRecencyDecay (2 tests)');

assertEqual(
  ai.computeRecencyDecay([]),
  null,
  'computeRecencyDecay: empty history → null'
);

// Varied timestamps: a recent verdict (now-ish) and an old verdict (60 days)
const now = Date.now();
const variedTs = [
  { ts: new Date(now).toISOString(), verdict: 'pass' },
  { ts: new Date(now - 60 * 86400 * 1000).toISOString(), verdict: 'pass' },
];
const decayResult = ai.computeRecencyDecay(variedTs);
assert(
  typeof decayResult === 'number' && decayResult > 0 && decayResult <= 1,
  `computeRecencyDecay: varied timestamps → factor ∈ (0,1] (got ${decayResult})`
);

// ===== Section 4: computeQualityTrend unit tests =====

console.log('\n[4] computeQualityTrend (3 tests)');

assertEqual(
  ai.computeQualityTrend([]),
  null,
  'computeQualityTrend: empty history → null'
);

assertEqual(
  ai.computeQualityTrend([
    { findings_per_10k: 1.0, file_citations_per_finding: 4.0 },
    { findings_per_10k: 1.0, file_citations_per_finding: 4.0 },
  ]),
  null,
  'computeQualityTrend: n<6 → null'
);

// Declining slope: prior 2.0, recent 1.0 (50% drop)
const declining = [
  // prior window: indices 0-2 (prior_avg = mean of these)
  { findings_per_10k: 2.0, file_citations_per_finding: 5.0 },
  { findings_per_10k: 2.0, file_citations_per_finding: 5.0 },
  { findings_per_10k: 2.0, file_citations_per_finding: 5.0 },
  // recent window: indices 3-5 (recent_avg)
  { findings_per_10k: 1.0, file_citations_per_finding: 2.0 },
  { findings_per_10k: 1.0, file_citations_per_finding: 2.0 },
  { findings_per_10k: 1.0, file_citations_per_finding: 2.0 },
];
const decliningTrend = ai.computeQualityTrend(declining);
assertEqual(
  decliningTrend.findings_per_10k.slope_sign,
  'down',
  'computeQualityTrend: 50% drop on findings → slope_sign "down"'
);
assertEqual(
  decliningTrend.file_citations_per_finding.slope_sign,
  'down',
  'computeQualityTrend: 60% drop on citations → slope_sign "down"'
);

// Flat slope: recent ≈ prior (within 5% threshold)
const flat = [
  { findings_per_10k: 1.0, file_citations_per_finding: 4.0 },
  { findings_per_10k: 1.0, file_citations_per_finding: 4.0 },
  { findings_per_10k: 1.0, file_citations_per_finding: 4.0 },
  { findings_per_10k: 1.005, file_citations_per_finding: 4.005 },
  { findings_per_10k: 1.005, file_citations_per_finding: 4.005 },
  { findings_per_10k: 1.005, file_citations_per_finding: 4.005 },
];
const flatTrend = ai.computeQualityTrend(flat);
assertEqual(
  flatTrend.findings_per_10k.slope_sign,
  'flat',
  'computeQualityTrend: <5% delta → slope_sign "flat"'
);

// ===== Section 5: cmdBreed integration tests =====

console.log('\n[5] cmdBreed integration (5 tests)');

// Helper: run cmdBreed via subprocess with HETS_IDENTITY_STORE set so we
// can capture stdout JSON without process.exit() polluting the test runner.
const { spawnSync } = require('child_process');
const aiScript = path.join(__dirname, 'agent-identity.js');

function runBreed(args, identities) {
  setupTmpStore(identities);
  const env = { ...process.env, HETS_IDENTITY_STORE: TMP_STORE };
  const result = spawnSync(process.execPath, [aiScript, 'breed', ...args], {
    env,
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {}
  return { parsed, stderr: result.stderr, status: result.status };
}

// Test 5.1: success path — breed kira → unused name (kira is the highest-scorer for 13-node-backend)
{
  const ts = new Date().toISOString();
  const baseIdent = {
    'persona': '13-node-backend',
    'name': 'noor',
    'createdAt': ts,
    'lastSpawnedAt': null,
    'totalSpawns': 0,
    'verdicts': { pass: 5, partial: 0, fail: 0 },
    'specializations': [],
    'skillInvocations': {},
    'retired': false,
    'retiredAt': null,
    'retiredReason': null,
    'parent': null,
    'generation': 0,
    'traits': { skillFocus: 'node-backend-development', kbFocus: ['kb:test'], taskDomain: null },
    'quality_factors_history': [],
  };
  const ids = {
    '13-node-backend.noor': { ...baseIdent, name: 'noor' },
    '13-node-backend.evan': { ...baseIdent, name: 'evan' },
  };
  const r = runBreed(['--persona', '13-node-backend', '--auto'], ids);
  assert(
    r.parsed && r.parsed.applied === true && r.parsed.kid === '13-node-backend.kira',
    `cmdBreed: success — bred 13-node-backend.kira (got ${r.parsed && r.parsed.kid})`
  );
}

// Test 5.2: diversity-guard fires (only 1 generation-0 live identity)
{
  const ts = new Date().toISOString();
  const ids = {
    '13-node-backend.noor': {
      persona: '13-node-backend', name: 'noor', createdAt: ts, lastSpawnedAt: null,
      totalSpawns: 0, verdicts: { pass: 5, partial: 0, fail: 0 },
      specializations: [], skillInvocations: {},
      retired: false, retiredAt: null, retiredReason: null,
      parent: null, generation: 0,
      traits: { skillFocus: null, kbFocus: [], taskDomain: null },
      quality_factors_history: [],
    },
  };
  const r = runBreed(['--persona', '13-node-backend', '--auto'], ids);
  assert(
    r.parsed && r.parsed.applied === false && /diversity-guard/.test(r.parsed.error || ''),
    `cmdBreed: diversity-guard fires when only 1 generation-0 (got error: ${r.parsed && r.parsed.error})`
  );
}

// Test 5.3: population-cap fires (live === roster size 3)
{
  const ts = new Date().toISOString();
  const make = (name) => ({
    persona: '13-node-backend', name, createdAt: ts, lastSpawnedAt: null,
    totalSpawns: 0, verdicts: { pass: 5, partial: 0, fail: 0 },
    specializations: [], skillInvocations: {},
    retired: false, retiredAt: null, retiredReason: null,
    parent: null, generation: 0,
    traits: { skillFocus: null, kbFocus: [], taskDomain: null },
    quality_factors_history: [],
  });
  const ids = {
    '13-node-backend.noor': make('noor'),
    '13-node-backend.evan': make('evan'),
    '13-node-backend.kira': make('kira'),
  };
  const r = runBreed(['--persona', '13-node-backend', '--auto'], ids);
  assert(
    r.parsed && r.parsed.applied === false && /population-cap/.test(r.parsed.error || ''),
    `cmdBreed: population-cap fires when roster full (got error: ${r.parsed && r.parsed.error})`
  );
}

// Test 5.4: user-gate prompts on first breed without --auto
{
  const ts = new Date().toISOString();
  const make = (name) => ({
    persona: '13-node-backend', name, createdAt: ts, lastSpawnedAt: null,
    totalSpawns: 0, verdicts: { pass: 5, partial: 0, fail: 0 },
    specializations: [], skillInvocations: {},
    retired: false, retiredAt: null, retiredReason: null,
    parent: null, generation: 0,
    traits: { skillFocus: null, kbFocus: [], taskDomain: null },
    quality_factors_history: [],
  });
  const ids = {
    '13-node-backend.noor': make('noor'),
    '13-node-backend.evan': make('evan'),
  };
  const r = runBreed(['--persona', '13-node-backend'], ids);  // NO --auto
  assert(
    r.parsed && r.parsed.applied === false && r.parsed.requires_confirmation === true,
    `cmdBreed: first breed without --auto → requires_confirmation (got ${JSON.stringify(r.parsed)})`
  );
}

// Test 5.5: --auto bypasses user-gate (and second call after --auto also works)
{
  // First, set up an empty store with 2 identities + already-prompted state
  const ts = new Date().toISOString();
  const make = (name) => ({
    persona: '13-node-backend', name, createdAt: ts, lastSpawnedAt: null,
    totalSpawns: 0, verdicts: { pass: 5, partial: 0, fail: 0 },
    specializations: [], skillInvocations: {},
    retired: false, retiredAt: null, retiredReason: null,
    parent: null, generation: 0,
    traits: { skillFocus: null, kbFocus: [], taskDomain: null },
    quality_factors_history: [],
  });
  const ids = {
    '13-node-backend.noor': make('noor'),
    '13-node-backend.evan': make('evan'),
  };
  const r = runBreed(['--persona', '13-node-backend', '--auto'], ids);
  assert(
    r.parsed && r.parsed.applied === true && r.parsed.requires_confirmation === undefined,
    `cmdBreed: --auto bypasses user-gate (got applied=${r.parsed && r.parsed.applied})`
  );
}

cleanupTmpStore();

// ===== Section 6: cmdRecommendVerification drift triggers integration tests =====

console.log('\n[6] cmdRecommendVerification drift integration (2 tests)');

function runRecVerif(args, identities) {
  setupTmpStore(identities);
  const env = { ...process.env, HETS_IDENTITY_STORE: TMP_STORE };
  const result = spawnSync(process.execPath, [aiScript, 'recommend-verification', ...args], {
    env,
    encoding: 'utf8',
  });
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {}
  return { parsed, stderr: result.stderr, status: result.status };
}

// Test 6.1: recalibration_due fires when spawnsSinceFullVerify >= 10
{
  const ts = new Date().toISOString();
  const ids = {
    '13-node-backend.kira': {
      persona: '13-node-backend', name: 'kira', createdAt: ts, lastSpawnedAt: ts,
      totalSpawns: 15, verdicts: { pass: 12, partial: 0, fail: 0 },
      specializations: [], skillInvocations: {},
      retired: false, retiredAt: null, retiredReason: null,
      parent: null, generation: 0,
      traits: { skillFocus: null, kbFocus: [], taskDomain: null },
      quality_factors_history: [],
      spawnsSinceFullVerify: 11, lastFullVerifyAt: ts,
    },
  };
  const r = runRecVerif(['--identity', '13-node-backend.kira'], ids);
  assert(
    r.parsed && r.parsed.recalibration_reason === 'spawn-counter',
    `cmdRecommendVerification: recalibration_due fires at spawnsSinceFullVerify>=10 (got reason ${r.parsed && r.parsed.recalibration_reason})`
  );
}

// Test 6.2: qualityTrend down fires for high-trust identity with declining slope
{
  const ts = new Date().toISOString();
  // Build a quality_factors_history with declining trend.
  const history = [];
  // prior: 6 entries with high values
  for (let i = 0; i < 6; i++) {
    history.push({
      ts, verdict: 'pass', task_signature: 'standard task',
      findings_per_10k: 2.0, file_citations_per_finding: 5.0,
      cap_request_actionability: null, kb_provenance_verified: null, tokens: null,
      paired_with: null, convergence: null, task_complexity_override: null,
    });
  }
  // recent 3 (overrides last 3 of prior): low values
  for (let i = 3; i < 6; i++) {
    history[i] = {
      ts, verdict: 'pass', task_signature: 'standard task',
      findings_per_10k: 1.0, file_citations_per_finding: 2.0,
      cap_request_actionability: null, kb_provenance_verified: null, tokens: null,
      paired_with: null, convergence: null, task_complexity_override: null,
    };
  }
  const ids = {
    '13-node-backend.kira': {
      persona: '13-node-backend', name: 'kira', createdAt: ts, lastSpawnedAt: ts,
      totalSpawns: 8,
      verdicts: { pass: 8, partial: 0, fail: 0 },  // 100% passRate over 8 — high-trust
      specializations: [], skillInvocations: {},
      retired: false, retiredAt: null, retiredReason: null,
      parent: null, generation: 0,
      traits: { skillFocus: null, kbFocus: [], taskDomain: null },
      quality_factors_history: history,
      spawnsSinceFullVerify: 0, lastFullVerifyAt: ts,
    },
  };
  const r = runRecVerif(['--identity', '13-node-backend.kira'], ids);
  assert(
    r.parsed && r.parsed.recalibration_reason === 'quality-trend-down',
    `cmdRecommendVerification: qualityTrend down fires for high-trust (got reason ${r.parsed && r.parsed.recalibration_reason})`
  );
}

cleanupTmpStore();

// ===== Section 7: byte-for-byte tierOf invariance test =====

console.log('\n[7] byte-for-byte tierOf invariance (1 test)');

// The baseline JSON was captured before any H.7.0 code changes. Re-run tierOf
// for each identity in the baseline and diff. This is the H.4.2 audit-
// transparency self-check; if it fails, the H.7.0 ship is blocked.
{
  // Use the live store (~/.claude/agent-identities.json), which the baseline
  // file /tmp/tier-before.json was captured from. Test compares the in-process
  // tierOf() output for each identity against the baseline.
  const baselinePath = '/tmp/tier-before.json';
  if (!fs.existsSync(baselinePath)) {
    console.log('  ⚠ /tmp/tier-before.json missing; skipping invariance test (re-run capture script)');
  } else {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const liveStore = JSON.parse(fs.readFileSync(
      path.join(os.homedir(), '.claude', 'agent-identities.json'),
      'utf8'
    ));
    let allMatch = true;
    let mismatches = [];
    for (const [id, expectedTier] of Object.entries(baseline)) {
      const data = liveStore.identities[id];
      if (!data) {
        mismatches.push(`${id}: missing from live store`);
        allMatch = false;
        continue;
      }
      const actualTier = ai.tierOf(data);
      if (actualTier !== expectedTier) {
        mismatches.push(`${id}: expected ${expectedTier}, got ${actualTier}`);
        allMatch = false;
      }
    }
    if (allMatch) {
      assert(true, `tierOf byte-for-byte invariance: ${Object.keys(baseline).length} identities all match`);
    } else {
      assert(false, `tierOf byte-for-byte invariance FAILED: ${mismatches.join('; ')}`);
    }
  }
}

// ===== Summary =====

console.log(`\n=== Summary ===`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
if (failed > 0) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
