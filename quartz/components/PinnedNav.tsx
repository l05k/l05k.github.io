import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"

/**
 * PinnedNav —— 固定导航组件（左侧栏）
 *
 * 显示所有 frontmatter 标记 `pinned: true` 的笔记作为导航项：
 *   ---
 *   title: 关于
 *   pinned: true
 *   navOrder: 1      # 可选，控制顺序（小的在前）
 *   ---
 *
 * 任意笔记加上 pinned: true 即出现在导航栏；不加则不出现在导航。
 * 导航项点击直接进入该笔记页面（这些笔记内部可用 [[wikilinks]] 链接到相关笔记）。
 */
function PinnedNav({ allFiles, fileData }: QuartzComponentProps) {
  const pinned = allFiles
    .filter((f) => f.frontmatter?.pinned === true && !!f.slug)
    .sort((a, b) => {
      const ao = (a.frontmatter?.navOrder as number | undefined) ?? 999
      const bo = (b.frontmatter?.navOrder as number | undefined) ?? 999
      if (ao !== bo) return ao - bo
      return (a.frontmatter?.title ?? a.slug!).localeCompare(b.frontmatter?.title ?? b.slug!)
    })

  if (pinned.length === 0) return null

  return (
    <div class="pinned-nav">
      <h3>导航</h3>
      <ul>
        {pinned.map((f) => {
          const title = f.frontmatter?.title ?? f.slug
          const isActive = fileData.slug === f.slug
          return (
            <li>
              <a
                href={resolveRelative(fileData.slug!, f.slug!)}
                class={"internal" + (isActive ? " active" : "")}
              >
                {title}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

PinnedNav.displayName = "PinnedNav"
PinnedNav.css = `
.pinned-nav { margin-bottom: 0.75rem; }
.pinned-nav > h3 { margin: 0.5rem 0 0 0; font-size: 1rem; }
.pinned-nav > ul { list-style: none; margin: 0.5rem 0 0 0; padding-left: 0; }
.pinned-nav > ul > li { margin: 0.4rem 0; }
.pinned-nav > ul > li > a { background-color: transparent; font-weight: 500; }
.pinned-nav > ul > li > a.active { color: var(--secondary); font-weight: 600; }
`

export default (() => PinnedNav) satisfies QuartzComponentConstructor
