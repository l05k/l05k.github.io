/**
 * 渲染管线测试 —— 运行：node scripts/test-render.js
 * 读取真实的示例文章，验证 Front Matter 解析与 Markdown 渲染输出。
 * 修改 app.js 后建议先跑一遍本测试。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 浏览器环境桩：app.js 启动时会调用 renderIndex/renderPost，
// 在 Node 里让它们安静地返回 false（不渲染），只测纯函数。
global.document = { getElementById: () => null };
global.window = { location: { search: '' }, scrollTo: () => {} };

const { renderMarkdown, parseFrontMatter, formatDate, hasMath } = require('../app.js');

const md = fs.readFileSync(path.join(__dirname, '..', 'posts', 'hello-world.md'), 'utf8');
const meta = parseFrontMatter(md);
const html = renderMarkdown(meta.body);

const checks = [
  ['Front Matter 标题', meta.title === '你好，世界 —— 第一篇博客'],
  ['Front Matter 日期', meta.date === '2025-08-15'],
  ['Front Matter 摘要', meta.excerpt.includes('示例文章')],
  ['正文已剥离 Front Matter', !meta.body.startsWith('---')],
  ['h2 标题', html.includes('<h2>写作格式示例</h2>')],
  ['h3 标题', html.includes('<h3>一段代码</h3>')],
  ['加粗', html.includes('<strong>Markdown 驱动</strong>')],
  ['斜体', html.includes('<em>斜体</em>')],
  ['删除线', html.includes('<del>删除线</del>')],
  ['行内代码', html.includes('<code>posts/</code>')],
  ['链接', html.includes('<a href="https://github.com" target="_blank" rel="noopener">链接</a>')],
  ['代码块', html.includes('<pre><code>') && html.includes('def hello')],
  ['代码块已转义', html.includes('&lt;') || html.includes('&quot;')],
  ['引用块', html.includes('<blockquote><p>') && html.includes('达·芬奇')],
  ['无序列表', html.includes('<ul>') && html.includes('<li>段落与')],
  ['有序列表', html.includes('<ol>') && html.includes('<li>写一篇 Markdown 文章</li>')],
  ['分割线', html.includes('<hr>')],
  ['段落', html.includes('<p>欢迎来到我的博客')],
  ['日期格式化', formatDate('2025-08-15') === '2025 年 8 月 15 日'],
  ['HTML 注入被转义', !renderMarkdown('## <script>alert(1)</script>').includes('<script>')],
  // ---- 数学公式 ----
  ['行内公式检测', hasMath('质能方程 $E = mc^2$ 很好') === true],
  ['块级公式检测', hasMath('$$\n\\int dx\n$$') === true],
  ['无公式不误报', hasMath('这是普通文本，没有公式。') === false],
  ['单个 $ 不误报（无闭合）', hasMath('价格是 $100 美元') === false],
  ['行内公式原样保留', renderMarkdown('质能方程 $E = mc^2$ 成立').includes('$E = mc^2$')],
  ['块级公式保留在段落中', renderMarkdown('$$\n\\sqrt{2}\n$$').includes('$$')],
  ['代码内的 $ 不触发公式解析', renderMarkdown('写法是 `$x$` 这样').includes('<code>$x$</code>')],
  // ---- 构建期公式提取（build.js / renderMath）----
  ['提取行内公式', (() => { const r = require('./build.js').renderMath('质能方程 $E = mc^2$'); return r.math.length === 1 && r.text.includes('\u0000M0\u0000') && !r.text.includes('$'); })()],
  ['提取块级公式', (() => { const r = require('./build.js').renderMath('$$\n\\int dx\n$$'); return r.math.length === 1; })()],
  ['代码中的 $ 被保护', (() => { const r = require('./build.js').renderMath('写法 `$x$` 与 $E=mc^2$'); return r.math.length === 1 && r.text.includes('`$x$`'); })()],
  ['无闭合 $ 不提取', (() => { const r = require('./build.js').renderMath('价格是 $100 美元'); return r.math.length === 0; })()],
  ['MathJax 输出可用（CHTML 文本）', (() => { const r = require('./build.js').renderMath('$E=mc^2$'); return r.math[0].includes('mjx-container') && !r.math[0].includes('<svg'); })()],
  ['字形已文本化（可选中）', (() => { const b = require('./build.js'); const html = b.glyphToText(b.renderMath('$E=mc^2$').math[0]); return html.includes('>' + String.fromCodePoint(0x1D438) + '</mjx-c>') && html.includes('style="display:inline-block;width:0;padding:'); })()],
  ['后续公式字形度量完整（回归）', (() => { const b = require('./build.js'); const html = b.glyphToText(b.renderMath('$e^{i\\pi}+1=0$').math[0]); return /<mjx-c class="mjx-c1D452[^"]*"[^>]*style="[^"]*padding:/.test(html); })()],
  ['隐形孪生层存在（选中高亮用）', (() => { const b = require('./build.js'); const html = b.glyphToText(b.renderMath('$E=mc^2$').math[0]); return html.includes('mjx-sel') && html.includes('position:absolute') && html.includes('color:transparent'); })()],
  ['公式内嵌 LaTeX 源码', (() => { const r = require('./build.js').renderMath('$E=mc^2$'); return r.math[0].includes('data-latex="E=mc^2"'); })()],
  ['块级公式标记与源码', (() => { const r = require('./build.js').renderMath('$$\n\\int dx\n$$'); return r.math[0].includes('math-display') && r.math[0].includes('data-latex="\\int dx"'); })()],
  ['LaTeX 特殊字符已转义', (() => { const r = require('./build.js').renderMath('$a < b$'); return r.math[0].includes('data-latex="a &lt; b"'); })()]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log((ok ? '✓' : '✗') + ' ' + name);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} 项检查失败`);
  process.exit(1);
}
console.log('\n全部通过 ✔');
