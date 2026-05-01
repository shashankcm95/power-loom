#!/usr/bin/env node

// UserPromptSubmit hook: detects vague prompts and injects a forcing
// instruction that makes the prompt-enrichment skill impossible to skip.
//
// Architecture:
//   - Heuristic vagueness detection runs on every prompt
//   - Clear prompts: silent pass-through, zero overhead
//   - Vague prompts: inject additional context that forces 4-part enrichment
//   - Always evaluates — does NOT skip based on conversation continuity
//
// Detection is intentionally conservative: better to miss some vague prompts
// than to over-flag every clear instruction.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { log: makeLogger } = require('./_log.js');
const log = makeLogger('prompt-enrich-trigger');

// Vague action verbs followed by generic referents.
// Phase-G7: extended referent group `REF` to include plural quantifiers
// (those, these, all, any, every, everything, things, stuff). Centralizes
// the pattern so all verbs benefit from the same set.
const REF = '(?:the|this|that|it|some|a|those|these|all|any|every|everything|things|stuff)';

const VAGUE_KEYWORDS = [
  new RegExp(`\\bfix\\s+${REF}\\b`, 'i'),                // "fix all the bugs"
  new RegExp(`\\bfix\\s+all\\s+(?:the\\s+)?\\w+s?\\b`, 'i'),  // "fix all the bugs"
  /\bmake\s+(?:it|this|that)\s+(?:better|faster|cleaner|nicer|work)/i,
  new RegExp(`\\bimprove\\s+${REF}\\b`, 'i'),
  new RegExp(`\\boptimi[sz]e\\s+${REF}\\b`, 'i'),
  new RegExp(`\\bupdate\\s+${REF}\\b`, 'i'),
  /\bclean\s+(?:up|this|that|it)\b/i,
  /\brefactor\s+(?:the|this|that|it)(?!\s+\S+\.\w+)/i,
  /\bdo\s+(?:something|the\s+thing|stuff)\b/i,
  new RegExp(`\\bhandle\\s+${REF}\\b`, 'i'),
  /\bsort\s+(?:the|this|that|it|things?)\s+out\b/i,
  new RegExp(`\\bcheck\\s+${REF}\\b`, 'i'),
  new RegExp(`\\breview\\s+${REF}\\b`, 'i'),
  new RegExp(`\\bship\\s+${REF}\\b`, 'i'),
  new RegExp(`\\btweak\\s+${REF}\\b`, 'i'),
  new RegExp(`\\brework\\s+${REF}\\b`, 'i'),
  new RegExp(`\\bredo\\s+${REF}\\b`, 'i'),
  new RegExp(`\\bdeal\\s+with\\s+${REF}\\b`, 'i'),
  new RegExp(`\\baddress\\s+${REF}\\b`, 'i'),
  new RegExp(`\\blook\\s+into\\s+${REF}\\b`, 'i'),
  /\bsmooth\s+(?:this|that|it|things?)\s+out\b/i,
  new RegExp(`\\bpolish\\s+${REF}\\b`, 'i'),
  /\btidy\s+(?:up|this|that|it|things?)\b/i,
  /\bthe\s+thing\b/i,
  /\bsome\s+(?:things|stuff|changes)\b/i,
  /\btak(?:e|ing|en)\s+a\s+(?:quick\s+)?look\b/i,
  /\bhav(?:e|ing)\s+a\s+(?:quick\s+)?look\b/i,
];

// Verb-less observation patterns ("X broken on main", "users can't log in")
// — these are bug reports without an action ask. They satisfy length checks
// but are still vague because they don't say what to do.
// Phase-G7 additions: symptom reports without prepositions
// ("the page is white", "tests are red", "memory usage spiking").
const OBSERVATION_PATTERNS = [
  /\b(broken|failing|down|red|hanging|stuck|slow|crashing)\s+(on|in|at)\s+\w+/i,
  /\bcan'?t\s+(log\s+in|sign\s+in|connect|access|reach|see|find)\b/i,
  /\bis\s+(broken|failing|down|red|stuck|hanging|crashing|spiking|wrong|off|weird)\b/i,
  /\bare\s+(broken|failing|down|red|stuck|hanging|crashing|spiking|wrong|off|weird)\b/i,
  /\bhas\s+a\s+(bug|deadlock|race|leak|issue|problem)\b/i,
  /\b(memory|cpu|disk|network|latency)\s+(usage|use)\s+(spiking|climbing|growing|leaking)\b/i,
  /\bsomething\s+(is\s+)?(wrong|off|broken|weird)\b/i,
];

const SKIP_PATTERNS = [
  // Slash commands
  /^\s*\//,
  // Confirmation responses (Phase-C: extended with combinations and common phrases)
  /^\s*(yes|yep|yeah|y|sure|ok|okay|approve|approved|confirm|confirmed|go|go ahead|proceed|continue|do it|please)\s*[.!?]?\s*$/i,
  /^\s*(please\s+)?(proceed|continue|go ahead|do it|carry on|carry on then)\s*[.!?]?\s*$/i,
  /^\s*(sounds?\s+good|looks?\s+good|lgtm|nice|perfect|great|thanks|thank\s+you|ty)\s*[.!?]?\s*$/i,
  /^\s*(no|nope|n|cancel|stop|skip|pass|nvm|never\s*mind)\s*[.!?]?\s*$/i,
  // Numeric / option selection: "1", "option 1", "(a)", "1.", "a.", etc.
  /^\s*\(?[a-z0-9]\)?\s*[.!?]?\s*$/i,
  /^\s*option\s+\(?\w\)?\s*[.!?]?\s*$/i,
  // Wh-questions
  /^\s*(what|how|where|why|when|who|which)\s/i,
  // Aux-verb questions: subject pronoun OR article (e.g., "is the file ready")
  // Note: "do" is excluded — "do the X" is imperative, not a question
  /^\s*(is|are|was|were|will|should|may|might|must|has|have|had|does|did)\s+(you|i|we|they|it|he|she|the|this|that|these|those|there|a|an)\b/i,
  // "do" as question prefix: only when followed by a subject pronoun (not article)
  /^\s*do\s+(you|i|we|they|it|he|she|there)\b/i,
  // Direct verb-first commands
  /^\s*(run|execute|test|build|deploy|commit|push|pull|merge|rebase|stash|install|undo|revert)\s/i,
  // Tool-prefixed commands (git push, npm install, etc.)
  // Phase-C: tightened — "node fix it" should NOT skip. The matched word
  // after the tool name must look like a sub-command (lowercase, ASCII).
  /^\s*(git|npm|yarn|pnpm|bun|cargo|python|deno|docker|kubectl|make|cmake|gradle|mvn|dotnet|rustc|tsc|eslint|prettier)\s+(install|run|test|build|push|pull|exec|status|log|init|add|remove|update|start|stop|fmt|check|publish|version|completion)\b/i,
  // Show/explain (informational)
  /^\s*(show|explain|describe|list|tell|display)\s/i,
];

// Phase-C: aux-verb question prefixes that should NOT auto-skip if the body
// contains a vague keyword. ("could you fix the auth" → still flag.)
const POLITENESS_PREFIXES = [
  /^\s*(?:hey\s+)?(?:could|would|can|will)\s+you\s+(?:please\s+)?(?:if\s+(?:its|it'?s)\s+not\s+too\s+much\s+trouble\s+)?/i,
  /^\s*(?:would|could)\s+you\s+mind\s+/i,
  /^\s*(?:please\s+)/i,
  /^\s*(?:hey\s+|hi\s+|sorry\s+)/i,
];

function stripPolitenessPadding(prompt) {
  let stripped = prompt;
  for (let i = 0; i < 3; i++) {
    let changed = false;
    for (const pattern of POLITENESS_PREFIXES) {
      const newStripped = stripped.replace(pattern, '');
      if (newStripped !== stripped) {
        stripped = newStripped;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return stripped.trim();
}

function hasFilePath(prompt) {
  // Phase-G: strip URLs FIRST before checking for paths. Otherwise
  // "https://example.com" matches hasFilePath via /example.com and
  // bypasses the vagueness gate.
  const noUrls = prompt.replace(/https?:\/\/[^\s]+/gi, '');
  return /(?:\/[\w.-]+){2,}/.test(noUrls) ||
         /\/[\w.-]+\.\w{1,10}\b/.test(noUrls) ||
         /\b\w+\.(ts|tsx|js|jsx|py|rs|go|rb|md|json|yaml|yml|toml|sh|sql|css|scss|html|vue|svelte|tf|hcl|proto)\b/i.test(noUrls) ||
         /\b(src|app|lib|components?|pages?|api|tests?|hooks?|utils?|services?|controllers?|models?)\/\w+/i.test(noUrls);
}

// Phase-G8: hasSpecificEntity tightened. The previous version short-
// circuited the gate on URLs alone, camelCase tokens like "fixIt", or
// fenced code blocks — letting "fix it" + URL escape enrichment.
//
// New criteria require entity to provide REAL specificity (a recognized
// identifier with multi-word camelCase OR a substantive backtick code
// snippet OR a quoted string of meaningful length). URLs and lone-token
// patterns no longer count.
function hasSpecificEntity(prompt) {
  // Strip URLs first — they're not specificity (per Phase-G hacker finding).
  const text = prompt.replace(/https?:\/\/[^\s]+/gi, '');

  // PascalCase ≥8 chars total (catches "MyController", "UserService" but
  // not short "MyAa" or "fixIt"). Length check is programmatic since
  // regex can't naturally express min-total-length.
  const pascalMatches = text.match(/\b[A-Z][a-z]+[A-Z]\w*/g) || [];
  if (pascalMatches.some((m) => m.length >= 8)) return true;
  // camelCase ≥8 chars total ("doSomething", "isReady" wouldn't count)
  const camelMatches = text.match(/\b[a-z]+[A-Z]\w*/g) || [];
  if (camelMatches.some((m) => m.length >= 8)) return true;
  // Function calls with explicit parens
  if (/\b\w+\([^)]*\)/.test(text)) return true;
  // Substantive backtick code (≥4 chars)
  if (/`[^`]{4,}`/.test(text)) return true;
  // Quoted strings ≥5 chars
  if (/"[^"]{5,}"|'[^']{5,}'/.test(text)) return true;
  return false;
}

function isObservationOnly(prompt) {
  return OBSERVATION_PATTERNS.some((p) => p.test(prompt));
}

function isVague(prompt) {
  const trimmed = prompt.trim();

  // 1. Vague keywords are the highest-signal flag — check first, even before
  //    skip patterns, so "build broken on main" (which starts with the
  //    verb-first command word "build") still gets caught.
  if (
    VAGUE_KEYWORDS.some((p) => p.test(trimmed)) &&
    !hasFilePath(trimmed) &&
    !hasSpecificEntity(trimmed)
  ) {
    return true;
  }

  // 2. Observation-only patterns (verb-less bug reports). Same rationale:
  //    catch BEFORE the verb-first command skip (which would falsely match
  //    "build broken on main" because of the leading "build").
  if (isObservationOnly(trimmed) && !hasFilePath(trimmed) && !hasSpecificEntity(trimmed)) {
    return true;
  }

  // 3. Politeness padding around vague verbs. ALWAYS check, regardless of
  //    whether a skip pattern matches — politeness questions like "would
  //    you mind fixing the auth" are still vague underneath.
  const looksLikePolitenessQuestion = /^\s*(?:hey\s+)?(?:could|would|can|will|do)\s+you\b/i.test(trimmed);
  if (looksLikePolitenessQuestion) {
    const stripped = stripPolitenessPadding(trimmed);
    if (
      VAGUE_KEYWORDS.some((p) => p.test(stripped)) ||
      isObservationOnly(stripped) ||
      (stripped.length < 15 && !hasFilePath(stripped) && !hasSpecificEntity(stripped))
    ) {
      return true;
    }
  }

  // 4. Now check explicit skip patterns. If matched, the prompt is clear.
  if (SKIP_PATTERNS.some((p) => p.test(trimmed))) return false;

  // 5. Length-based catch-all for very short prompts.
  if (trimmed.length < 15 && !hasFilePath(trimmed) && !hasSpecificEntity(trimmed)) {
    return true;
  }

  return false;
}

function buildForcingInstruction(rawPrompt) {
  // Phase-C: slice BEFORE escape (avoids trailing backslash from \" at boundary)
  const safeSlice = rawPrompt.slice(0, 200).replace(/"/g, '\\"');
  return `[PROMPT-ENRICHMENT-GATE]

The user's prompt has been flagged as VAGUE by the deterministic enrichment hook. Before acting, you MUST:

1. **Check existing patterns**: \`node ~/.claude/scripts/prompt-pattern-store.js lookup --raw "<raw prompt>"\`
2. **Build the 4-part enriched prompt** wrapped in [ENRICHED-PROMPT-START]...[ENRICHED-PROMPT-END] markers (the auto-store hook reads these to persist the pattern):
\`\`\`
[ENRICHED-PROMPT-START]
RAW: <original user prompt>
CATEGORY: <refactor|bugfix|feature|review|docs|other>
TECHNIQUES: <comma-separated, e.g. chain-of-thought,rag>
INSTRUCTIONS: <what to do, how, constraints>
CONTEXT: <relevant background>
INPUT: <files/data involved>
OUTPUT: <expected deliverable>
[ENRICHED-PROMPT-END]
\`\`\`
3. **Show this to the user** unless a pattern lookup found 5+ approvals (auto-apply with one-line summary).
4. **Wait for approval** before executing.

Raw user prompt: "${safeSlice}"

This is a deterministic gate — do NOT skip enrichment based on conversation context. Vagueness is the only criterion.

[/PROMPT-ENRICHMENT-GATE]`;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const userPrompt = data.prompt || '';

    log('invoked', { promptPreview: userPrompt.slice(0, 100), promptLen: userPrompt.length });

    if (!userPrompt) {
      log('skipped', { reason: 'no_prompt' });
      return;
    }

    const vague = isVague(userPrompt);
    log('classified', { vague });

    if (!vague) {
      return;
    }

    log('injected', { instruction: 'PROMPT-ENRICHMENT-GATE' });
    process.stdout.write(buildForcingInstruction(userPrompt));
  } catch (err) {
    log('error', { error: err.message });
  }
});
