#!/usr/bin/env node

/**
 * Auto-update changelog from git commits
 * Runs on post-commit hook
 * Routes commits to the correct changelog:
 *   - Rex changes → app/rex-changelog/ChangelogClient.tsx
 *   - Saabai/Lex/site changes → app/saabai-changelog/SaabaiChangelogClient.tsx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const message = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
  const date = execSync('git log -1 --pretty=%ad --date=short', { encoding: 'utf-8' }).trim();
  const filesChanged = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf-8' }).trim().split('\n');

  if (!message || message.startsWith('changelog: auto-update')) {
    process.exit(0);
  }

  // Determine scope from commit message prefix
  let scope = null;
  const scopeMatch = message.match(/\(([^)]+)\)/);
  if (scopeMatch) {
    const scopeLower = scopeMatch[1].toLowerCase();
    if (scopeLower === 'rex') scope = 'rex';
    else if (['lex', 'saabai', 'admin'].includes(scopeLower)) scope = 'saabai';
  }

  // Fallback: determine scope from files changed
  if (!scope) {
    const rexPaths = ['lib/rex-', 'app/api/pete-chat', 'app/api/rex-', 'app/components/PeterAvatarWidget', 'app/rex-', 'app/rex-widget'];
    const saabaiPaths = ['app/counsel-backup', 'app/saabai-', 'app/components/ChatWidget', 'app/api/saabai-', 'app/tributum', 'app/use-cases', 'app/process', 'app/services', 'app/leadgen', 'app/leadgen-widget', 'app/leadgen-dashboard'];

    let hasRex = filesChanged.some(f => rexPaths.some(p => f.startsWith(p)));
    let hasSaabai = filesChanged.some(f => saabaiPaths.some(p => f.startsWith(p)));

    if (hasRex && !hasSaabai) scope = 'rex';
    else if (hasSaabai && !hasRex) scope = 'saabai';
    else if (hasRex && hasSaabai) scope = 'both';
  }

  // If still no scope, skip (don't update anything)
  if (!scope) {
    process.exit(0);
  }

  // Parse tag and title from commit message
  let tag = 'UPDATE';
  let title = message.split('\n')[0];

  const tagMatch = title.match(/^\[([A-Z]+)\]\s*(.+)/);
  if (tagMatch) {
    tag = tagMatch[1];
    title = tagMatch[2];
  } else {
    const lower = title.toLowerCase();
    if (lower.startsWith('fix')) tag = 'FIX';
    else if (lower.startsWith('feat') || lower.includes('add ') || lower.includes('new ')) tag = 'NEW';
    else if (lower.includes('ui') || lower.includes('style')) tag = 'UI';
    else if (lower.includes('improve') || lower.includes('refactor')) tag = 'IMPROVEMENT';
    else if (lower.includes('price') || lower.includes('pricing')) tag = 'PRICING';
    else if (lower.startsWith('test')) tag = 'DEBUG';
  }

  // Strip conventional commit prefix from display title
  title = title.replace(/^[a-z]+\([^)]*\):\s*/i, '');
  title = title.replace(/^[a-z]+:\s*/i, '');
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Format date: "2026-04-22" → "22 Apr 2026"
  const [year, month, day] = date.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formattedDate = `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;

  // Get current AEST time
  const now = new Date(Date.now() + 10 * 3600 * 1000);
  const time = now.getUTCHours().toString().padStart(2, '0') + ':' + now.getUTCMinutes().toString().padStart(2, '0');

  const newEntry = `      { time: "${time}", tag: "${tag}", title: "${title.replace(/"/g, '\\"').replace(/\n/g, ' ')}" }`;
  const dateMarker = `date: "${formattedDate}"`;

  function updateChangelog(changelogPath) {
    let content = fs.readFileSync(changelogPath, 'utf-8');

    if (content.includes(dateMarker)) {
      // Insert as first entry in existing day block
      const datePos = content.indexOf(dateMarker);
      const entriesPos = content.indexOf('entries: [', datePos);
      const bracketPos = content.indexOf('[', entriesPos) + 1;
      content = content.slice(0, bracketPos) + '\n' + newEntry + ',' + content.slice(bracketPos);
    } else {
      // Create new day block at top of CHANGELOG array
      const marker = 'const CHANGELOG: Day[] = [\n';
      const insertPos = content.indexOf(marker);
      if (insertPos === -1) return;
      const newDay = `  {\n    date: "${formattedDate}",\n    entries: [\n${newEntry}\n    ],\n  },\n`;
      content = content.slice(0, insertPos + marker.length) + newDay + content.slice(insertPos + marker.length);
    }

    fs.writeFileSync(changelogPath, content, 'utf-8');
  }

  const targets = [];
  if (scope === 'rex' || scope === 'both') {
    targets.push(path.join(__dirname, '../app/rex-changelog/ChangelogClient.tsx'));
  }
  if (scope === 'saabai' || scope === 'both') {
    targets.push(path.join(__dirname, '../app/saabai-changelog/SaabaiChangelogClient.tsx'));
  }

  targets.forEach(updateChangelog);

  // Stage all updated changelogs
  const stagePaths = targets.map(t => path.relative(path.join(__dirname, '..'), t));
  execSync(`git add ${stagePaths.join(' ')}`, { encoding: 'utf-8' });

  process.exit(0);
} catch (err) {
  process.exit(0);
}
