# Prompt Enrichment — Structured Prompt Builder

Transform vague user prompts into structured, actionable prompts that reduce miscommunication and produce better outcomes. Uses a 4-part framework with technique selection.

## When This Activates

Called by the `prompt-enrich-trigger.js` UserPromptSubmit hook, which injects a `[PROMPT-ENRICHMENT-GATE]` instruction into Claude's context whenever a user prompt is classified as vague.

## Step 0: Look up existing patterns FIRST

Before building a new enrichment, check if a similar pattern is already stored. Run:

```bash
node ~/.claude/hooks/scripts/prompt-pattern-store.js lookup --raw "<raw user prompt>"
```

This returns JSON. Behavior depends on `bestMatch` and `bestMatchTier`:
- `bestMatch.score >= 0.8` AND `bestMatchTier == "Independent"` (5+ approvals) → silently apply the stored enrichment, show only a one-line summary like *"Using your established pattern for {category} (5+ approvals)."* Skip steps 1–4.
- `bestMatch.score >= 0.8` AND `bestMatchTier == "Trusted"` (3–4 approvals) → show one-line summary, auto-proceed unless user objects.
- `bestMatch.score >= 0.8` AND `bestMatchTier == "Familiar"` (1–2 approvals) → show stored enrichment, ask "Look right?"
- No match (or score < 0.8) → continue to Step 1 to build a new enrichment.

## Step 1: Classify and Select Techniques

Analyze the raw prompt and select the appropriate prompting techniques:

| User Intent | Technique | Why |
|-------------|-----------|-----|
| Reasoning-heavy task (debug, architect, optimize) | **Chain of Thought** | Forces step-by-step reasoning, reduces errors |
| Format-sensitive output (API design, schema, config) | **Few-Shot** | Examples anchor the expected shape |
| Task with known failure modes | **Negative Prompting** | "Do NOT do X" prevents repeat mistakes |
| Task needing project context | **RAG** | Pull from MemPalace, MEMORY.md, or local files |
| Simple unfamiliar task | **Zero-Shot** | Clear instructions suffice without examples |

Multiple techniques can combine. Chain-of-thought + negative prompting is common for debugging.

## Step 2: Build the 4-Part Prompt

Structure the enriched prompt with these sections:

### Instructions
- What specifically to do (verb + object + qualifier)
- How to approach it (technique-specific framing)
- What constraints apply
- What NOT to do (negative prompting, drawn from past corrections if available)

### Context
- Relevant project background (from MEMORY.md, MemPalace, or conversation)
- Related files and their purposes (quick Glob/Grep to identify)
- Architectural patterns in use
- Previous decisions that affect this task

### Input Data
- Specific files, components, or code sections involved
- Error messages, logs, or symptoms if debugging
- Requirements or specifications if building
- Reference implementations or examples if available

### Output Indicator
- Expected deliverable type (code, plan, review, explanation, config)
- Format constraints (language, framework patterns, file structure)
- Quality criteria (tests required? docs? backward compatible?)
- Scope boundaries (which files to touch, which to leave alone)

## Step 3: Size Check and Summary

If the enriched prompt exceeds ~500 words:
- Show a **summary view** (one sentence per section, ~4 lines total)
- Indicate: "Full enriched prompt is [N] words. Showing summary. Say 'show full' to see everything."

If under 500 words, show the full enriched prompt.

## Step 4: Present for Review

Show the enriched prompt to the user with clear formatting:

```
📋 Enriched Prompt:

**Instructions**: [what to do, how, constraints]
**Context**: [relevant background pulled from project]
**Input**: [specific files/data involved]
**Output**: [expected deliverable and format]

[Technique tags: #chain-of-thought #negative-prompting]

Approve, modify, or say "just do it" to skip enrichment.
```

### User Responses
- **Approve** (yes, looks good, go ahead): Execute the enriched prompt. Store pattern.
- **Modify** (change X to Y, also include Z): Apply changes. Show updated version. Re-present.
- **Skip** ("just do it", "skip"): Execute raw prompt as-is. Don't store pattern.
- **Always skip for this type**: Store a "skip" preference for this task category.

## Step 5: Store Pattern

On approval, **always** store the pattern by running the storage CLI:

```bash
node ~/.claude/hooks/scripts/prompt-pattern-store.js store \
  --raw "<original user prompt>" \
  --enriched "<full enriched prompt>" \
  --category "<refactor|bugfix|feature|review|docs|other>" \
  --techniques "chain-of-thought,rag" \
  --modified "true|false"
```

This writes to `~/.claude/prompt-patterns.json` (the canonical local store, used regardless of MemPalace availability — it's the source of truth that the lookup step queries).

The CLI handles approval-count incrementing automatically: if a similar pattern (≥80% Jaccard similarity on word overlap) exists, it bumps that pattern's count. Otherwise it creates a new one.

**Optional: also store in MemPalace** if MCP is available. Use `mcp__mempalace__store_memory` with the `prompt-patterns` room. The local JSON is the source of truth; MemPalace is for cross-machine semantic search.

After storing, the CLI returns the new tier for that pattern. Tell the user briefly: *"Pattern stored — now at Familiar tier (2 approvals). One more and it'll auto-apply silently."*

## Step 6: Execute

Run the enriched prompt through the normal Claude workflow:
- If the task maps to an existing agent (planner, code-reviewer, etc.), delegate with the enriched prompt
- If it's direct work, proceed with the structured context
- The enriched prompt becomes the working context — not the raw input

## Confidence Tiers

The system gains independence through approval accumulation:

| Tier | Approval Count | Behavior |
|------|---------------|----------|
| **Learning** | 0 | Full enrichment shown, must approve |
| **Familiar** | 1–2 | Enrichment shown with "Looks right?" confirmation |
| **Trusted** | 3–4 | One-line summary shown, auto-proceeds after 3s |
| **Independent** | 5+ | Silent enrichment, no confirmation needed |

User can always override: "show me the prompt" forces full display regardless of tier.

## Example

**Raw prompt**: "fix the login"

**Enriched prompt**:
- **Instructions**: Debug and fix the login authentication flow. Use chain-of-thought reasoning to trace the failure path. Do NOT modify the OAuth provider configuration or change the session storage mechanism.
- **Context**: Project uses Auth.js v5 with GitHub OAuth. Auth config is at `src/lib/auth.ts`. Session management uses JWT strategy. Recent MEMORY.md notes mention a redirect loop issue after OAuth callback.
- **Input**: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, browser console errors if available.
- **Output**: Fixed authentication code with explanation of root cause. Include test for the fix. Preserve backward compatibility with existing sessions.
