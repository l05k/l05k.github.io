/* ============================================================
   Losk's Journal —— 站点逻辑（零依赖，无构建步骤）
   1. 首页：读取 posts.json 渲染文章列表
   2. 详情页：读取 ?file=posts/xxx.md 渲染 Markdown 文章
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 站点配置：想改站名 / 署名，改这里 ---------- */
  var SITE = {
    title: "Losk's Journal",
    author: 'Losk'
  };

  /* ---------------- 工具 ---------------- */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso || '';
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /* ---------------- 数学公式（MathJax 3，与 Obsidian 同引擎） ---------------- */

  function hasMath(text) {
    // $$...$$ 块级公式
    if (/\$\$[\s\S]*?\$\$/.test(text)) return true;
    // $...$ 行内公式（排除 $$ 开头与结尾；$ 后不能是空白）
    return /\$(?!\$)[^$\n]+\$(?!\$)/.test(text);
  }

  function loadMathJax() {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch(function () {});
      return;
    }
    // 配置必须在本脚本加载前就位：与 Obsidian 相同的 $...$ / $$...$$ 定界符
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']]
      },
      svg: { fontCache: 'global' },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
    };
    var s = document.createElement('script');
    s.src = 'vendor/mathjax-tex-svg.js';
    s.async = true;
    s.onload = function () {
      var retry = function () {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise().catch(function () {});
        } else {
          setTimeout(retry, 100);
        }
      };
      retry();
    };
    document.head.appendChild(s);
  }

  /* ---------------- 迷你 Markdown 渲染器 ----------------
     支持：标题(#~####)、段落、粗体、斜体、删除线、行内代码、
     代码块(```)、引用(>)、有序/无序列表、链接、图片、分割线
     说明：先转义 HTML 再渲染，天然防止注入；不支持嵌套列表/表格 */

  function renderInline(text) {
    var t = escapeHtml(text);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy">');
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return t;
  }

  function renderMarkdown(md) {
    var lines = String(md).replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var para = [];
    var i = 0;

    function flush() {
      if (para.length) {
        html.push('<p>' + renderInline(para.join(' ')) + '</p>');
        para.length = 0;
      }
    }

    while (i < lines.length) {
      var line = lines[i];

      // 代码块
      if (/^```/.test(line)) {
        flush();
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++; // 跳过收尾的 ```
        html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }

      // 分割线
      if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
        flush();
        html.push('<hr>');
        i++;
        continue;
      }

      // 标题（正文里 # 与 ## 都作为二级标题，避免与文章大标题层级混淆）
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flush();
        var level = Math.max(2, h[1].length);
        html.push('<h' + level + '>' + renderInline(h[2]) + '</h' + level + '>');
        i++;
        continue;
      }

      // 引用块
      if (/^>\s?/.test(line)) {
        flush();
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        html.push('<blockquote><p>' + renderInline(quote.join(' ')) + '</p></blockquote>');
        continue;
      }

      // 列表（有序 / 无序）
      var ul = line.match(/^[-*]\s+(.*)$/);
      var ol = line.match(/^\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        flush();
        var ordered = !!ol;
        var tag = ordered ? 'ol' : 'ul';
        var items = [];
        var re = ordered ? /^\d+[.)]\s+(.*)$/ : /^[-*]\s+(.*)$/;
        while (i < lines.length) {
          var m = lines[i].match(re);
          if (m) { items.push(renderInline(m[1])); i++; }
          else break;
        }
        html.push('<' + tag + '>');
        items.forEach(function (item) { html.push('<li>' + item + '</li>'); });
        html.push('</' + tag + '>');
        continue;
      }

      // 空行：结束当前段落
      if (/^\s*$/.test(line)) {
        flush();
        i++;
        continue;
      }

      // 普通段落行
      para.push(line);
      i++;
    }

    flush();
    return html.join('\n');
  }

  /* ---------------- Front Matter 解析 ---------------- */

  function parseFrontMatter(text) {
    var meta = {};
    var body = text;
    if (text.indexOf('---') === 0) {
      var end = text.indexOf('\n---', 3);
      if (end !== -1) {
        var fm = text.slice(3, end).trim();
        body = text.slice(end + 4);
        fm.split('\n').forEach(function (line) {
          var idx = line.indexOf(':');
          if (idx === -1) return;
          meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        });
      }
    }
    meta.body = body.replace(/^\n+/, '');
    return meta;
  }

  /* ---------------- 首页：文章列表 ---------------- */

  function renderIndex() {
    var listEl = document.getElementById('post-list');
    var statusEl = document.getElementById('status');
    if (!listEl) return false;

    fetch('posts.json', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (posts) {
        if (!Array.isArray(posts) || !posts.length) {
          statusEl.textContent = '还没有文章 —— 把 .md 文件放进 posts/ 并在 posts.json 登记后即可发布。';
          return;
        }
        statusEl.hidden = true;
        posts
          .slice()
          .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })
          .forEach(function (p) {
            var li = document.createElement('li');
            li.className = 'post-item';
            li.innerHTML =
              '<div class="post-date">' + formatDate(p.date) + '</div>' +
              '<h2 class="post-title"><a href="post.html?file=posts/' +
              encodeURIComponent(p.slug) + '.md">' + escapeHtml(p.title) + '</a></h2>' +
              (p.excerpt ? '<p class="post-excerpt">' + escapeHtml(p.excerpt) + '</p>' : '');
            listEl.appendChild(li);
          });
      })
      .catch(function (err) {
        statusEl.textContent = '文章列表加载失败：' + err.message + '（请确认 posts.json 存在且格式正确）';
      });
    return true;
  }

  /* ---------------- 详情页：渲染文章 ---------------- */

  function renderPost() {
    var articleEl = document.getElementById('post');
    var statusEl = document.getElementById('status');
    if (!articleEl) return false;

    var file = getParam('file');
    if (!file) {
      statusEl.textContent = '缺少文章参数 —— 链接应为 post.html?file=posts/xxx.md';
      return true;
    }

    fetch(file, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        var meta = parseFrontMatter(text);
        var title = meta.title || file;
        document.title = title + ' · ' + SITE.title;
        var minutes = Math.max(1, Math.round(meta.body.replace(/\s/g, '').length / 400));
        articleEl.innerHTML =
          '<header class="post-head">' +
            '<h1 class="post-title">' + escapeHtml(title) + '</h1>' +
            '<div class="post-meta">' + formatDate(meta.date) + ' · 阅读约 ' + minutes + ' 分钟</div>' +
          '</header>' +
          '<div class="post-body">' + renderMarkdown(meta.body) + '</div>';
        statusEl.hidden = true;
        window.scrollTo(0, 0);
        if (hasMath(meta.body)) loadMathJax();
      })
      .catch(function (err) {
        statusEl.textContent = '文章加载失败：' + err.message;
      });
    return true;
  }

  /* ---------------- 启动 ---------------- */

  if (!renderIndex()) renderPost();

  /* ---------------- 测试钩子（浏览器中无副作用） ---------------- */

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      escapeHtml: escapeHtml,
      renderInline: renderInline,
      renderMarkdown: renderMarkdown,
      parseFrontMatter: parseFrontMatter,
      formatDate: formatDate,
      hasMath: hasMath
    };
  }
})();
