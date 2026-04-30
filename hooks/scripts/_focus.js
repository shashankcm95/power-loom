// Shared helper: detects whether Claude Code's terminal/editor is currently
// the focused (frontmost) application. Used by notification hooks to avoid
// spamming the user when they're already watching the terminal.
//
// Returns true if the user appears to be actively viewing Claude Code.
// Returns false if Claude Code is in the background (or focus can't be detected).
//
// On detection failure, returns false so notifications still fire (better to
// over-notify than to miss a real waiting state).

const { execSync } = require('child_process');

const TERMINAL_APPS_MACOS = [
  // Claude apps (Claude Desktop, Claude Code Desktop)
  'Claude', 'Claude Code',
  // Terminals
  'Terminal', 'iTerm2', 'iTerm', 'Warp', 'Hyper', 'Alacritty',
  'kitty', 'WezTerm', 'Tabby', 'Ghostty',
  // Editors with integrated terminals
  'Code', 'Code - Insiders', 'Cursor', 'Windsurf', 'Zed',
];

const TERMINAL_KEYWORDS_LINUX = [
  // Claude apps
  'claude',
  // Terminals
  'terminal', 'iterm', 'warp', 'kitty', 'alacritty', 'tilix',
  'gnome-terminal', 'konsole', 'xterm', 'wezterm', 'tmux',
  // Editors with integrated terminals
  'code', 'vscode', 'cursor', 'windsurf', 'zed',
];

function isClaudeFocusedMacOS() {
  try {
    const app = execSync(
      `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
      { timeout: 2000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();

    return TERMINAL_APPS_MACOS.some(t => app === t || app.toLowerCase().includes(t.toLowerCase()));
  } catch {
    return false;
  }
}

function isClaudeFocusedLinux() {
  try {
    // Try xdotool first
    const winName = execSync('xdotool getactivewindow getwindowname 2>/dev/null', {
      timeout: 1000,
      encoding: 'utf8',
    }).trim().toLowerCase();

    return TERMINAL_KEYWORDS_LINUX.some(t => winName.includes(t));
  } catch {
    return false;
  }
}

function isClaudeFocused() {
  // Allow user override via env var
  if (process.env.CLAUDE_NOTIFY_ALWAYS === '1') return false;
  if (process.env.CLAUDE_NOTIFY_NEVER === '1') return true;

  const platform = process.platform;
  if (platform === 'darwin') return isClaudeFocusedMacOS();
  if (platform === 'linux') return isClaudeFocusedLinux();

  // Other platforms: can't detect, default to not focused (notify)
  return false;
}

module.exports = { isClaudeFocused };
