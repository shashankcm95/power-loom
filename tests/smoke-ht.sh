# tests/smoke-ht.sh — HT.1.x phase-era + H.8.7 trailer smoke tests.
#
# Sourced by install.sh run_smoke_tests() function; mutates parent-scope
# $passed and $failed counters via bash lexical-scope inheritance.
#
# Per HT.1.4 (ADR-0002 cross-language application — bash sourced-file
# post-split shape). Test count: 3 (tests 69-70 — HT.1.1 noCritiqueLanguage;
# test 65 — H.8.7 adr.js symlink defense, intentional trailer position per
# HT.0.7 audit anomaly preservation).
#
# Source order: tests 69, 70 first (HT.1.1 phase tests in numeric order),
# then test 65 (H.8.7 trailer) last — preserves the original execution
# order of run_smoke_tests pre-extraction.
#
# DO NOT execute directly — depends on parent-scope `local passed`,
# `local failed`, and `$CLAUDE_DIR` / `$SCRIPT_DIR` set by install.sh.

  # Test 69: HT.1.1 — noCritiqueLanguage antiPatternCheck (positive: clean documentary output → A4 pass + verdict pass)
  echo -n "  Test 69 (HT.1.1 noCritiqueLanguage A4 passes on clean documentary output): "
  T69_TMPDIR=$(mktemp -d)
  T69_CONTRACT="$T69_TMPDIR/contract.json"
  T69_OUTPUT="$T69_TMPDIR/output.md"
  cat > "$T69_CONTRACT" <<EOF
{
  "agentId": "test-no-critique-positive",
  "persona": "test-documentary",
  "role": "actor",
  "documentary": true,
  "antiPattern": [
    { "id": "A4", "check": "noCritiqueLanguage", "args": { "forbidden_phrases": ["should be", "recommend", "anti-pattern"] }, "severity": "warn" }
  ]
}
EOF
  cat > "$T69_OUTPUT" <<EOF
# Documentary output (clean)

The function getCwd at src/util.js:42 returns the current working directory.
The caller at src/main.js:10 passes the result to processFile.
EOF
  T69_OUT=$(node "$SCRIPT_DIR/scripts/agent-team/contract-verifier.js" --contract "$T69_CONTRACT" --output "$T69_OUTPUT" 2>/dev/null)
  T69_VERDICT=$(echo "$T69_OUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('verdict', ''))")
  T69_A4_STATUS=$(echo "$T69_OUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('antiPattern', {}).get('A4', {}).get('status', ''))")
  if [ "$T69_VERDICT" = "pass" ] && [ "$T69_A4_STATUS" = "pass" ]; then
    echo "OK (verdict=pass + A4=pass)"
    passed=$((passed + 1))
  else
    echo "FAIL: verdict=$T69_VERDICT A4=$T69_A4_STATUS (want verdict=pass + A4=pass)"
    failed=$((failed + 1))
  fi
  rm -rf "$T69_TMPDIR"

  # Test 70: HT.1.1 — noCritiqueLanguage antiPatternCheck (negative: forbidden phrase → A4 warn + verdict partial)
  echo -n "  Test 70 (HT.1.1 noCritiqueLanguage A4 warns on forbidden-phrase output): "
  T70_TMPDIR=$(mktemp -d)
  T70_CONTRACT="$T70_TMPDIR/contract.json"
  T70_OUTPUT="$T70_TMPDIR/output.md"
  cat > "$T70_CONTRACT" <<EOF
{
  "agentId": "test-no-critique-negative",
  "persona": "test-documentary",
  "role": "actor",
  "documentary": true,
  "antiPattern": [
    { "id": "A4", "check": "noCritiqueLanguage", "args": { "forbidden_phrases": ["should be", "recommend", "anti-pattern"] }, "severity": "warn" }
  ]
}
EOF
  cat > "$T70_OUTPUT" <<EOF
# Documentary output (with critique slip)

The function getCwd at src/util.js:42 returns the cwd. This should be refactored
to use a more idiomatic shape per the existing convention at src/main.js:10.
EOF
  T70_OUT=$(node "$SCRIPT_DIR/scripts/agent-team/contract-verifier.js" --contract "$T70_CONTRACT" --output "$T70_OUTPUT" 2>/dev/null)
  T70_VERDICT=$(echo "$T70_OUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('verdict', ''))")
  T70_A4_STATUS=$(echo "$T70_OUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('antiPattern', {}).get('A4', {}).get('status', ''))")
  T70_A4_FOUND=$(echo "$T70_OUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('antiPattern', {}).get('A4', {}).get('foundPhrase', ''))")
  if [ "$T70_VERDICT" = "partial" ] && [ "$T70_A4_STATUS" = "warn" ] && [ "$T70_A4_FOUND" = "should be" ]; then
    echo "OK (verdict=partial + A4=warn + foundPhrase=should be)"
    passed=$((passed + 1))
  else
    echo "FAIL: verdict=$T70_VERDICT A4=$T70_A4_STATUS foundPhrase=$T70_A4_FOUND (want verdict=partial + A4=warn + foundPhrase='should be')"
    failed=$((failed + 1))
  fi
  rm -rf "$T70_TMPDIR"
  # Test 65: H.8.7 — adr.js symlink defense (chaos M3)
  echo -n "  Test 65 (H.8.7 adr.js symlink defense; symlink in ADRS_DIR ignored): "
  T65_TMPDIR=$(mktemp -d)
  T65_ADRS="$T65_TMPDIR/adrs"
  T65_TARGET="$T65_TMPDIR/target"
  mkdir -p "$T65_ADRS" "$T65_TARGET"
  # Plant a symlink with valid-looking name pointing outside
  ln -s "$T65_TARGET/0099-malicious.md" "$T65_ADRS/0099-malicious.md" 2>/dev/null
  # touched-by + active should not crash + should not include the symlink as a loaded ADR
  T65_LIST=$(HETS_ADRS_DIR="$T65_ADRS" node "$SCRIPT_DIR/scripts/agent-team/adr.js" list 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('count', -1))")
  if [ "$T65_LIST" = "0" ]; then
    echo "OK (symlink filtered out)"
    passed=$((passed + 1))
  else
    echo "FAIL: list count = $T65_LIST (want 0)"
    failed=$((failed + 1))
  fi
  rm -rf "$T65_TMPDIR"
