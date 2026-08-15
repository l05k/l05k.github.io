# Losk's Journal

一个由 **Markdown 驱动**的极简杂志风个人博客，托管于 GitHub Pages。

- 文章在 **Obsidian** 里写，公式用 `$...$` 写 —— 构建时用 **MathJax 服务端渲染**（与 Obsidian 同一引擎，效果完全一致），**打开页面就是成品 HTML，零等待、零卡顿**
- 发布 = 从 Obsidian 一键推送（Enveloppe 插件），或手动放 `.md` 进 `posts/` 后 `git push`
- push 后 GitHub Action 自动完成：预渲染全部文章 → 部署上线（约 1 分钟）
- 所有代码由 AI Agent 编写；改样式 / 加功能，开 Issue 或直接让 Agent 改

## 目录结构

```
.
├── posts/          # Markdown 源文章（唯一需要你写的地方）
│   └── hello-world.md
├── assets/         # 图片等附件（Obsidian 嵌入的图片发布到这里）
├── app.js          # Markdown 渲染器（构建时复用，也用于测试）
├── styles.css      # 全部样式 —— 想换风格改顶部 :root 变量
├── scripts/
│   ├── build.js         # 预渲染构建：Markdown + 公式 → 静态 HTML（public/）
│   └── test-render.js   # 渲染管线自检（npm test）
├── package.json    # 构建依赖（仅 mathjax-full，构建期使用）
├── .github/workflows/
│   └── deploy.yml  # push 后自动构建并部署到 GitHub Pages
├── public/         # 构建产物（自动生成，不要手动编辑）
├── .nojekyll       # 禁用 GitHub Pages 的 Jekyll 处理，别删
└── README.md
```

## 一、本地预览

需要 Node.js（构建用）：

```bash
cd 本项目目录
npm install      # 首次需要
npm run build    # 预渲染生成 public/
python3 -m http.server -d public 8000
```

浏览器打开 <http://localhost:8000> 即可预览。

## 二、写一篇新文章

### 方式 A：从 Obsidian 发布（推荐）

配置好 Enveloppe 插件后（见第五节），在 Obsidian 里写好笔记 → 点一下发布按钮 → 自动推送 → GitHub Action 自动构建部署 → 约 1 分钟后上线。**全程零手动步骤。**

### 方式 B：手动发布

1. 复制 `posts/hello-world.md` 为 `posts/你的文章名.md`（文件名建议英文小写短横线）
2. 文件头 Front Matter 写 `title` / `date`（`YYYY-MM-DD`）/ `excerpt`（可选），正文用 Markdown 写
3. `git push` —— 剩下的（构建、部署）全自动

### 数学公式

和 Obsidian 完全相同的写法（`$...$` 行内、`$$...$$` 块级）。构建时服务端渲染成静态 HTML，**读者打开页面时不需要下载任何公式引擎**：

```markdown
行内公式：质能方程 $E = mc^2$

块级公式：
$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
```

## 三、首次部署（手把手，只需做一次）

> 前提：有一个 GitHub 账号。以下步骤只需做一次，之后每次发文章只需 push。

### 第 1 步：创建仓库

1. 打开 <https://github.com/new>
2. **Repository name 必须填**：`l05k.github.io`（你的用户名 + `.github.io`，决定网站地址）
3. Visibility 选 **Public**（免费版 Pages 需要公开仓库）
4. 不要勾选任何初始化选项，直接点 **Create repository**

### 第 2 步：把代码推上去

在本地项目目录打开终端，逐条执行：

```bash
git init
git add .
git commit -m "init: markdown 驱动的个人博客"
git branch -M main
git remote add origin https://github.com/l05k/l05k.github.io.git
git push -u origin main
```

第一次 push 会要求输入 GitHub 用户名和密码（密码处填 **Personal Access Token**，不是登录密码。生成方法：GitHub → Settings → Developer settings → Personal access tokens → Generate new token，勾选 `repo` 权限）。

### 第 3 步：开启 Pages（选择 GitHub Actions 作为来源）

1. 打开仓库页面 → **Settings** → 左侧 **Pages**
2. **Source** 选 `GitHub Actions`（不是 Deploy from a branch！）
3. 推送后 Action 会自动构建并部署，等约 1 分钟，打开 **<https://l05k.github.io>** 就能看到你的博客了

> 如果 Source 显示的是 "Deploy from a branch"，切换到 `GitHub Actions` 即可，无需其它设置。

### 以后每次发文章

```bash
git add .
git commit -m "post: 新文章标题"
git push
```

推送后约 1 分钟内自动上线。

## 四、为什么有个 `.nojekyll` 文件？

GitHub Pages 默认会用 Jekyll 处理仓库，把 `.md` 文件"编译"成 HTML。`.nojekyll` 是空文件，作用是关闭 Jekyll（当前使用 Actions 部署时它不影响构建，但保留它以兼容任何分支部署方式）。**不要删除它。**

## 五、从 Obsidian 一键发布（Enveloppe 插件）

[Enveloppe](https://github.com/Enveloppe/obsidian-enveloppe) 是 Obsidian 社区插件，把选中的笔记转换并推送到本仓库。安装后在插件设置里配置：

| 配置项 | 填什么 |
|---|---|
| GitHub 仓库 | `l05k/l05k.github.io`，分支 `main` |
| GitHub Token | 在 GitHub 生成（勾选 `repo` 权限）后粘贴进来 |
| 发布文件夹 | 设为 `posts`（转换后的 .md 放到这里） |
| 图片文件夹 | 设为 `assets`（笔记里 `![[图片]]` 自动上传到这里） |
| Front Matter | 保留 `title` / `date` / `excerpt` 三个属性（列表页显示用） |
| 双链转换 | 开启（`[[笔记]]` 自动转成相对链接） |

配置完成后：在 Obsidian 里写好笔记 → 右键 / 命令面板选择"Enveloppe 发布"→ 自动推送 → 自动构建部署 → 上线。

> 详细配置以插件官方文档为准：<https://enveloppe.ovh/>

## 六、修改样式 / 功能（交给 AI，不写代码）

这个项目刻意保持简单，所有代码集中，任何 AI Agent 都能快速理解并修改。

**推荐流程：GitHub Issues**

1. 在仓库的 **Issues** 里开一个 issue，写清楚需求（例如："把站名改成 XX"、"加一个深色模式"、"加 RSS"）
2. 让 AI Agent 读取这个 issue 来改代码、提交、推送
3. 推送后自动上线，issue 可以关闭归档

想改小东西也可以直接告诉 AI：配色在 `styles.css` 顶部的 `:root` 变量里，站名/署名/链接在 `app.js` 顶部的 `SITE` 配置里。

## 七、常见问题

**文章不显示？**
- 推送后等 1 分钟（构建 + 部署需要时间），浏览器 Ctrl/Cmd + Shift + R 强制刷新
- 检查 Front Matter 是否写了 `date`，文件名即文章链接名

**公式不显示 / 显示乱码？**
- 确认文章里有成对的 `$...$` 或 `$$...$$`
- 构建日志里每个公式都会显示"已服务端渲染"（仓库 Actions 页可看）
- 公式在构建时渲染，读者端零负担

**想用更复杂的 Markdown（表格、脚注等）？**
当前渲染器支持基础语法 + 公式。开 issue 让 Agent 接入 [marked](https://marked.js.org/) 或扩展渲染器。

**想换域名？**
仓库 Settings → Pages → Custom domain 配置你自己的域名即可。

**版权**：博客内容归你所有，本站代码（HTML/CSS/JS）可自由使用。
