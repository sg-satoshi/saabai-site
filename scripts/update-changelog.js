#!/usr/bin/env node

/**
 * Auto-update changelog from git commits
 * Runs on post-commit hook
 * Extracts commit message and adds entry to ChangelogClient.tsx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const message = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
  const date = execSync('git log -1 --pretty=%ad --date=short', { encoding: 'utf-8' }).trim();

  if (!message || message.startsWith('changelog: auto-update')) {
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

  // Strip conventional commit prefix (feat:, fix:, ui:, chore:, etc.) from display title
  title = title.replace(/^[a-z]+:\s*/i, '');
  // Capitalise first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Format date: "2026-04-22" → "22 Apr 2026"
  const [year, month, day] = date.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formattedDate = `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;

  // Get current AEST time
  const now = new Date(Date.now() + 10 * 3600 * 1000);
  const time = now.getUTCHours().toString().padStart(2, '0') + ':' + now.getUTCMinutes().toString().padStart(2, '0');

  const changelogPath = path.join(__dirname, '../app/rex-changelog/ChangelogClient.tsx');
  let content = fs.readFileSync(changelogPath, 'utf-8');

  const newEntry = `      { time: "${time}", tag: "${tag}", title: "${title.replace(/"/g, '\\"').replace(/\n/g, ' ')}" }`;
  const dateMarker = `date: "${formattedDate}"`;

  if (content.includes(dateMarker)) {
    // Insert as first entry in the existing day block
    // Find "entries: [" after the date marker and insert right after the "["
    const datePos = content.indexOf(dateMarker);
    const entriesPos = content.indexOf('entries: [', datePos);
    const bracketPos = content.indexOf('[', entriesPos) + 1;

    content = content.slice(0, bracketPos) + '\n' + newEntry + ',' + content.slice(bracketPos);
  } else {
    // Create new day block at the top of CHANGELOG array
    const marker = 'const CHANGELOG: Day[] = [\n';
    const insertPos = content.indexOf(marker);
    if (insertPos === -1) process.exit(0);

    const newDay = `  {\n    date: "${formattedDate}",\n    entries: [\n${newEntry}\n    ],\n  },\n`;
    content = content.slice(0, insertPos + marker.length) + newDay + content.slice(insertPos + marker.length);
  }

  fs.writeFileSync(changelogPath, content, 'utf-8');
  execSync('git add app/rex-changelog/ChangelogClient.tsx', { encoding: 'utf-8' });

  process.exit(0);
} catch (err) {
  process.exit(0);
}
