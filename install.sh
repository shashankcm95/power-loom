#!/bin/bash
set -euo pipefail

# claude-toolkit installer
# Copies selected components into ~/.claude/ for global use.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"

usage() {
  echo "Usage: $0 [--all | --agents | --rules | --hooks | --commands | --skills]"
  echo ""
  echo "Options:"
  echo "  --all        Install everything"
  echo "  --agents     Install agent definitions"
  echo "  --rules      Install coding rules/guardrails"
  echo "  --hooks      Install hook scripts and merge hook config"
  echo "  --commands   Install slash commands"
  echo "  --skills     Install skill workflows"
  echo ""
  echo "Multiple flags can be combined: $0 --agents --rules --hooks"
  echo "With no flags, shows this help."
  exit 0
}

install_agents() {
  echo "Installing agents..."
  mkdir -p "$CLAUDE_DIR/agents"
  cp "$SCRIPT_DIR"/agents/*.md "$CLAUDE_DIR/agents/"
  echo "  -> $(ls "$SCRIPT_DIR"/agents/*.md | wc -l | tr -d ' ') agents installed"
}

install_rules() {
  echo "Installing rules..."
  mkdir -p "$CLAUDE_DIR/rules/toolkit"
  cp -r "$SCRIPT_DIR"/rules/* "$CLAUDE_DIR/rules/toolkit/"
  echo "  -> Rules installed to ~/.claude/rules/toolkit/"
}

install_hooks() {
  echo "Installing hooks..."
  mkdir -p "$CLAUDE_DIR/hooks/scripts"
  cp "$SCRIPT_DIR"/hooks/scripts/*.js "$CLAUDE_DIR/hooks/scripts/"
  chmod +x "$CLAUDE_DIR"/hooks/scripts/*.js
  echo "  -> Hook scripts installed"
  echo ""
  echo "  NOTE: Hook configuration must be manually merged."
  echo "  Copy the hooks from $SCRIPT_DIR/hooks/settings.json"
  echo "  into your ~/.claude/settings.json under the 'hooks' key."
  echo "  Update script paths to use absolute paths to ~/.claude/hooks/scripts/"
}

install_commands() {
  echo "Installing commands..."
  mkdir -p "$CLAUDE_DIR/commands"
  cp "$SCRIPT_DIR"/commands/*.md "$CLAUDE_DIR/commands/"
  echo "  -> $(ls "$SCRIPT_DIR"/commands/*.md | wc -l | tr -d ' ') commands installed"
}

install_skills() {
  echo "Installing skills..."
  mkdir -p "$CLAUDE_DIR/skills"
  cp -r "$SCRIPT_DIR"/skills/* "$CLAUDE_DIR/skills/"
  echo "  -> Skills installed to ~/.claude/skills/"
}

if [ $# -eq 0 ]; then
  usage
fi

INSTALL_AGENTS=false
INSTALL_RULES=false
INSTALL_HOOKS=false
INSTALL_COMMANDS=false
INSTALL_SKILLS=false

for arg in "$@"; do
  case $arg in
    --all)
      INSTALL_AGENTS=true
      INSTALL_RULES=true
      INSTALL_HOOKS=true
      INSTALL_COMMANDS=true
      INSTALL_SKILLS=true
      ;;
    --agents)   INSTALL_AGENTS=true ;;
    --rules)    INSTALL_RULES=true ;;
    --hooks)    INSTALL_HOOKS=true ;;
    --commands) INSTALL_COMMANDS=true ;;
    --skills)   INSTALL_SKILLS=true ;;
    --help|-h)  usage ;;
    *)
      echo "Unknown option: $arg"
      usage
      ;;
  esac
done

echo "claude-toolkit installer"
echo "========================"
echo ""

$INSTALL_AGENTS  && install_agents
$INSTALL_RULES   && install_rules
$INSTALL_HOOKS   && install_hooks
$INSTALL_COMMANDS && install_commands
$INSTALL_SKILLS  && install_skills

echo ""
echo "Done! Restart Claude Code to pick up the changes."
