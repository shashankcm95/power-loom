# Prompt Enrichment — Always Active

## Vagueness Detection Gate

Before acting on any user message, evaluate whether the prompt is **vague**. A prompt is vague if it lacks 2 or more of:
- **Clear task** — what specifically to do
- **Scope** — which files, components, or boundaries
- **Constraints** — what to avoid, what standards to follow
- **Expected output** — what the result should look like

## Skip enrichment for:
- Direct commands: "run the tests", "commit this", "push to main"
- Follow-ups in an active conversation with established context
- Scoped instructions: "add a loading spinner to src/components/Button.tsx"
- Slash commands, simple questions, single-file fixes

## When vague:
1. Check MemPalace `prompt-patterns` room (or `~/.claude/prompt-patterns.json` fallback) for recognized patterns
2. If pattern found with 3+ approvals: auto-apply, show one-line summary, proceed
3. If pattern found with fewer approvals: show enriched prompt, ask "Look right?"
4. If no pattern: activate the prompt-enrichment skill for the full 4-part build

## Sub-Agent Awareness
When delegating to sub-agents, always use the enriched prompt — not the raw input. Sub-agents lack conversation context.
