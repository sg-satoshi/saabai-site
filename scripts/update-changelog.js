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
  // Get the last commit message
  const message = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
  const hash = execSync('git log -1 --pretty=%h', { encoding: 'utf-8' }).trim();
  const date = execSync('git log -1 --pretty=%ad --date=short', { encoding: 'utf-8' }).trim();
  
  if (!message || message.includes('changelog')) {
    process.exit(0); // Skip if no message or if it's a changelog update itself
  }

  // Parse commit message for tag and title
  let tag = 'UPDATE';
  let title = message.split('\n')[0]; // First line only
  
  // Extract [TAG] if present
  const tagMatch = title.match(/^\[([A-Z]+)\]\s*(.+)/);
  if (tagMatch) {
    tag = tagMatch[1];
    title = tagMatch[2];
  } else {
    // Auto-classify based on keywords
    const lower = title.toLowerCase();
    if (lower.includes('fix')) tag = 'FIX';
    else if (lower.includes('add') || lower.includes('new')) tag = 'NEW';
    else if (lower.includes('ui') || lower.includes('style')) tag = 'UI';
    else if (lower.includes('improve')) tag = 'IMPROVEMENT';
    else if (lower.includes('price') || lower.includes('pricing')) tag = 'PRICING';
  }

  // Format date
  const [year, month, day] = date.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
  
  // Get current time
  const now = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  // Read changelog file
  const changelogPath = path.join(__dirname, '../app/rex-changelog/ChangelogClient.tsx');
  let content = fs.readFileSync(changelogPath, 'utf-8');

  // Check if today's date already exists in changelog
  const dateRegex = new RegExp(`date: "${formattedDate}"`);
  const dateExists = dateRegex.test(content);

  let newEntry = `      { time: "${time}", tag: "${tag}", title: "${title.replace(/"/g, '\\"')}" }`;

  if (dateExists) {
    // Add to existing day
    const insertRegex = new RegExp(
      `(date: "${formattedDate}",\\s+entries: \\[)(\\n.*?)(\\n\\s+\\])`
    );
    content = content.replace(insertRegex, (match, before, entries, after) => {
      return before + entries + ',\n' + newEntry + after;
    });
  } else {
    // Create new day entry
    const newDay = `  {\n    date: "${formattedDate}",\n    entries: [\n${newEntry}\n    ],\n  },\n`;
    
    // Insert after "const CHANGELOG: Day[] = ["
    const marker = 'const CHANGELOG: Day[] = [\n';
    const insertPos = content.indexOf(marker);
    
    if (insertPos !== -1) {
      const before = content.substring(0, insertPos + marker.length);
      const after = content.substring(insertPos + marker.length);
      content = before + newDay + after;
    } else {
      process.exit(0); // Exit silently if can't find marker
    }
  }

  // Write updated content
  fs.writeFileSync(changelogPath, content, 'utf-8');
  
  // Stage the changelog update
  execSync('git add app/rex-changelog/ChangelogClient.tsx', { encoding: 'utf-8' });
  
  process.exit(0);
} catch (err) {
  // Fail silently on errors
  process.exit(0);
}
