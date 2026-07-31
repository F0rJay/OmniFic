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

### 写作准备状态（Writing Readiness）

- **定义**：尚无章节项目在 Agent 首次写正文前的项目级状态，包含核心资料准备项、Auditor 审查快照和当前回合授权。
- **代码位置**：`backend/app/storage/models/writing_readiness.py`, `backend/app/storage/services/writing_readiness_service.py`
- **延伸阅读**：`docs/features/writing-readiness.md`
- **常见混淆**：写作准备状态 != 工具权限。前者判断新项目是否可以首次开写，后者决定具体工具调用是否允许、询问或拒绝，两者同时生效。

### 准入审查（Readiness Review）

- **定义**：由 Auditor 对核心世界书、主要角色、全书总纲和开篇细纲执行的结构化审查。结果绑定资料快照，资料变化后会过期。
- **代码位置**：`backend/app/agent_runtime/tools/impls/writing_readiness/submit_review.py`
- **延伸阅读**：`docs/features/writing-readiness.md`

### 当前回合正文授权（Current-turn Writing Authorization）

- **定义**：用户在当前消息中明确要求写正文后，绑定该消息修订和当前资料快照的一次性首次正文授权。
- **代码位置**：`backend/app/agent_runtime/tools/impls/writing_readiness/authorize.py`
- **延伸阅读**：`docs/features/writing-readiness.md`
- **常见混淆**：泛化的策划或“从零设计小说”请求不会自动授权正文写入。

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
- **延伸阅读**：[上下文压缩机制](./features/context-compaction.md)
- **常见混淆**：Context Build != Compaction。Build 是每次组装，Compaction 是按检查点对旧历史做摘要覆盖或预算重置。

### Compaction（压缩）

- **定义**：在模型感知的 token 预算内，用 `llm_summary` 工作简报或 `token_budget` 应急重置覆盖旧有效历史，并保留原始会话记录与持久化检查点的过程。
- **代码位置**：`backend/app/agent_runtime/context/compaction/`
- **延伸阅读**：[上下文压缩机制](./features/context-compaction.md)
- **常见混淆**：压缩 != 删除聊天记录。压缩改变后续模型输入，原始消息仍保留用于显示和审计。

### LLM Summary（LLM 摘要策略）

- **定义**：上下文压缩的默认策略。把完整有效历史作为结构化消息交给摘要模型，生成包含目标、决策、相关内容、错误与待办的工作简报，并在持久化前重建下一窗口进行安全校验。
- **代码位置**：`backend/app/agent_runtime/context/compaction/service.py`, `backend/app/prompts/session/compaction.yaml`
- **延伸阅读**：[上下文压缩机制](./features/context-compaction.md)

### Token-Budget Compaction（Token 预算应急压缩）

- **定义**：摘要提示词或模型不可用、摘要为空或摘要后仍超出安全区时，不调用 LLM，通过二分搜索尽量保留最近用户指令并删除旧 assistant/tool 历史的确定性应急策略。
- **代码位置**：`backend/app/agent_runtime/context/compaction/token_budget.py`
- **延伸阅读**：[上下文压缩机制](./features/context-compaction.md)
- **常见混淆**：Token-Budget Compaction != 自动压缩阈值。前者是压缩失败后的策略，后者决定何时自动开始压缩。

### Compaction Checkpoint（压缩检查点）

- **定义**：记录一次压缩覆盖的原始消息序号范围、代次、策略、摘要和预算指标的持久化记录。同一会话范围不重叠，构建模型输入时只应用最新检查点。
- **代码位置**：`backend/app/agent_runtime/persistence/model.py`, `backend/app/agent_runtime/persistence/compaction_repo.py`
- **延伸阅读**：[上下文压缩机制](./features/context-compaction.md)

---

## 文档约定

- **新增术语**：在本文件添加条目，包含定义 + 代码位置 + 延伸阅读
- **修改术语**：更新定义，在 CHANGELOG.md 中记录
- **废除术语**：保留条目，标记 `[已废除]`，添加替换引用
