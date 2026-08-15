/* ============================================================
   公式复制为 Markdown
   选中某个公式后复制，剪贴板内容会被替换为 Markdown 源码：
   - 行内公式 → $...$
   - 块级公式 → $$...$$
   源码在构建时已内嵌到公式元素的 data-latex 属性里。
   ============================================================ */
(function () {
  'use strict';

  function nearest(el, selector) {
    while (el && el.nodeType === 1) {
      if (el.matches && el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  document.addEventListener('copy', function (e) {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    var range = sel.getRangeAt(0);
    var startEl = range.startContainer.nodeType === 1
      ? range.startContainer
      : range.startContainer.parentElement;
    var endEl = range.endContainer.nodeType === 1
      ? range.endContainer
      : range.endContainer.parentElement;

    // 只有选区完整落在同一个公式内时才接管复制
    var startWrap = nearest(startEl, '.math-wrap');
    var endWrap = nearest(endEl, '.math-wrap');
    if (!startWrap || startWrap !== endWrap) return;

    var latex = startWrap.getAttribute('data-latex');
    if (!latex) return;

    var markdown = startWrap.classList.contains('math-display')
      ? '$$\n' + latex + '\n$$'
      : '$' + latex + '$';

    e.clipboardData.setData('text/plain', markdown);
    e.preventDefault();
  });
})();
