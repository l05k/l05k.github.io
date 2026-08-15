# Losk's Journal

一个由 **Markdown 驱动**的极简杂志风个人博客，纯静态、零依赖、零构建步骤，托管于 GitHub Pages。

- 写文章 = 往 `posts/` 丢一个 `.md` 文件 + 在 `posts.json` 登记一行
- 不需要本地安装任何工具（Node / Ruby / Python 都不需要）
- 所有代码由 AI Agent 编写，你想改样式 / 加功能，开 Issue 或直接让 Agent 改

## 目录结构

```
.
├── index.html      # 首页：文章列表
├── post.html       # 文章详情页（?file=posts/xxx.md 参数）
├── styles.css      # 全部样式 —— 想换风格改顶部 :root 变量
├── app.js          # 站点逻辑 + 迷你 Markdown 渲染器（零依赖）
├── posts.json      # 文章索引（列表页据此显示）
├── posts/          # 放 Markdown 文章的地方
│   └── hello-world.md
├── scripts/        # 可选开发工具
│   └── test-render.js  # 渲染管线自检（需本机 Node：node scripts/test-render.js）
├── .nojekyll       # 禁用 GitHub Pages 的 Jekyll 处理，别删
└── README.md
```

## 一、本地预览

不需要安装任何东西，macOS / Linux 自带 Python：

```bash
cd 本项目目录
python3 -m http.server 8000
```

浏览器打开 <http://localhost:8000> 即可预览。

## 二、写一篇新文章（三步）

1. **复制模板**：把 `posts/hello-world.md` 复制成 `posts/你的文章名.md`（文件名建议英文小写短横线，如 `my-first-post.md`）
2. **写内容**：文件头是 Front Matter（`---` 之间的 `title` / `date` / `excerpt`），下面是正文，用 Markdown 写。支持：标题、段落、加粗、斜体、删除线、行内代码、代码块、引用、有序/无序列表、链接、图片、分割线
3. **登记索引**：在 `posts.json` 数组里加一行：

```json
{
  "slug": "你的文章名",
  "title": "文章标题",
  "date": "2025-08-16",
  "excerpt": "列表页显示的摘要。"
}
```

> `slug` 必须和文件名一致（不含 `.md`）。保存后本地刷新即可看到效果。

## 三、发布到 GitHub Pages（手把手）

> 前提：有一个 GitHub 账号。以下步骤只需做一次，之后每次发文章只需最后两步。

### 第 1 步：创建仓库

1. 打开 <https://github.com/new>
2. **Repository name 必须填**：`Losk-x.github.io`（你的用户名 + `.github.io`，决定网站地址）
3. Visibility 选 **Public**（免费版 Pages 需要公开仓库）
4. 不要勾选 "Add a README" 等任何初始化选项，直接点 **Create repository**

### 第 2 步：把代码推上去

在本地项目目录打开终端，逐条执行：

```bash
git init
git add .
git commit -m "init: markdown 驱动的个人博客"
git branch -M main
git remote add origin https://github.com/Losk-x/Losk-x.github.io.git
git push -u origin main
```

第一次 push 会要求输入 GitHub 用户名和密码（密码处填 **Personal Access Token**，不是登录密码。生成方法：GitHub → Settings → Developer settings → Personal access tokens → Generate new token，勾选 `repo` 权限）。

### 第 3 步：开启 Pages

1. 打开仓库页面 → **Settings** → 左侧 **Pages**
2. **Source** 选 `Deploy from a branch`，Branch 选 `main` 和 `/ (root)`，点 **Save**
3. 等大约 1 分钟，打开 **<https://losk-x.github.io>** 就能看到你的博客了

### 以后每次发文章

```bash
git add .
git commit -m "post: 新文章标题"
git push
```

推送后约 1 分钟内自动上线。

## 四、为什么有个 `.nojekyll` 文件？

GitHub Pages 默认会用 Jekyll 处理仓库，把 `.md` 文件"编译"成 HTML —— 这会让我们的"浏览器直接读取 Markdown"机制失效。`.nojekyll` 是一个空文件，作用是关闭 Jekyll，让仓库里的文件**原样**被托管。**不要删除它。**

## 五、修改样式 / 功能（交给 AI，不写代码）

这个项目刻意保持简单，所有代码集中、零依赖，任何 AI Agent 都能快速理解并修改。

**推荐流程：GitHub Issues**

1. 在仓库的 **Issues** 里开一个 issue，写清楚需求（例如："把站名改成 XX"、"加一个深色模式"、"文章页加上一篇/下一篇导航"、"加 RSS"、"加评论功能"）
2. 让 AI Agent 读取这个 issue 来改代码、提交、推送
3. 推送后自动上线，issue 可以关闭并打上标签归档

想改小东西也可以直接告诉 AI：配色在 `styles.css` 顶部的 `:root` 变量里，站名在 `index.html` / `post.html` 头部和 `app.js` 的 `SITE` 配置里。

## 六、常见问题

**文章不显示？**
- 检查 `posts.json` 里是否登记了，`slug` 是否与文件名一致
- 推送后等 1 分钟再刷新（Pages 发布有延迟）
- 浏览器 Ctrl/Cmd + Shift + R 强制刷新（避开缓存）

**想用更复杂的 Markdown（表格、脚注等）？**
当前内置迷你渲染器不支持。开 issue 让 Agent 接入 [marked](https://marked.js.org/)（一个成熟的 Markdown 库），或者让 Agent 扩展渲染器。

**想换域名？**
在仓库 Settings → Pages → Custom domain 里配置你自己的域名即可。

**版权**：博客内容归你所有，本站代码（HTML/CSS/JS）可自由使用。
