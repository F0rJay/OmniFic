# 任务目标持久化

Agent 会话的持续约束，每次构建上下文时注入。

## 功能

- `/目标` 命令编辑任务目标
- 新建任务时草稿随 session create 自动写入
- 已有任务通过 Task API PATCH 更新
- 清除后不注入目标上下文

## 实现

- `backend/app/storage/models/task.py` — `Task.goal` 字段
- `backend/app/storage/migrations/versions/1015_add_task_goal.py`
- `backend/app/agent_runtime/context/parts/task_goal.py` — 读取当前目标
- `backend/app/agent_runtime/context/build_context.py` — 注入 `<task_goal>` 上下文

## 上下文格式

```xml
<task_goal>
完成第12章的战斗高潮……
</task_goal>
```

无目标时省略该 part。每次压缩/恢复后从数据库重新读取。
