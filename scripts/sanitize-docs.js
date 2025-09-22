#!/usr/bin/env node
/*
  sanitize-docs.js
  - Redacts potentially sensitive content in docs/ by replacing with 'xxxxx'
  - Patterns: URLs, emails, bearer tokens, API keys, secrets, passwords
  - Usage:
      node scripts/sanitize-docs.js            # in-place
      node scripts/sanitize-docs.js --dry      # show changes without writing
*/

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const DRY_RUN = process.argv.includes('--dry');

if (!fs.existsSync(DOCS_DIR)) {
  console.error(`[sanitize-docs] docs/ directory not found at ${DOCS_DIR}`);
  process.exit(1);
}

/**
 * Redaction rules
 * Each rule returns a replacement string that preserves key names and structure
 */
const RULES = [
  // 1) URLs (http/https)
  { name: 'url', regex: /https?:\/\/[^\s)\]]+/gi, replace: () => 'xxxxx' },

  // 2) Emails
  { name: 'email', regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, replace: () => 'xxxxx' },

  // 3) Password-like assignments
  { name: 'password', regex: /(password|passwd|pwd)\s*[:=]\s*[^\s\n'"`]+/gi, replace: (m, k) => `${k}: xxxxx` },

  // 4) Authorization Bearer tokens
  { name: 'bearer', regex: /Bearer\s+[A-Za-z0-9-._~+/]+=*/g, replace: () => 'Bearer xxxxx' },

  // 5) API-like assignments (api_key, secret, token, apikey)
  { name: 'kv-secret', regex: /(api[_-]?key|apikey|secret|token|auth[_-]?token)\s*[:=]\s*(["']?)[^\s\n"']+\2/gi, replace: (m, k) => `${k}: xxxxx` },

  // 6) Known key prefixes (OpenAI, Anthropic, Gemini, Mistral, Supabase, OpenRouter)
  { name: 'openai-sk', regex: /(sk-[A-Za-z0-9-_]+)/g, replace: () => 'xxxxx' },
  { name: 'env-openai', regex: /(OPENAI_API_KEY)\s*[:=]\s*['"]?[^\s\n'"/]+/g, replace: (m, k) => `${k}: xxxxx` },
  { name: 'env-anthropic', regex: /(ANTHROPIC_API_KEY)\s*[:=]\s*['"]?[^\s\n'"/]+/g, replace: (m, k) => `${k}: xxxxx` },
  { name: 'env-gemini', regex: /(GEMINI_API_KEY)\s*[:=]\s*['"]?[^\s\n'"/]+/g, replace: (m, k) => `${k}: xxxxx` },
  { name: 'env-mistral', regex: /(MISTRAL_API_KEY)\s*[:=]\s*['"]?[^\s\n'"/]+/g, replace: (m, k) => `${k}: xxxxx` },
  { name: 'env-openrouter', regex: /(OPENROUTER_API_KEY)\s*[:=]\s*['"]?[^\s\n'"/]+/g, replace: (m, k) => `${k}: xxxxx` },
  { name: 'env-supabase-any', regex: /(SUPABASE_[A-Z0-9_]+)\s*[:=]\s*['"]?[^\s\n'"/]+/g, replace: (m, k) => `${k}: xxxxx` },
];

const exts = new Set(['.md', '.mdx', '.txt']);

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(p));
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

function sanitizeContent(content) {
  let out = content;
  let counts = {};
  for (const rule of RULES) {
    const before = out;
    out = out.replace(rule.regex, (...args) => rule.replace(...args));
    if (out !== before) {
      counts[rule.name] = (counts[rule.name] || 0) + 1;
    }
  }
  return { out, counts };
}

function run() {
  const files = listFiles(DOCS_DIR);
  let totalChanged = 0;
  const summary = [];

  for (const file of files) {
    const orig = fs.readFileSync(file, 'utf8');
    const { out, counts } = sanitizeContent(orig);
    if (out !== orig) {
      totalChanged++;
      summary.push({ file, counts });
      if (!DRY_RUN) fs.writeFileSync(file, out, 'utf8');
    }
  }

  console.log(`\n[sanitize-docs] Processed ${files.length} files under docs/.`);
  console.log(`[sanitize-docs] ${DRY_RUN ? 'Would change' : 'Changed'} ${totalChanged} file(s).`);
  if (summary.length) {
    console.log('\nDetails:');
    for (const item of summary) {
      console.log(`- ${path.relative(process.cwd(), item.file)} =>`, item.counts);
    }
  }
  console.log(`\nDone.${DRY_RUN ? ' (dry-run)' : ''}`);
}

run();
