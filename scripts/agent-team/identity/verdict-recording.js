// identity/verdict-recording.js — cmdRecord (the only place verdicts are
// appended to the store) extracted from agent-identity.js per HT.1.3 (5-module
// split + ADR-0002 bridge-script entrypoint criterion).
//
// Module characteristics:
//   - Single subcommand (cmdRecord) plus its 2 supporting constants
//   - Imports `withLock` + `readStore` + `writeStore` + `_backfillSchema` from
//     `./registry` (mutation flow needs lock + store + backfill)
//   - Imports `tierOf` + `QUALITY_FACTORS_HISTORY_CAP` from `./trust-scoring`
//     (post-recording tier classification + history cap)

'use strict';

const { withLock, readStore, writeStore, _backfillSchema } = require('./registry');
const { tierOf, QUALITY_FACTORS_HISTORY_CAP } = require('./trust-scoring');

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
  // H.7.0 — parse --verification-depth (default 'full' for back-compat).
  const verificationDepth = args['verification-depth'] || 'full';
  if (!VALID_VERIFICATION_DEPTHS.includes(verificationDepth)) {
    console.error(`Invalid --verification-depth: ${verificationDepth}. Must be ${VALID_VERIFICATION_DEPTHS.join('|')}.`);
    process.exit(1);
  }
  // H.7.0-prep — parse optional quality-factors payload up-front.
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
    _backfillSchema(data);
    data.verdicts[args.verdict] += 1;
    if (args.task && !data.specializations.includes(args.task)) {
      data.specializations.push(args.task);
      if (data.specializations.length > 5) data.specializations.shift();
    }
    if (args.skills) {
      for (const s of args.skills.split(',').map((x) => x.trim()).filter(Boolean)) {
        data.skillInvocations[s] = (data.skillInvocations[s] || 0) + 1;
      }
    }
    // H.7.0 — drift-detection counter mutation.
    const ts = new Date().toISOString();
    if (FULL_EQUIVALENT_DEPTHS.includes(verificationDepth)) {
      data.spawnsSinceFullVerify = 0;
      data.lastFullVerifyAt = ts;
    } else {
      data.spawnsSinceFullVerify = (data.spawnsSinceFullVerify || 0) + 1;
    }
    // H.7.0-prep — append per-verdict quality factors entry.
    const entry = {
      ts,
      verdict: args.verdict,
      task_signature: args.task || null,
      findings_per_10k: qualityFactors && typeof qualityFactors.findings_per_10k === 'number' ? qualityFactors.findings_per_10k : null,
      file_citations_per_finding: qualityFactors && typeof qualityFactors.file_citations_per_finding === 'number' ? qualityFactors.file_citations_per_finding : null,
      cap_request_actionability: qualityFactors && typeof qualityFactors.cap_request_actionability === 'number' ? qualityFactors.cap_request_actionability : null,
      kb_provenance_verified: qualityFactors && typeof qualityFactors.kb_provenance_verified === 'boolean' ? qualityFactors.kb_provenance_verified : null,
      tokens: qualityFactors && typeof qualityFactors.tokens === 'number' ? qualityFactors.tokens : null,
      paired_with: qualityFactors && typeof qualityFactors.paired_with === 'string' ? qualityFactors.paired_with : null,
      convergence: qualityFactors && typeof qualityFactors.convergence === 'string' ? qualityFactors.convergence : null,
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

module.exports = {
  VALID_VERIFICATION_DEPTHS,
  FULL_EQUIVALENT_DEPTHS,
  cmdRecord,
};
