# SSG 选型对比：Eleventy / Hugo / Astro / Zola / MkDocs / Jekyll / Quartz

> 背景：现站点为自定义 Python+Node 工具链（手写 Markdown 渲染器 + MathJax SSR 公式系统）。
> 目标：迁移到成熟 SSG，解决"手写渲染器能力不足、响应式不系统、无多浏览器验证"的问题。
> 硬约束：访问性能 > 构建性能；公式系统（SSR 预渲染 + 字形可选中 + 复制为 Markdown）优先保留；Obsidian + Enveloppe 工作流不变；GitHub Pages 部署；Chrome 验收；轻量验证。
> 更新：2026-08-15（v3，补全 MkDocs / Jekyll / Quartz 全面比较）

---

## 0. 公式系统的通用迁移方案（先读这段）

公式链路 = 提取 `$...$`（保护代码块）→ mathjax-full SSR → 字形文本化 → `data-latex` → math-copy.js 复制。

两条路：

1. **完整保留（SSR）**：在 Node 系 SSG（Eleventy/Astro）里把现有代码搬进渲染管线（复用 ~80%）；Hugo 用 goldmark `passthrough`（[Hugo ≥ 0.125 官方支持](https://gohugo.io/content-management/mathematics/)）保护 `$...$` + 一个 Node 后处理脚本。Python/Ruby 系（MkDocs/Jekyll）**构建时 SSR 基本不可行**（社区讨论结论一致，如 [Jekyll Talk](https://talk.jekyllrb.com/t/is-it-possible-to-pre-render-equations-with-mathjax-during-the-website-build-in-github-pages/9140/4)）。
2. **客户端渲染（简化）**：页面加载时浏览器跑 MathJax v3（与 Obsidian 同引擎，渲染一致），放弃 SSR 与字形选中，复制为 Markdown 仍可通过"页面加载后 JS 注入 data-latex + math-copy.js"保留。

---

## 1. Eleventy（Node）⭐ 第一推荐

- 公式：**SSR 完整保留**，代码复用 ~80%（markdown-it 插件保护 + addTransform 后处理）
- 访问性能：纯静态零 JS，最优；构建：秒级
- 模板 Nunjucks/Liquid/JS，杂志风像素级复刻；无主题市场（自己写，已有现成资产）
- 复杂度最低（纯 Node、单一配置文件）；成熟稳定（[v3.1，2025](https://www.11ty.dev/blog/eleventy-v3-1/)）
- 风险：低。**适合：要简单可控、公式资产零损失**

## 2. Hugo（Go）

- 公式：passthrough + Node 后处理脚本（可行，管线变"Go 模板 + Node 脚本"混合）
- 构建最快（毫秒-秒级）；主题生态最全；中文教程最多
- 模板 Go 语法（学习曲线陡）；用现成主题则访问性能看主题质量
- 风险：中。**适合：要主题生态 + 构建极致快 + 教程多**

## 3. Astro（Node）

- 公式：SSR 完整保留（remark-math 保护 + `astro:build:done` 后处理）
- **访问性能最强**（默认零 JS + 内置资源压缩/哈希/自动图片优化）；官方主题市场
- 构建最慢（Vite 链，小站 10s 内）；复杂度最高；大版本迭代快
- 风险：中。**适合：要访问性能极致 + 现代组件化**

## 4. Zola（Rust）

- 公式：无官方方案，需自建（shortcode/客户端/后处理脚本，生态支持少）
- 单二进制、构建极快、零 JS；主题生态小（~100+）
- 风险：中-高（社区小、公式短板）。**适合：要极致轻量，公式不是重点**

## 5. MkDocs（Python）—— Enveloppe 的"亲儿子"

- **Obsidian 兼容性：全场最强之一**——Enveloppe 原名就是 *obsidian-mkdocs-publisher*，[官方文档有专门章节](https://enveloppe.ovh/wikis/Mkdocs/)，Obsidian 社区教程最多
- 主题：[Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)（事实标准）——**移动端适配是全场最省心的**：Material Design 规范响应式、触控、亮暗模式、搜索、PWA 离线全内置
- 公式：[Material 官方支持 MathJax 或 KaTeX（客户端渲染）](https://squidfunk.github.io/mkdocs-material/reference/math/)——MathJax v3 与 Obsidian 同引擎、渲染一致；但**构建时 SSR 不可行**，放弃字形选中（复制为 Markdown 可保留）
- 博客能力：**非原生**（文档站定位），文章列表/标签靠插件（Material 内置 blog 插件，较新但可用）
- 访问性能：Material 带 JS（搜索等），比零 JS 方案重
- 构建：Python，秒级-10s 级；语言 Python（你"自己搞的 Python"身份最贴合）
- 定制：Material 风格烙印强（CSS 变量可调色/字体，可做杂志风但框架感明显）
- 风险：中（博客非原生、公式无 SSR、主题单一）。**适合：要"Obsidian 发布开箱即用 + 移动端最省心 + Python 生态"**

## 6. Jekyll（Ruby）

- 定位：最老牌博客 SSG（2008 至今）；**博客功能原生**（posts 集合/标签/分类/分页）；GitHub Pages 原生（你用 Actions，用不上这点）
- 公式：kramdown + MathJax 客户端（社区标准做法；[构建时 SSR 不可行](https://talk.jekyllrb.com/t/is-it-possible-to-pre-render-equations-with-mathjax-during-the-website-build-in-github-pages/9140/4)）
- 主题：生态大但**老主题响应式质量参差**（需筛选/改造）
- 构建：**最慢**（Ruby，小站 10-30s，体量大了分钟级）
- Obsidian：Enveloppe 支持 Jekyll frontmatter
- 复杂度：Ruby 环境（Gemfile/bundle）较笨重
- 风险：中-高（构建慢、Ruby 依赖、公式无 SSR、主题老化）。**适合：要老牌博客系统 + 接受 Ruby 与慢构建**——对你场景价值低

## 7. Quartz（Node/SvelteKit）—— Obsidian 数字花园

- **Obsidian 集成最原生**：wikilinks `[[...]]`、backlinks、文件夹结构、frontmatter 直通、graph 视图；可直接对 vault 构建
- 公式：**KaTeX**（客户端）——与 Obsidian（MathJax v3）**渲染引擎不同**，违背你"与 Obsidian 一致"的要求
- 风格：数字花园（卡片 + 关系图），**非博客/杂志风**，深度定制难（Svelte 组件 + SCSS）
- 性能：SSG 输出 + 搜索/graph 等 JS，比零 JS 重
- 风险：高（风格不符、KaTeX、定制难）。**适合：想要"笔记库展示"（wiki 互链）而非博客**——你的场景（文章列表、杂志风）不对路

---

## 8. 七选总对比

| 维度 | Eleventy | Hugo | Astro | Zola | MkDocs | Jekyll | Quartz |
|---|---|---|---|---|---|---|---|
| 公式 SSR+选中+复制保留 | ✓ 低成本 | ✓ 混合管线 | ✓ 低成本 | △ 自建 | ✗ 客户端 | ✗ 客户端 | ✗ KaTeX |
| 公式与 Obsidian 一致 | ✓ | ✓ | ✓ | △ | ✓(客户端) | ✓(客户端) | **✗ 引擎不同** |
| Obsidian/Enveloppe 兼容 | ✓ 零冲突 | ✓ 官方 | ✓ 零冲突 | ✓ | **⭐ 官方亲儿子** | ✓ | **⭐ 最原生(wikilinks)** |
| 博客原生能力 | 集合自建 | ✓ | 集合自建 | ✓ | △ 靠插件 | **⭐ 原生博客** | ✗ 笔记库 |
| 移动端适配省心度 | 自己写 | 看主题 | 自己写 | 自己写 | **⭐ Material 开箱即用** | 看主题 | 自带但花园风 |
| 访问性能 | 零 JS 最优 | 自写等价 | **最强** | 零 JS 最优 | 带 JS 较重 | 看主题 | 带 JS 较重 |
| 构建性能 | 秒级 | **最快** | 较慢 | 极快 | 秒-10s | **最慢** | 中等 |
| 主题生态 | 无 | **最全** | 官方市场 | 小 | Material 独大 | 大但老化 | 无(定制难) |
| 模板定制（杂志风） | 自由 | 自由(Go) | 自由(组件) | 自由(Tera) | 烙印强 | 自由 | 难 |
| 复杂度/依赖 | **最低** | 中 | 最高(Vite) | 低 | 中(Python) | 中高(Ruby) | 中高(Svelte) |
| 成熟稳定 | 高 | 高 | 高(迭代快) | 中 | 高 | 高但老化 | 中(社区热) |
| AI 维护成本 | 低 | 中 | 中-高 | 低 | 低 | 中 | 中 |
| 风险 | 低 | 中 | 中 | 中-高 | 中 | 中-高 | 高 |

## 9. 推荐排序

1. **Eleventy** —— 简单可控、公式资产零损失、零 JS 访问性能最优、杂志风自由复刻，无短板
2. **Astro** —— 访问性能榨到极致 + 官方主题市场，接受更重构建链
3. **MkDocs + Material** —— 想要"Obsidian 发布开箱即用 + 移动端最省心 + Python 身份"，接受公式降级客户端渲染、博客靠插件
4. **Hugo** —— 想要主题生态/构建速度/中文教程，接受混合管线
5. **Zola / Jekyll / Quartz** —— 各有明显短板（公式/构建/风格），不建议

## 10. 参考

- Eleventy：https://www.11ty.dev/ ；v3.1：https://www.11ty.dev/blog/eleventy-v3-1/
- Hugo 公式（passthrough）：https://gohugo.io/content-management/mathematics/
- Material for MkDocs 公式：https://squidfunk.github.io/mkdocs-material/reference/math/
- Enveloppe（支持任意 SSG，含 MkDocs 章节）：https://github.com/Enveloppe/obsidian-enveloppe
- Jekyll 公式 SSR 讨论：https://talk.jekyllrb.com/t/is-it-possible-to-pre-render-equations-with-mathjax-during-the-website-build-in-github-pages/9140/4
- Obsidian→GitHub Pages 选型研究：https://laoujin.github.io/Atlas/research/2026-04-30-upgrading-a-personal-obsidian-workflow-in-2026/selective-publishing-to-github-pages-or-equivalents/
- Quartz：https://quartz.jzhao.xyz/
