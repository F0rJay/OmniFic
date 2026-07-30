# 内容导出

> **状态**：Active · **代码范围**：`frontend/src/lib/file-export.ts` 与四类编辑器 · **审查日期**：2026-07-31 · **触发条件**：新增导出对象、修改文件格式或导入兼容性

OmniFic 支持在编辑器工具栏中导出单项创作内容。导出使用浏览器下载能力，不会移动、删除或修改数据库中的原始内容。

## 支持的内容与格式

| 内容 | 文件格式 | 主要内容 |
|---|---|---|
| 章节 | UTF-8 Markdown (`.md`) | 一级标题与当前章节正文 |
| 笔记 | UTF-8 Markdown (`.md`) | 一级标题与当前笔记正文 |
| 世界书条目 | SillyTavern 兼容 JSON (`.json`) | 单个 `entries` 对象，包含 UID、名称、正文、启用状态与顺序 |
| 角色档案 | Character Card V2 JSON (`.json`) | `chara_card_v2` 名称、描述、标准空字段与 OmniFic 扩展元数据 |

导出读取编辑器中的最新草稿，因此可以在自动保存完成前保存当前内容的文件副本。角色卡会记录头像 URL 和 OmniFic 内部标识，但当前版本不把头像二进制数据嵌入 JSON。

## 文件名处理

文件名默认使用当前标题或名称。导出工具会：

- 替换控制字符和 Windows/macOS 不允许的 `< > : " / \\ | ? *` 字符；
- 移除末尾的空格和句点；
- 将文件名主体限制在 120 个字符内；
- 在标题为空时使用“未命名章节”“未命名笔记”“world-book-entry”或“character-card”等回退名称。

## 使用边界

- 单项导出不包含项目、卷、分类、Agent 会话、模型配置、摘要、索引或修订历史。
- 世界书条目 JSON 可进入 SillyTavern 生态，但它只包含当前条目，不是整本世界书的完整导出。
- 角色卡采用 V2 JSON 结构，OmniFic 没有的数据字段保持为空；其他软件是否完整保留扩展字段取决于其实现。
- 灾难恢复仍应备份完整数据目录，具体路径见[安装与卸载指南](../installation.md)。

## 实现

- `frontend/src/lib/file-export.ts` — 文件名清理、Markdown/JSON 构建与下载
- `frontend/src/features/writing/components/chapter-editor.tsx` — 章节导出
- `frontend/src/features/writing/components/note-editor.tsx` — 笔记导出
- `frontend/src/features/world-info/components/entry-editor.tsx` — 世界书条目导出
- `frontend/src/features/characters/components/character-editor.tsx` — 角色卡导出
- `frontend/src/lib/file-export.test.ts` — 格式与文件名回归测试
