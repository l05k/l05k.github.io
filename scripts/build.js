#!/usr/bin/env node
/**
 * 预渲染构建：把 posts/*.md 渲染成纯静态 HTML，输出到 public/。
 * 公式在构建时用 KaTeX 服务端渲染好 —— 页面打开零等待、零公式引擎下载。
 *
 * 用法：
 *   本地：node scripts/build.js（需先 npm install）
 *   GitHub：push 后 Actions 自动构建部署（.github/workflows/deploy.yml）
 */
'use strict';

// 浏览器环境桩：app.js 的启动逻辑在 Node 里静默跳过，只复用纯函数
global.document = { getElementById: () => null, compatMode: 'CSS1Compat' };
global.window = { location: { search: '' }, scrollTo: () => {} };

const fs = require('fs');
const path = require('path');
const katex = require('katex');

const { parseFrontMatter, renderMarkdown, formatDate, escapeHtml, SITE } = require('../app.js');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUT_DIR = path.join(ROOT, 'public');

const FAVICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='16'%20fill='%23c0392b'/%3E%3Ctext%20x='50'%20y='74'%20font-size='64'%20text-anchor='middle'%20fill='%23fbfaf6'%20font-family='Georgia,serif'%3EL%3C/text%3E%3C/svg%3E";

/* ------------------------------------------------------------------
   公式提取：先把代码块 / 行内代码保护起来（其中的 $ 不应被当公式），
   再提取 $$...$$ 与 $...$ 并用 KaTeX 服务端渲染，最后恢复代码。
   ------------------------------------------------------------------ */

function renderMath(text) {
  const code = [];
  text = text.replace(/```[\s\S]*?```/g, (m) => {
    code.push(m);
    return '\u0000C' + (code.length - 1) + '\u0000';
  });
  text = text.replace(/`[^`\n]+`/g, (m) => {
    code.push(m);
    return '\u0000C' + (code.length - 1) + '\u0000';
  });

  const math = [];
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, body) => {
    math.push(katex.renderToString(body.trim(), { displayMode: true, throwOnError: false }));
    return '\u0000M' + (math.length - 1) + '\u0000';
  });
  text = text.replace(/\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, body) => {
    math.push(katex.renderToString(body.trim(), { throwOnError: false }));
    return '\u0000M' + (math.length - 1) + '\u0000';
  });

  text = text.replace(/\u0000C(\d+)\u0000/g, (m, i) => code[+i]);
  return { text, math };
}

/* ------------------------------------------------------------------ 页面模板 */

function pageShell({ title, desc, cssHref, extraHead, content }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="${cssHref}">
  ${extraHead || ''}
</head>
<body>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="site-title" href="index.html">${escapeHtml(SITE.title)}<span class="dot">.</span></a>
      <span class="site-tagline">${escapeHtml(SITE.tagline)}</span>
    </div>
  </header>
  ${content}
  <footer class="site-footer">
    <div class="footer-inner">
      © ${new Date().getFullYear()} ${escapeHtml(SITE.author)} · 由 Markdown 驱动，纯静态托管于
      <a href="${SITE.sourceUrl}" target="_blank" rel="noopener">GitHub Pages</a>
    </div>
  </footer>
</body>
</html>`;
}

/* ------------------------------------------------------------------ 构建 */

function build() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT_DIR, 'posts'), { recursive: true });

  const posts = [];

  for (const f of fs.readdirSync(POSTS_DIR).filter((x) => x.endsWith('.md')).sort()) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const meta = parseFrontMatter(raw);
    const slug = path.basename(f, '.md');
    const title = meta.title || slug;

    // 图片等附件路径重写：文章页在 posts/ 子目录，assets/ 需加 ../ 前缀
    let body = meta.body.replace(/\]\(\s*\.?\/?(assets\/[^)\s]+)\)/g, '](../$1)');

    // 公式服务端渲染 + Markdown 渲染
    const { text, math } = renderMath(body);
    let contentHtml = renderMarkdown(text);
    math.forEach((m, i) => {
      contentHtml = contentHtml.split('\u0000M' + i + '\u0000').join(m);
    });

    const minutes = Math.max(1, Math.round(meta.body.replace(/\s/g, '').length / 400));
    const extraHead = math.length
      ? '<link rel="stylesheet" href="../vendor/katex/katex.min.css">'
      : '';

    const content = `<main class="wrap">
    <p class="back-link"><a href="../index.html">← 返回首页</a></p>
    <article>
      <header class="post-head">
        <h1 class="post-title">${escapeHtml(title)}</h1>
        <div class="post-meta">${formatDate(meta.date)} · 阅读约 ${minutes} 分钟</div>
      </header>
      <div class="post-body">
${contentHtml}
      </div>
    </article>
  </main>`;

    fs.writeFileSync(
      path.join(OUT_DIR, 'posts', slug + '.html'),
      pageShell({
        title: `${title} · ${SITE.title}`,
        desc: escapeHtml(meta.excerpt || ''),
        cssHref: '../styles.css',
        extraHead,
        content
      })
    );

    posts.push({ slug, title, date: meta.date || '', excerpt: meta.excerpt || '' });
    console.log('  ✓', f, '→', 'posts/' + slug + '.html' + (math.length ? `（${math.length} 个公式已服务端渲染）` : ''));
  }

  // 首页：静态文章列表
  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const items = posts
    .map(
      (p) => `    <li class="post-item">
      <div class="post-date">${formatDate(p.date)}</div>
      <h2 class="post-title"><a href="posts/${encodeURIComponent(p.slug)}.html">${escapeHtml(p.title)}</a></h2>
      ${p.excerpt ? `<p class="post-excerpt">${escapeHtml(p.excerpt)}</p>` : ''}
    </li>`
    )
    .join('\n');

  fs.writeFileSync(
    path.join(OUT_DIR, 'index.html'),
    pageShell({
      title: SITE.title,
      desc: `${SITE.author} 的个人博客 —— 一个由 Markdown 驱动的纯静态站点`,
      cssHref: 'styles.css',
      content: `<main class="wrap">
    <ul class="post-list">
${items}
    </ul>
  </main>`
    })
  );

  // 静态资源：站点样式、KaTeX（CSS + 字体）、图片附件
  fs.copyFileSync(path.join(ROOT, 'styles.css'), path.join(OUT_DIR, 'styles.css'));

  const katexDir = path.join(OUT_DIR, 'vendor', 'katex');
  fs.mkdirSync(katexDir, { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, 'node_modules', 'katex', 'dist', 'katex.min.css'),
    path.join(katexDir, 'katex.min.css')
  );
  fs.cpSync(path.join(ROOT, 'node_modules', 'katex', 'dist', 'fonts'), path.join(katexDir, 'fonts'), { recursive: true });

  if (fs.existsSync(ASSETS_DIR)) {
    fs.cpSync(ASSETS_DIR, path.join(OUT_DIR, 'assets'), { recursive: true });
  }

  console.log(`\n构建完成：${posts.length} 篇文章 → public/`);
}

if (require.main === module) build();

module.exports = { renderMath };
