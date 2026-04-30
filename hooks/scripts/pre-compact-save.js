#!/usr/bin/env node

// PreCompact hook: instructs Claude to save critical context before
// the context window is compressed. Inspired by MemPalace's approach
// of preserving memory at compaction boundaries.

const SAVE_PROMPT = `BEFORE COMPACTING — Save critical context now:

1. **Current task**: What are you working on? What's the status?
2. **Key decisions**: Any architectural or design decisions made this session
3. **Discovered issues**: Bugs, edge cases, or problems found
4. **File paths**: Which files are being actively modified
5. **Next steps**: What should happen after compaction

Write these to the project's CLAUDE.md, .claude/plans/, or memory files so they survive context compression.`;

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  process.stdout.write(SAVE_PROMPT + '\n\n' + input);
});
