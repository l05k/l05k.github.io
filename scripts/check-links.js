#!/usr/bin/env node
/**
 * 链接完整性检查：遍历 public 下所有 HTML，验证 internal 链接的目标文件存在。
 * 用法：node scripts/check-links.js
 */
'use strict';

import fs from 'fs';
import path from 'path';

const PUBLIC = path.join(process.cwd(), 'public');
const PROTOCOL = /^(https?:|mailto:|tel:|data:|javascript:|blob:)/i;

function exists(p) {
  const abs = path.join(PUBLIC, p);
  if (fs.existsSync(abs)) return true;
  if (fs.existsSync(abs + '/')) return true; // 目录
  return false;
}

function resolve(baseDir, href) {
  if (href.startsWith('/')) return href.slice(1);            // 站点绝对路径
  return path.posix.normalize(path.posix.join(baseDir, href)); // 相对路径
}

const problems = [];
let totalLinks = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (p.endsWith('.html')) check(p);
  }
}

function check(file) {
  const html = fs.readFileSync(file, 'utf8');
  const baseDir = path.posix.relative(PUBLIC, path.posix.dirname(file));
  const re = /\b(href|src)="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const attr = m[1];
    const href = m[2];
    if (!href || PROTOCOL.test(href) || href.startsWith('#') || href.startsWith('//')) continue;
    if (/^\.{1,3}$/.test(href)) continue; // .  ..  ...
    totalLinks++;
    const target = resolve(baseDir, href);
    if (!exists(target)) {
      problems.push(`${path.relative(PUBLIC, file)}: ${attr}="${href}" → 目标不存在: ${target}`);
    }
  }
}

walk(PUBLIC);

if (problems.length) {
  console.log(`✗ ${problems.length} 个坏链接（共检查 ${totalLinks} 个 internal 链接）:`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log(`✓ 全部 ${totalLinks} 个 internal 链接目标存在`);
