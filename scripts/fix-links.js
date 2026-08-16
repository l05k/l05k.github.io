#!/usr/bin/env node
/**
 * 构建后处理：Quartz 输出 clean URLs（无 .html 后缀），
 * 但 GitHub Pages / 静态服务器不做 rewrite，导致链接 404。
 * 此脚本在 `npx quartz build` 之后运行，给所有 internal 链接/URL 补上 .html：
 *   - HTML 里的 href/src、og:url、canonical
 *   - static/contentIndex.json 的 slug 键（搜索/预览用）
 *   - sitemap.xml 的 <loc>、RSS 的 <link>/<id>/<guid>
 * 用法：node scripts/fix-links.js
 */
'use strict';

import fs from 'fs';
import path from 'path';

const PUBLIC = path.join(process.cwd(), 'public');
const SITE_HOST = 'l05k.github.io';

const KNOWN_EXT = /\.(html?|md|css|js|json|xml|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|pdf|txt|map)$/i;
const PROTOCOL = /^(mailto:|tel:|data:|javascript:|blob:)/i;

function fixPath(p) {
  if (!p || p === '/' || p.endsWith('/')) return p; // 根/目录：服务器解析 index.html
  if (KNOWN_EXT.test(p)) return p;                  // 已有扩展名
  return p + '.html';
}

function fixUrl(u) {
  if (!u) return u;
  if (PROTOCOL.test(u) || u.startsWith('#')) return u;
  if (/^https?:\/\//i.test(u)) {
    try {
      const url = new URL(u);
      if (url.hostname !== SITE_HOST) return u;     // 只处理本站绝对 URL
      url.pathname = fixPath(url.pathname);
      return url.toString();
    } catch (e) {
      return u;
    }
  }
  if (u.startsWith('//')) return u;                 // 协议相对
  const qi = u.search(/[?#]/);
  const base = qi === -1 ? u : u.slice(0, qi);
  const rest = qi === -1 ? '' : u.slice(qi);
  return fixPath(base) + rest;
}

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, cb);
    else cb(p);
  }
}

let changedFiles = 0;

// 1. HTML：href/src + og:url/twitter:url
function fixHtml(p) {
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  s = s.replace(/\b(href|src)="([^"]*)"/g, (m, attr, val) => `${attr}="${fixUrl(val)}"`);
  s = s.replace(
    /(<meta[^>]*property="(?:og:url|twitter:url)"[^>]*content=")([^"]*)(")/g,
    (m, pre, _prop, val, post) => pre + fixUrl(val) + post
  );
  if (s !== orig) {
    fs.writeFileSync(p, s);
    changedFiles++;
  }
}

// 2. contentIndex.json：slug 键补 .html（根 "index" 保留）
function fixContentIndex(p) {
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;
  const out = {};
  for (const [slug, val] of Object.entries(data)) {
    const fixed = slug === 'index' ? slug : fixPath(slug);
    if (fixed !== slug) changed = true;
    out[fixed] = val;
  }
  if (changed) {
    fs.writeFileSync(p, JSON.stringify(out));
    changedFiles++;
  }
}

// 3. sitemap.xml / index.xml：URL 内容
function fixXml(p) {
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  s = s.replace(/(<(?:loc|link|id|guid|atom:link)[^>]*>)([^<]*)(<\/)/g, (m, pre, val, post) => pre + fixUrl(val) + post);
  if (s !== orig) {
    fs.writeFileSync(p, s);
    changedFiles++;
  }
}

walk(PUBLIC, (p) => {
  if (p.endsWith('.html')) fixHtml(p);
  else if (p.endsWith('contentIndex.json')) fixContentIndex(p);
  else if (p.endsWith('sitemap.xml') || p.endsWith('index.xml')) fixXml(p);
});

console.log(`fix-links: 修正 ${changedFiles} 个文件`);
