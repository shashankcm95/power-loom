#!/usr/bin/env node

// Notification hook (async): sends a desktop notification when Claude needs
// the user — either waiting for permission or idle waiting for input.
// Non-blocking, with a 20-second cooldown to prevent notification spam.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const COOLDOWN_MS = 20 * 1000;
const COOLDOWN_FILE = path.join(os.tmpdir(), 'claude-notify-waiting-cooldown.json');

function isInCooldown(notificationKey) {
  try {
    const data = JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
    const lastNotified = data[notificationKey] || 0;
    return Date.now() - lastNotified < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function recordNotification(notificationKey) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
  } catch { /* fresh file */ }
  data[notificationKey] = Date.now();
  try {
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data));
  } catch { /* non-critical */ }
}

function sendNotification(title, message, sound) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      // macOS: osascript
      const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}" sound name "${sound}"`;
      execSync(`osascript -e '${script}'`, { timeout: 3000, stdio: 'ignore' });
    } else if (platform === 'linux') {
      // Linux: notify-send
      execSync(`notify-send "${title}" "${message}" -u normal`, { timeout: 3000, stdio: 'ignore' });
    }
    // Windows / WSL / other: silently skip — no portable notification API
  } catch {
    // Never block on notification failures
  }
}

function buildMessage(notificationType, notificationData) {
  if (notificationType === 'permission_prompt') {
    const toolName = notificationData?.tool_name || 'a tool';
    return {
      title: 'Claude needs permission',
      message: `Approve ${toolName} to continue.`,
      sound: 'Ping',
      cooldownKey: `permission:${toolName}`,
    };
  }

  if (notificationType === 'idle_prompt') {
    const idleSec = notificationData?.idle_duration_seconds;
    const idleText = idleSec ? `${Math.round(idleSec)}s` : '';
    return {
      title: 'Claude is waiting',
      message: idleText ? `Idle for ${idleText} — your input is needed.` : 'Your input is needed.',
      sound: 'Pop',
      cooldownKey: 'idle',
    };
  }

  // Unknown notification type — generic message
  return {
    title: 'Claude Code',
    message: 'Attention needed.',
    sound: 'Ping',
    cooldownKey: 'generic',
  };
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  // Always pass input through (don't break the pipeline)
  process.stdout.write(input);

  try {
    const data = JSON.parse(input);
    const notificationType = data.notification_type || data.type || '';
    const notificationData = data.notification_data || data.data || {};

    const { title, message, sound, cooldownKey } = buildMessage(notificationType, notificationData);

    // Skip if we recently sent the same notification
    if (isInCooldown(cooldownKey)) {
      return;
    }

    recordNotification(cooldownKey);
    sendNotification(title, message, sound);
  } catch {
    // Non-critical — never block on notification failures
  }
});
