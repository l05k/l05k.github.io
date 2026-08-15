/* ============================================================
   公式复制为 Markdown
   选中包含公式的文本后复制，剪贴板中公式会被替换为 Markdown 源码：
   - 行内公式 → $...$
   - 块级公式 → $$...$$
   源码在构建时已内嵌到公式元素的 data-latex 属性里。
   （纯文字选区不受影响，走浏览器原生复制）
   ============================================================ */
(function () {
  'use strict';

  var BLOCK_TAGS = /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE|TABLE|TR|UL|OL)$/;

  function isBlock(tag) {
    return BLOCK_TAGS.test(tag);
  }

  // 遍历克隆的选区片段，重建纯文本：公式整体替换为 Markdown 源码
  // 注意：片段根是 DocumentFragment（nodeType 11），必须同样递归
  function walk(node, parts) {
    if (node.nodeType === 3) {            // 文本节点
      parts.push(node.nodeValue);
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 11) return; // 注释等；11=DocumentFragment

    if (node.classList && node.classList.contains('math-wrap')) {
      var latex = node.getAttribute('data-latex');
      if (latex) {
        parts.push(node.classList.contains('math-display')
          ? '$$\n' + latex + '\n$$'
          : '$' + latex + '$');
        return;                           // 公式整体替换，跳过内部字形文本
      }
    }

    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) walk(kids[i], parts);
    if (node.tagName === 'BR') parts.push('\n');
    else if (isBlock(node.tagName)) parts.push('\n');
  }

  function wrapMarkdown(wrap) {
    var latex = wrap.getAttribute('data-latex');
    if (!latex) return null;
    return wrap.classList.contains('math-display')
      ? '$$\n' + latex + '\n$$'
      : '$' + latex + '$';
  }

  document.addEventListener('copy', function (e) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var frag = range.cloneContents();

    // 情况一：选区内有公式（含混合选区）→ 重建文本，公式替换为 Markdown 源码
    if (frag.querySelector && frag.querySelector('.math-wrap')) {
      var parts = [];
      walk(frag, parts);
      var text = parts.join('')
        .replace(/[ \t]+\n/g, '\n')   // 行尾空白
        .replace(/\n{3,}/g, '\n\n')   // 压缩连续空行
        .trim();
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      return;
    }

    // 情况二：整个选区都在单个公式内部（例如只选中了公式本身）
    var ca = range.commonAncestorContainer;
    var el = ca.nodeType === 1 ? ca : ca.parentElement;
    while (el) {
      if (el.classList && el.classList.contains('math-wrap')) {
        var markdown = wrapMarkdown(el);
        if (markdown) {
          e.clipboardData.setData('text/plain', markdown);
          e.preventDefault();
        }
        return;
      }
      el = el.parentElement;
    }
    // 情况三：没有公式 —— 走浏览器原生复制
  });
})();
