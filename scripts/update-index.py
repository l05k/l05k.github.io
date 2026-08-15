#!/usr/bin/env python3
"""自动索引：扫描 posts/*.md 的 Front Matter，重新生成 posts.json。

用法：
  本地：python3 scripts/update-index.py
  GitHub Actions：push 后自动运行（见 .github/workflows/update-index.yml）

posts.json 由本脚本生成，不需要也不建议手动编辑。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"
INDEX = ROOT / "posts.json"


def parse_front_matter(text: str) -> dict:
    """解析 --- ... --- 开头的 YAML Front Matter（简单版，够用即可）。"""
    meta = {}
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            for line in text[3:end].splitlines():
                if ":" in line:
                    key, _, value = line.partition(":")
                    meta[key.strip()] = value.strip()
    return meta


def main() -> None:
    posts = []
    for f in sorted(POSTS_DIR.glob("*.md")):
        fm = parse_front_matter(f.read_text(encoding="utf-8"))
        posts.append({
            "slug": f.stem,
            "title": fm.get("title", f.stem),
            "date": fm.get("date", ""),
            "excerpt": fm.get("excerpt", ""),
        })

    posts.sort(key=lambda p: p["date"], reverse=True)
    INDEX.write_text(
        json.dumps(posts, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"已更新 {INDEX}：{len(posts)} 篇文章")


if __name__ == "__main__":
    main()
