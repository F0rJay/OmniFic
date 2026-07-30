# 首次正文写作准入

> **状态**：Active · **代码范围**：`backend/app/storage/services/writing_readiness_service.py`、Agent 工具与写入门禁 · **审查日期**：2026-07-31 · **触发条件**：准备项、审查快照、正文授权或 Writer 职责变更

首次正文写作准入用于防止 Agent 在新项目缺少关键设定和大纲时直接生成章节。它只约束 Agent 对尚无章节项目的首次正文写入，不阻止用户手动编辑，也不反复拦截已经进入正常写作阶段的项目。

## 准备项

项目需要同时满足四项基础条件：

1. **核心世界书**：至少存在一个世界书条目。
2. **主要角色**：至少存在一个角色档案。
3. **全书宏观粗纲**：至少一篇笔记的标题包含“全书总纲”“全书粗纲”“全书宏观大纲”或“宏观大纲”。
4. **首个剧情段细纲**：至少一篇笔记的标题包含“开篇细纲”“开局细纲”“首段细纲”或“首个剧情段细纲”。

新建项目会自动准备项目世界书容器，但仍需要实际条目才能满足核心世界书要求。

## 审查与快照

基础资料齐备后，由 Auditor 检查世界规则、角色、全书大纲与开篇细纲，并通过 `submit_writing_readiness_review` 提交通过或失败、摘要和问题清单。

审查记录绑定资料快照。项目标题和简介、角色、世界书条目或两级准入大纲发生变化后，已通过的审查会标记为过期，必须重新审查。其他普通笔记不会进入该快照。

## 当前回合授权

审查通过不等于可以立即写正文。只有当前用户消息明确要求“写正文”“写某章”或“续写”等正文操作时，主 Agent 才能调用 `authorize_writing_request` 授权当前回合。授权绑定当前消息修订和同一份资料快照，不能跨回合或跨资料变更复用。

“设计一本小说”“从零创作”“帮我规划故事”等泛化请求只启动资料准备和规划，不构成正文授权。

## 写入门禁

首次正文的 `write_chapter`、正文型 `edit_chapter` 和 Writer 委派会经过同一门禁：

- 准备项或审查未通过时，返回缺失项并停止写入；
- 当前回合未授权时，要求用户明确正文意图；
- 已授权后，首次正文仍必须由 Writer 执行，主 Agent 不能绕过委派直接写入；
- 项目一旦存在章节，状态进入 `writing`，后续章节沿用正常工具权限和审批流程。

工具权限仍独立生效。通过准入不代表跳过“允许 / 询问 / 拒绝”策略，也不代表自动批准具体变更。

## 状态与接口

`GET /api/v1/projects/{project_id}/writing-readiness` 返回当前阶段、准备项、审查结果、过期状态、阻塞项和资料数量。Agent 侧使用三个工具：

- `get_writing_readiness`：读取准备状态；
- `submit_writing_readiness_review`：Auditor 提交审查；
- `authorize_writing_request`：根据当前用户消息授权首次正文写入。

## 实现

- `backend/app/storage/models/writing_readiness.py` — 项目级状态记录
- `backend/app/storage/services/writing_readiness_service.py` — 准备项、快照、审查和授权规则
- `backend/app/agent_runtime/tools/hooks/writing_readiness.py` — 章节工具与 Writer 委派门禁
- `backend/app/agent_runtime/tools/impls/writing_readiness/` — 三个 Agent 工具
- `backend/app/api/routers/projects.py` — 状态查询接口
- `backend/tests/api/test_writing_readiness.py` — API、快照、授权和门禁回归测试
