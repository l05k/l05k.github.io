#!/usr/bin/env node
/**
 * 预渲染构建：把 posts/*.md 渲染成纯静态 HTML，输出到 public/。
 * 公式在构建时用 MathJax 服务端渲染成 CHTML 文本（与 Obsidian 同一引擎）——
 * 页面打开零等待、零公式引擎下载，公式可选中，渲染效果与 Obsidian 完全一致。
 *
 * 用法：
 *   本地：node scripts/build.js（需先 npm install）
 *   GitHub：push 后 Actions 自动构建部署（.github/workflows/deploy.yml）
 */
'use strict';

// 浏览器环境桩：app.js 的启动逻辑在 Node 里静默跳过，只复用纯函数
global.document = {
  getElementById: () => null,
  compatMode: 'CSS1Compat',
  getElementsByTagName: () => []
};
global.window = { location: { search: '' }, scrollTo: () => {} };

const fs = require('fs');
const path = require('path');

// MathJax 服务端渲染（mathjax-full，CHTML 文本输出 —— 公式是真实 HTML 文本，可选中复制）
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { CHTML } = require('mathjax-full/js/output/chtml.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const mjTex = new TeX({ packages: AllPackages });
// fontURL 相对于 chtml.css 所在目录（public/vendor/mathjax/woff-v2/）
const mjChtml = new CHTML({ fontURL: './woff-v2' });
const mjDoc = mathjax.document('', { InputJax: mjTex, OutputJax: mjChtml });

/* ------------------------------------------------------------------
   字形文本化：SSR 的 CHTML 字形画在 ::before（content+padding）上，
   mjx-c 元素本身是空的，导致公式无法被划词选中。
   这里把 Unicode 字符注入为 mjx-c 的真实文本，并把度量（padding）
   移到元素内联样式、保留零宽盒模型 —— 布局不变，但公式可选中复制。
   ------------------------------------------------------------------ */

let glyphMetrics = null;

function getGlyphMetrics() {
  if (glyphMetrics) return glyphMetrics;
  const css = adaptor.textContent(mjChtml.styleSheet(adaptor));
  const map = {};
  const re = /mjx-c\.mjx-c([0-9A-F]+)(\.TEX-[A-Za-z0-9]+)?::before\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const pad = /\bpadding:\s*([^;}]+)/.exec(m[3]);
    if (pad) {
      const base = m[1].toUpperCase();
      map[base + (m[2] || '')] = pad[1].trim();
      map[base] = map[base] || pad[1].trim();
    }
  }
  glyphMetrics = map;
  return map;
}

function glyphToText(html) {
  const metrics = getGlyphMetrics();
  return html.replace(/<mjx-c class="([^"]+)"><\/mjx-c>/g, (m, cls) => {
    const hm = /\bmjx-c([0-9A-Fa-f]+)\b/.exec(cls);
    if (!hm) return m;
    const ch = String.fromCodePoint(parseInt(hm[1], 16));
    const vm = /\b(TEX-[A-Za-z0-9]+)\b/.exec(cls);
    const key = hm[1].toUpperCase() + (vm ? '.' + vm[1] : '');
    const pad = metrics[key] || metrics[hm[1].toUpperCase()];
    const style = 'display:inline-block;width:0;' + (pad ? 'padding:' + pad + ';' : '');
    return '<mjx-c class="' + cls + '" style="' + style + '">' + ch + '</mjx-c>';
  });
}

function mathToHtml(latex, display) {
  try {
    const node = mjDoc.convert(latex, { display: display });
    // 把 LaTeX 源码内嵌到 data-latex，配合 math-copy.js 支持"选中公式复制为 Markdown"
    const markdown = display ? '$$\n' + latex + '\n$$' : '$' + latex + '$';
    return (
      '<span class="math-wrap' + (display ? ' math-display' : '') +
      '" data-latex="' + escapeHtml(latex) +
      '" title="' + escapeHtml(markdown) + '">' +
      glyphToText(adaptor.outerHTML(node)) + '</span>'
    );
  } catch (e) {
    return '<span class="math-error">' + escapeHtml(latex) + '</span>';
  }
}

const { parseFrontMatter, renderMarkdown, formatDate, escapeHtml, SITE } = require('../app.js');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const ASSETS_DIR = path.join(ROOT, 'assets');
const OUT_DIR = path.join(ROOT, 'public');

const FAVICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='16'%20fill='%23c0392b'/%3E%3Ctext%20x='50'%20y='74'%20font-size='64'%20text-anchor='middle'%20fill='%23fbfaf6'%20font-family='Georgia,serif'%3EL%3C/text%3E%3C/svg%3E";

/* ------------------------------------------------------------------
   公式提取：先把代码块 / 行内代码保护起来（其中的 $ 不应被当公式），
   再提取 $$...$$ 与 $...$ 并用 MathJax 服务端渲染，最后恢复代码。
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
    math.push(mathToHtml(body.trim(), true));
    return '\u0000M' + (math.length - 1) + '\u0000';
  });
  text = text.replace(/\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, body) => {
    math.push(mathToHtml(body.trim(), false));
    return '\u0000M' + (math.length - 1) + '\u0000';
  });

  text = text.replace(/\u0000C(\d+)\u0000/g, (m, i) => code[+i]);
  return { text, math };
}

/* ------------------------------------------------------------------ 页面模板 */

function pageShell({ title, desc, cssHref, content, head, foot }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="${cssHref}">
  ${head || ''}
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
  ${foot || ''}
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
        content,
        head: math.length ? '<link rel="stylesheet" href="../vendor/mathjax/chtml.css">' : '',
        foot: math.length ? '<script src="../math-copy.js" defer></script>' : ''
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

  // 静态资源：站点样式、公式复制脚本、图片附件
  fs.copyFileSync(path.join(ROOT, 'styles.css'), path.join(OUT_DIR, 'styles.css'));
  fs.copyFileSync(path.join(ROOT, 'math-copy.js'), path.join(OUT_DIR, 'math-copy.js'));

  // MathJax CHTML 样式 + 字体（公式页引用；字体按需下载，无 JS 引擎）
  const mjDir = path.join(OUT_DIR, 'vendor', 'mathjax');
  fs.mkdirSync(mjDir, { recursive: true });
  fs.writeFileSync(
    path.join(mjDir, 'chtml.css'),
    adaptor.textContent(mjChtml.styleSheet(adaptor))
  );
  fs.cpSync(
    path.join(ROOT, 'node_modules', 'mathjax-full', 'es5', 'output', 'chtml', 'fonts', 'woff-v2'),
    path.join(mjDir, 'woff-v2'),
    { recursive: true }
  );

  if (fs.existsSync(ASSETS_DIR)) {
    fs.cpSync(ASSETS_DIR, path.join(OUT_DIR, 'assets'), { recursive: true });
  }

  console.log(`\n构建完成：${posts.length} 篇文章 → public/`);
}

if (require.main === module) build();

module.exports = { renderMath };
