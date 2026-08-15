/**
 * math-copy.js 复制逻辑测试 —— 运行：node scripts/test-copy.js
 * 用迷你 DOM 桩驱动真实注册的 copy 处理器，验证：
 *   1. 混合选区（文字+公式）→ 公式替换为 Markdown 源码
 *   2. 只选中公式 → 得到 $...$ / $$...$$
 *   3. 纯文字选区 → 不接管（原生复制）
 */
'use strict';

/* ---------------- 迷你 DOM 桩 ---------------- */

class FakeEl {
  constructor(tag, attrs = {}, children = []) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.classList = {
      contains: (c) => (attrs.class || '').split(/\s+/).includes(c)
    };
    this.getAttribute = (k) => (k in attrs ? attrs[k] : null);
    this.childNodes = children;
    this.parentElement = null;
    for (const c of children) {
      if (c.nodeType === 1) c.parentElement = this;
    }
  }
}

class FakeText {
  constructor(v) {
    this.nodeType = 3;
    this.nodeValue = v;
  }
}

class Frag extends FakeEl {
  querySelector(sel) {
    if (sel !== '.math-wrap') return null;
    const stack = [...this.childNodes];
    while (stack.length) {
      const n = stack.pop();
      if (n.nodeType === 1) {
        if (n.classList.contains('math-wrap')) return n;
        stack.push(...n.childNodes);
      }
    }
    return null;
  }
}

/* ---------------- 加载 math-copy.js（捕获处理器） ---------------- */

let handler = null;
let currentSelection = null;
global.document = { addEventListener: (type, fn) => { if (type === 'copy') handler = fn; } };
global.window = { getSelection: () => currentSelection };

require('../math-copy.js');

function fireCopy(selection) {
  currentSelection = selection;
  const result = { text: null, prevented: false };
  const event = {
    clipboardData: { setData: (k, v) => { if (k === 'text/plain') result.text = v; } },
    preventDefault: () => { result.prevented = true; }
  };
  handler(event);
  return result;
}

function makeSelection(frag, commonAncestor) {
  const range = {
    cloneContents: () => frag,
    commonAncestorContainer: commonAncestor
  };
  return { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
}

const mathWrap = (latex, display) =>
  new FakeEl('span', {
    class: 'math-wrap' + (display ? ' math-display' : ''),
    'data-latex': latex
  }, [new FakeText('𝐸')]);

const text = (v) => new FakeText(v);

/* ---------------- 用例 ---------------- */

const checks = [];

// 1. 混合选区：文字 + 两个公式
{
  const frag = new Frag('div', {}, [
    new FakeEl('p', {}, [
      text('质能方程 '),
      mathWrap('E = mc^2'),
      text('，以及欧拉恒等式 '),
      mathWrap('e^{i\\pi} + 1 = 0'),
      text('。')
    ])
  ]);
  const r = fireCopy(makeSelection(frag, frag));
  checks.push([
    '混合选区：公式替换为 Markdown 源码',
    r.prevented === true &&
      r.text === '质能方程 $E = mc^2$，以及欧拉恒等式 $e^{i\\pi} + 1 = 0$。'
  ]);
}

// 2. 块级公式混合选区
{
  const frag = new Frag('div', {}, [
    new FakeEl('p', {}, [text('块级公式：')]),
    new FakeEl('p', {}, [mathWrap('\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}', true)])
  ]);
  const r = fireCopy(makeSelection(frag, frag));
  checks.push([
    '混合选区：块级公式 → $$...$$',
    r.prevented === true &&
      r.text === '块级公式：\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}\n$$'
  ]);
}

// 3. 只选中公式本身（fragment 里没有 math-wrap，公共祖先在公式内）
{
  const wrap = mathWrap('E = mc^2');
  const glyph = new FakeEl('mjx-c', {}, [text('𝐸')]);
  glyph.parentElement = wrap;
  const frag = new Frag('div', {}, [text('𝐸')]); // 剪贴片段：只有字形文本
  const r = fireCopy(makeSelection(frag, glyph));
  checks.push([
    '只选公式：得到 $...$ 源码',
    r.prevented === true && r.text === '$E = mc^2$'
  ]);
}

// 4. 纯文字选区：不接管
{
  const frag = new Frag('div', {}, [new FakeEl('p', {}, [text('普通文字，没有公式。')])]);
  const r = fireCopy(makeSelection(frag, frag));
  checks.push(['纯文字选区：走原生复制', r.prevented === false && r.text === null]);
}

/* ---------------- 输出 ---------------- */

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
