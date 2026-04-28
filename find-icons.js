#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, 'src');

const ICON_PATTERNS = [
  'Ionicons',
  'Feather',
  'MaterialIcons',
  'phosphor-react',
  '📄',
  '🔍',
  '📷',
  '✏️',
  '🗑️',
];

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else if (entry.isFile() && full.match(/\.(tsx?|jsx?)$/)) cb(full);
  }
}

const results = [];

walk(ROOT, (file) => {
  const content = fs.readFileSync(file, 'utf8');
  ICON_PATTERNS.forEach((pattern) => {
    if (content.includes(pattern)) {
      results.push({ file, pattern });
    }
  });
});

const grouped = results.reduce((acc, r) => {
  acc[r.pattern] = acc[r.pattern] || [];
  acc[r.pattern].push(r.file);
  return acc;
}, {});

console.log(JSON.stringify(grouped, null, 2));

