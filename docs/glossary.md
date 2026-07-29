# OmniFic 术语表

> 术语合约，不是教学材料。所有文档应引用此处的定义，而不是重新解释术语。

---

## Agent 层

### Skill（技能）

- **定义**：可被 Agent 调用的预设能力模块，包含系统提示和工具权限。
- **代码位置**：`backend/app/storage/models/skill.py`, `backend/app/skills/loader.py`, `backend/app/agent_runtime/context/parts/skills.py`
- **延伸阅读**：`docs/features/codex-slash.md`
- **常见混淆**：Skill != Prompt Chain。Skill 是 Agent 运行时能力，Prompt Chain 是用户自定义的提示词模板。

### Skill Token

- **定义**：输入框中以蓝色立方体图标 + 技能名展示的不可编辑原子节点。发送到后端时序列化为 `/技能名` 纯文本。
- **代码位置**：`frontend/src/features/assistant/components/agent/extensions/skill-node.ts`
- **延伸阅读**：`docs/features/codex-slash.md`

### 任务目标（Task Goal）

- **定义**：持久化到 Task 记录的 Agent 会话约束。每次 build_context 时以 `<task_goal>` 标签注入到 LLM 上下文。
- **代码位置**：`backend/app/storage/models/task.py`, `backend/app/agent_runtime/context/parts/task_goal.py`
- **延伸阅读**：`docs/features/task-goal.md`

### 推理强度（Reasoning Effort）

- **定义**：控制模型推理深度的参数 `low | medium | high | xhigh | max`。需要模型支持。
- **代码位置**：`frontend/src/lib/agent.types.ts`, `backend/app/api/routers/agent_runtime.py`
- **延伸阅读**：`docs/features/model-reasoning.md`
- **常见混淆**：推理强度 != Temperature。前者控制 chain-of-thought 深度，后者控制输出随机性。

---

## 数据模型层

### Project

- **定义**：一本作品的顶层容器，包含卷、章、笔记、角色、世界书关联、任务和写作统计等数据。
- **代码位置**：`backend/app/storage/models/project.py`

### Volume（卷）

- **定义**：Project 下的分组容器，包含 0 或多个 Chapter。每个 Volume 有整数 order。
- **代码位置**：`backend/app/storage/models/volume.py`

### Chapter（章）

- **定义**：Volume 下的内容单元。`content` 为纯文本（换行符分隔）。
- **代码位置**：`backend/app/storage/models/chapter.py`

### Setting（设置）

- **定义**：用户配置的 key-value 存储。键名如 `language`、`theme`、`default_model`，值为 JSON 字符串。
- **代码位置**：`backend/app/storage/models/setting.py`, `backend/app/api/routers/settings.py`
- **常见混淆**：Setting != Environment Variable。Setting 可运行时修改，Env Var 需要重启。

---

## 供应商与模型层

### 中转站（Relay）

- **定义**：用户自部署的 OpenAI 兼容 API 代理服务，将多模型统一暴露为一个 endpoint。
- **代码位置**：`backend/app/models/services/model_provider_service.py`
- **延伸阅读**：`docs/features/relay-provider.md`
- **常见混淆**：中转站 != 官方 API。中转站 URL 由用户提供，不经过官方目录匹配。

### 推理能力覆盖（Reasoning Capability Override）

- **定义**：每个已保存 Model 的三态字段（null/true/false），用于手动指定该模型是否支持 reasoning effort。
- **代码位置**：`backend/app/models/entities/model.py:reasoning_capability_override`
- **延伸阅读**：`docs/features/model-reasoning.md`

---

## 上下文层

### Context Build（上下文构建）

- **定义**：Agent 每次 LLM 调用前，组装 System Prompt + Rules + Skills + Task Goal + History 的过程。
- **代码位置**：`backend/app/agent_runtime/context/build_context.py`
- **常见混淆**：Context Build != Compaction。Build 是每次组装，Compaction 是对历史做摘要压缩。

### Compaction（压缩）

- **定义**：将旧对话历史替换为 LLM 生成的摘要，释放上下文窗口。
- **代码位置**：`backend/app/agent_runtime/context/compaction/`

---

## 文档约定

- **新增术语**：在本文件添加条目，包含定义 + 代码位置 + 延伸阅读
- **修改术语**：更新定义，在 CHANGELOG.md 中记录
- **废除术语**：保留条目，标记 `[已废除]`，添加替换引用
