# / 命令中心

Codex 风格的 Agent 会话控制面板。在输入框输入 `/` 打开。

## 功能

| 命令 | 类型 | 说明 |
|---|---|---|
| MCP | 信息 | 展示 MCP 连接状态（即将支持） |
| 推理 | 配置 | 设置 Low/Medium/High/Xhigh/Max 推理强度 |
| 模型 | 配置 | 切换当前 Agent 使用的 LLM 模型 |
| 状态 | 信息 | 展示任务 ID、上下文用量、推理用时、令牌统计 |
| 目标 | 配置 | 编辑当前任务的持久化目标 |
| 技能 | 插入 | 选择 Skill 并以蓝色 Token 插入输入框 |

## 实现

- `frontend/src/features/assistant/components/agent/agent-skill-suggestions.tsx` — 面板组件
- `frontend/src/features/assistant/components/agent/agent-input.tsx` — 检测 + 过滤 + 键盘处理
- `frontend/src/features/assistant/components/agent/extensions/skill-node.ts` — TipTap 原子节点
- `frontend/src/features/assistant/components/agent/skill-chip.tsx` — 蓝色 Token 渲染

## Skill Token

选择技能后在输入框中显示蓝色立方体图标 + 技能名，不可编辑，可整体删除。发送到后端的 canonical text 仍为 `/技能名`。

## 键盘

```
↑/↓   导航
Enter  选择/打开
→      进入子菜单
←/Esc 返回/关闭
```

---

> **状态**：Active · **代码范围**：`frontend/src/features/assistant/components/agent/` · **审查日期**：2026-07-27 · **触发条件**：Skill 系统变更、输入框重构
