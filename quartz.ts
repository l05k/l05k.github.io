import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { componentRegistry } from "./quartz/components/registry"
import PinnedNav from "./quartz/components/PinnedNav"

// 注册自定义组件（必须在 loadQuartzConfig 之前，供 quartz.config.yaml 的 source 引用）
componentRegistry.register("PinnedNav", PinnedNav, "./quartz/components/PinnedNav", {
  name: "PinnedNav",
  displayName: "PinnedNav",
  description: "固定导航：显示 frontmatter 标记 pinned: true 的笔记",
  version: "0.1.0",
})

const config = await loadQuartzConfig()
export default config

const _layout = await loadQuartzLayout()
export const layout = _layout
