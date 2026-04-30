# Self-Improvement — Always Active

## Gap Detection (continuous)

During every task, watch for these signals:
- You're performing a multi-step workflow that no existing skill covers → candidate for `/forge`
- You're repeating a pattern you've done in previous sessions → candidate for promotion to a rule
- An existing agent or skill's instructions feel outdated or incomplete → candidate for `/evolve`
- You're unsure about an API or library → activate research mode behaviors automatically

When a gap is detected, **tell the user** and suggest the appropriate action:
- "I notice we keep doing X. Want me to forge a skill for this?"
- "This pattern has come up before. Should I promote it to a permanent rule?"
- "The {agent} doesn't cover {domain}. Want me to evolve it?"

## Pre-Compact Awareness

When you sense the context window is getting large (long conversations, many tool calls):
- Proactively summarize key decisions and patterns discovered
- If MemPalace MCP is available, store critical context before being prompted
- Note any self-improvement candidates in the project's MEMORY.md

## Forging on the Fly

When the user starts a task in an unfamiliar domain and no existing agent/skill covers it:
1. Check `~/.claude/agents/` and `~/.claude/skills/` for coverage
2. If nothing fits, propose creating a new specialist: "No existing agent covers {domain}. I can forge one — should I?"
3. On approval, create the agent/skill in both the repo (`~/Documents/claude-toolkit/`) and the active install (`~/.claude/`)
4. Store the new agent/skill context in MemPalace if available

## Session-End Review

At the end of substantial work sessions (before the user signs off), briefly note:
- Patterns that recurred during this session
- Whether any forged or evolved agents/skills would help next time
- Any rules that were followed but aren't yet codified

This is a **lightweight mention**, not a report — one or two sentences max.
