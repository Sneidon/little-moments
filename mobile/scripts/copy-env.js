#!/usr/bin/env node
/**
 * Copies .env.example to .env if .env does not exist.
 * Run before local builds to ensure env vars are available.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envExample = path.join(root, '.env.example');
const env = path.join(root, '.env');

if (!fs.existsSync(envExample)) {
  console.error('Missing .env.example');
  process.exit(1);
}

if (fs.existsSync(env)) {
  console.log('.env already exists, skipping copy');
  process.exit(0);
}

fs.copyFileSync(envExample, env);
console.log('Copied .env.example to .env');
process.exit(0);
