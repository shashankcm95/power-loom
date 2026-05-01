#!/bin/bash
# compliance-probe.sh — measures the gap between hook injection and Claude
# compliance. Reads ~/.claude/logs/ to compute:
#   - How often the prompt-enrich-trigger flagged a vague prompt
#   - How often Claude actually responded with [ENRICHED-PROMPT-START]
#     markup (auto-store-enrichment fired)
#   - The compliance ratio (responded markup / flagged)
#
# This is the missing measurement layer identified by the chaos-test
# Architect (Persona 04) and Honesty Auditor (Persona 05). Without it,
# "behavior improved" is unfalsifiable.
#
# Usage:
#   bash scripts/compliance-probe.sh [--last-Nh] [--json]
#
# Options:
#   --last-1h, --last-24h, --last-7d   time window (default: --last-24h)
#   --json                              output JSON instead of human text

set -uo pipefail

LOG_DIR="$HOME/.claude/logs"
WINDOW="--last-24h"
JSON=false

for arg in "$@"; do
  case "$arg" in
    --last-*h|--last-*d) WINDOW="$arg" ;;
    --json) JSON=true ;;
    --help|-h)
      head -25 "$0" | tail -22 | sed 's/^# *//'
      exit 0 ;;
  esac
done

# Compute cutoff timestamp
case "$WINDOW" in
  --last-1h)  hours=1 ;;
  --last-24h) hours=24 ;;
  --last-7d)  hours=168 ;;
  *)
    n=$(echo "$WINDOW" | sed -E 's/--last-([0-9]+)([hd])/\1/')
    unit=$(echo "$WINDOW" | sed -E 's/--last-[0-9]+([hd])/\1/')
    if [ "$unit" = "d" ]; then hours=$((n * 24)); else hours=$n; fi ;;
esac

if date -u -v-"${hours}H" +%Y-%m-%dT%H:%M:%S >/dev/null 2>&1; then
  cutoff=$(date -u -v-"${hours}H" +%Y-%m-%dT%H:%M:%S)
elif date -u --date="${hours} hours ago" +%Y-%m-%dT%H:%M:%S >/dev/null 2>&1; then
  cutoff=$(date -u --date="${hours} hours ago" +%Y-%m-%dT%H:%M:%S)
else
  echo "Error: cannot compute cutoff date (tried BSD -v and GNU --date)" >&2
  exit 1
fi

count_in_window() {
  local file="$1"
  local pattern="$2"
  [ -f "$file" ] || { echo 0; return; }
  awk -v cutoff="$cutoff" -v pat="$pattern" '
    $0 ~ ("\\[" cutoff) || $0 > ("[" cutoff) {
      if ($0 ~ pat) c++
    }
    END { print c+0 }
  ' "$file"
}

# Metric 1: vague prompts injected
flagged=$(count_in_window "$LOG_DIR/prompt-enrich-trigger.log" 'injected')

# Metric 2: enrichment markups stored
stored=$(count_in_window "$LOG_DIR/auto-store-enrichment.log" 'stored')

# Metric 3: enrichment markups detected (parsed but maybe not stored)
detected=$(count_in_window "$LOG_DIR/auto-store-enrichment.log" 'detected')

# Metric 4: fact-force-gate blocks (anti-hallucination effectiveness)
blocked=$(count_in_window "$LOG_DIR/fact-force-gate.log" 'block')

# Metric 5: config-guard blocks
config_blocked=$(count_in_window "$LOG_DIR/config-guard.log" 'block')

# Metric 6: store failures (signals broken integration)
store_failed=$(count_in_window "$LOG_DIR/auto-store-enrichment.log" 'store_failed')

# Compliance ratio: stored / flagged
if [ "$flagged" -gt 0 ]; then
  compliance=$(awk -v s="$stored" -v f="$flagged" 'BEGIN { printf "%.0f", (s/f)*100 }')
else
  compliance="N/A"
fi

if $JSON; then
  cat << EOF
{
  "window": "$WINDOW",
  "cutoff": "$cutoff",
  "metrics": {
    "vaguePromptsFlagged": $flagged,
    "enrichmentsDetected": $detected,
    "enrichmentsStored": $stored,
    "storeFailures": $store_failed,
    "factForceGateBlocks": $blocked,
    "configGuardBlocks": $config_blocked
  },
  "complianceRatio": "$compliance"
}
EOF
  exit 0
fi

# Human output
YELLOW='\033[1;33m'; GREEN='\033[0;32m'; RED='\033[0;31m'; DIM='\033[2m'; BOLD='\033[1m'; RESET='\033[0m'

printf "${BOLD}Toolkit Compliance Probe${RESET}\n"
printf "${DIM}Window: %s   Cutoff: %s${RESET}\n\n" "$WINDOW" "$cutoff"

printf "${BOLD}Prompt enrichment loop${RESET}\n"
printf "  Vague prompts flagged:     %d\n" "$flagged"
printf "  Enrichments detected:      %d\n" "$detected"
printf "  Enrichments stored:        %d\n" "$stored"
if [ "$store_failed" -gt 0 ]; then
  printf "  ${RED}Store failures:            %d${RESET}\n" "$store_failed"
fi

if [ "$flagged" -gt 0 ]; then
  if [ "$compliance" -ge 70 ]; then
    color="$GREEN"
  elif [ "$compliance" -ge 30 ]; then
    color="$YELLOW"
  else
    color="$RED"
  fi
  printf "  ${color}Compliance: %s%%${RESET}  (stored / flagged)\n" "$compliance"
  printf "  ${DIM}Goal: ≥70%% — Claude should produce enrichment markup on most flagged prompts${RESET}\n"
else
  printf "  ${DIM}No vague prompts in this window — nothing to measure${RESET}\n"
fi

printf "\n${BOLD}Anti-hallucination gates${RESET}\n"
printf "  fact-force-gate blocks:    %d\n" "$blocked"
printf "  config-guard blocks:       %d\n" "$config_blocked"

printf "\n${BOLD}Diagnosis${RESET}\n"
if [ "$flagged" -eq 0 ] && [ "$blocked" -eq 0 ]; then
  printf "  ${YELLOW}No hook activity in this window. Either the user wasn't using Claude Code,${RESET}\n"
  printf "  ${YELLOW}or Claude Code isn't loading ~/.claude/settings.json. Run claude-toolkit-status.sh.${RESET}\n"
elif [ "$flagged" -gt 0 ] && [ "$stored" -eq 0 ]; then
  printf "  ${RED}Major gap: $flagged vague prompts flagged but ZERO enrichments stored.${RESET}\n"
  printf "  ${RED}Claude is ignoring the forcing instruction. Investigate.${RESET}\n"
elif [ "$flagged" -gt 0 ] && [ "$compliance" != "N/A" ] && [ "$compliance" -lt 30 ]; then
  printf "  ${YELLOW}Low compliance ($compliance%%). Claude is skipping enrichment most of the time.${RESET}\n"
elif [ "$flagged" -gt 0 ] && [ "$compliance" != "N/A" ] && [ "$compliance" -ge 70 ]; then
  printf "  ${GREEN}Healthy compliance ($compliance%%). The loop is working.${RESET}\n"
fi
