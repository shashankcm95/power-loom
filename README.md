# claude-toolkit

A curated, opinionated enhancement layer for Claude Code. Agents, rules, hooks, commands, and skills that improve how Claude operates — across any project, any stack.

Built from original work, informed by architectural patterns from [everything-claude-code](https://github.com/affaan-m/everything-claude-code), [MemPalace](https://github.com/mempalace/mempalace), [MiroFish](https://github.com/666ghj/MiroFish), and [claude-superpowers](https://github.com/ivan-magda/claude-superpowers). See [ATTRIBUTION.md](ATTRIBUTION.md) for details.

## What's Inside

| Component | Count | Purpose |
|-----------|-------|---------|
| **Agents** | 5 | Specialized subagents: planner, code-reviewer, security-auditor, architect, optimizer |
| **Rules** | 5 | Always-on guardrails: coding fundamentals, security, workflow + optional language packs (TypeScript, React/Next.js) |
| **Hooks** | 4 | Deterministic automations: config protection, console.log detection, pre-compact memory save, desktop notifications |
| **Commands** | 3 | Slash entry points: `/review`, `/plan`, `/security-audit` |
| **Skills** | 3 | Workflow guides: full-stack dev, deploy checklist, agent swarm orchestration |

## Design Philosophy

- **Hooks over prompts**: Critical behaviors are enforced by deterministic scripts, not LLM instructions that can be forgotten.
- **Agents with scoped access**: Each agent declares its tools and model tier. Opus for reasoning, Sonnet for mechanical work.
- **Rules as guardrails**: Injected into every session. Concise enough not to bloat context, specific enough to prevent real mistakes.
- **Memory at boundaries**: Pre-compact hooks save context before window compression, preventing knowledge loss in long sessions.

## Install

```bash
# Clone the repo
git clone <your-repo-url> ~/Documents/claude-toolkit

# Install everything
./install.sh --all

# Or install selectively
./install.sh --agents --rules --hooks
```

### What goes where

| Component | Installed to |
|-----------|-------------|
| Agents | `~/.claude/agents/` |
| Rules | `~/.claude/rules/toolkit/` |
| Hook scripts | `~/.claude/hooks/scripts/` |
| Commands | `~/.claude/commands/` |
| Skills | `~/.claude/skills/` |

### Hook configuration

Hook scripts are installed automatically, but the hook _configuration_ must be manually merged into your `~/.claude/settings.json`. Copy the `hooks` key from `hooks/settings.json` and update the script paths to absolute paths.

## Structure

```
claude-toolkit/
├── agents/
│   ├── planner.md           # Phased implementation planning
│   ├── code-reviewer.md     # Severity-based code review
│   ├── security-auditor.md  # OWASP Top 10 + secret detection
│   ├── architect.md         # System design + ADRs
│   └── optimizer.md         # Harness configuration tuning
├── rules/
│   ├── core/
│   │   ├── fundamentals.md  # KISS, DRY, YAGNI, immutability
│   │   ├── security.md      # Pre-commit security checklist
│   │   └── workflow.md      # Git, testing, deploy standards
│   ├── typescript/
│   │   └── style.md         # Type discipline, Zod, no console.log
│   └── web/
│       └── react-nextjs.md  # Server/client boundaries, hooks, keys
├── hooks/
│   ├── scripts/
│   │   ├── config-guard.js      # Block linter/formatter config edits
│   │   ├── console-log-check.js # Warn about console.log on stop
│   │   ├── pre-compact-save.js  # Save context before compaction
│   │   └── desktop-notify.js    # macOS notification on completion
│   └── settings.json            # Hook configuration template
├── commands/
│   ├── review.md            # /review — invoke code-reviewer
│   ├── plan.md              # /plan — invoke planner
│   └── security-audit.md    # /security-audit — invoke security-auditor
├── skills/
│   ├── fullstack-dev/       # Server-first development workflow
│   ├── deploy-checklist/    # Pre-deploy verification
│   └── agent-swarm/         # Multi-agent orchestration
├── install.sh
├── LICENSE
├── ATTRIBUTION.md
└── README.md
```

## Extending

- **Add a new agent**: Create a `.md` file in `agents/` with YAML frontmatter (name, description, tools, model, color) and markdown instructions.
- **Add a rule**: Create a `.md` file in the appropriate `rules/` subdirectory. Add YAML `paths` frontmatter for language-specific rules.
- **Add a hook**: Create a `.js` script in `hooks/scripts/`, then add the configuration entry to `hooks/settings.json`.
- **Add a skill**: Create a directory in `skills/` with a `SKILL.md` file describing the workflow.
- **Add a command**: Create a `.md` file in `commands/` with the slash command name and delegation instructions.

## License

MIT. See [LICENSE](LICENSE).
