// Shared file-lock primitive for HETS scripts. Closes 2 CS-1 CRITs in one
// place: kb-resolver + budget-tracker concurrency hazards (per CS-1
// orch-code recommendation #1).
//
// Extraction note: this code was originally inline in agent-identity.js
// (since H.2-bridge) and pattern-recorder.js (since H.1, slight variant).
// H.3.2 unifies both copies + applies the wrapper to 3 more scripts that
// were doing read-modify-write without locks (kb-resolver, budget-tracker,
// tree-tracker — flagged by code-reviewer.nova X-3 in CS-1).
//
// Usage:
//   const { withLock } = require('./_lib/lock');
//   withLock(LOCK_PATH, () => {
//     const data = readStore();
//     data.someField += 1;
//     writeStore(data);
//   });
//
// Stale-lock recovery: if the lock file holds a PID that's no longer alive,
// the wait loop unlinks it and retries. Same logic as the original
// agent-identity implementation.
//
// HT.2.3 (drift-note 75): acquireLock auto-creates the lockfile parent dir
// via `fs.mkdirSync({ recursive: true })` per substrate's lazy-mkdir
// convention (session-end-nudge.js:62 + saveState:125 + pattern-recorder.js:49
// precedents). Closes the opaque-3-sec-timeout-on-ENOENT failure mode that
// HT.1.14 test 77 ephemeral-tmpdir fixture surfaced. Transparent for all
// 10 current production consumers (whose parent dirs are pre-created at
// install); enables future ephemeral-tmpdir tests to "just work".

const fs = require('fs');
const path = require('path');

function acquireLock(lockPath, opts) {
  // HT.2.3: lazy parent-dir creation (drift-note 75) per substrate convention.
  // Recursive mode is idempotent fast-path when dir exists (sub-millisecond stat).
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  const maxWaitMs = (opts && opts.maxWaitMs) || 3000;
  const sleepMs = (opts && opts.sleepMs) || 50;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      return true;
    } catch {
      // Stale lock recovery: if the locking pid is gone, take it over.
      // H.3.6 (CS-2 code-reviewer.jade C-1): the prior version only checked
      // `pid !== process.pid` and skipped cleanup when the lock holds the
      // current PID — but that's exactly the case where the prior incarnation
      // crashed and left a same-PID orphan; without unlink, the process
      // deadlocks against itself until timeout. Now: if pid === process.pid,
      // treat as stale (we'd never legitimately hold our own lock through
      // a fresh withLock() call) and reclaim.
      try {
        const pid = parseInt(fs.readFileSync(lockPath, 'utf8'), 10);
        if (Number.isNaN(pid) || !pid) {
          // Garbage in lock file → assume corrupt + reclaim
          try { fs.unlinkSync(lockPath); } catch { /* race: another process won the reclaim */ }
          continue;
        }
        if (pid === process.pid) {
          // Self-PID orphan from a prior incarnation — reclaim
          try { fs.unlinkSync(lockPath); } catch { /* race: another reclaim won */ }
          continue;
        }
        try { process.kill(pid, 0); } // throws if pid is gone
        catch { try { fs.unlinkSync(lockPath); } catch { /* race: lock already reclaimed */ } continue; }
      } catch { /* lock disappeared between check and read */ }
      const end = Date.now() + sleepMs;
      // H.9.7: intentional busy-wait under tight ms budget (ADR-0006 invariant 3
      // refactor-not-suppress for no-empty rule); JS lacks native sleep < ~10ms
      // resolution short of using Atomics.wait (drift-note candidate H.9.10)
      while (Date.now() < end) { /* spin */ }
    }
  }
  return false;
}

function releaseLock(lockPath) {
  try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
}

// Convenience wrapper that acquires + runs + releases. Exits with code 2
// if lock cannot be acquired within timeout (matches the original
// agent-identity behavior).
function withLock(lockPath, fn, opts) {
  if (!acquireLock(lockPath, opts)) {
    console.error(`Could not acquire lock at ${lockPath} within ${(opts && opts.maxWaitMs) || 3000}ms. Aborting.`);
    process.exit(2);
  }
  try { return fn(); } finally { releaseLock(lockPath); }
}

module.exports = { acquireLock, releaseLock, withLock };
