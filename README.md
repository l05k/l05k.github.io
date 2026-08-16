# Losk's Journal

极简杂志风个人博客，由 [Obsidian](https://obsidian.md/) 写作、[Quartz v5](https://quartz.jzhao.xyz/) 生成，托管于 GitHub Pages（https://l05k.github.io）。

## 架构

```
Obsidian (Enveloppe 插件) ──推送──> content/posts/*.md ──GitHub Actions──> Quartz 构建 ──> GitHub Pages
```

- **写作**：Obsidian，公式用 `$...$` / `$$...$$`（Quartz 构建时用 KaTeX 渲染）
- **内容**：`content/posts/`（Enveloppe 推送目标）
- **构建**：Quartz v5（`.github/workflows/deploy.yml` → `npx quartz build` → 部署 `public/`）
- **配置**：`quartz.config.yaml`（站点信息 / 主题配色 / 插件开关）

## 本地开发

```bash
npm ci
npx quartz plugin install --from-config   # 安装配置引用的插件
npx quartz build --serve                  # 本地预览 http://localhost:8080
```

## 发布新文章

1. 在 Obsidian 里写好文章（front matter 含 `title`、`date`、`tags`）
2. 用 Enveloppe 插件推送到 `content/posts/`（或直接 `git push` 该目录下的 .md 文件）
3. GitHub Actions 自动构建部署

## 公式

- 行内：`$E = mc^2$`
- 块级：`$$...$$`（独立成行）
- 引擎：KaTeX（Quartz 默认，构建时渲染），与 Obsidian 的 MathJax 渲染效果基本一致

## 自定义

- 主题配色 / 字体：`quartz.config.yaml` → `theme`
- 插件开关：`quartz.config.yaml` → `plugins`（如 graph 视图、评论、搜索）
- 详细文档：https://quartz.jzhao.xyz/
