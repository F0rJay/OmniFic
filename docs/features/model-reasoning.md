# 模型推理能力覆盖

中转站发现的模型无法自动识别推理能力，可手动指定。

## 问题

官方模型目录通过 provider URL + model ID 精确匹配判断是否支持 reasoning。
中转站模型无法匹配目录，导致推理选项被禁用。

## 方案

每个已保存模型新增三态 `reasoning_capability_override`：

| 值 | 含义 |
|---|---|
| `null` | 自动（根据官方目录推断） |
| `true` | 用户确认支持 |
| `false` | 用户确认不支持 |

优先级：手动覆盖 > 官方目录 > 默认不支持。

## 实现

- `backend/app/models/entities/model.py` — `reasoning_capability_override` 字段
- `backend/app/storage/migrations/versions/1017_add_model_reasoning_capability_override.py`
- `frontend/src/features/settings/components/model-form-dialog.tsx` — 编辑时的 Select
- `frontend/src/lib/use-llm-model-options.ts` — 前端能力解析
- `backend/app/api/routers/agent_runtime.py` — 后端能力判断
