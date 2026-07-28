# 测试指南

## 后端测试

### 运行所有测试

```bash
cd backend
pytest
```

### 运行特定模块

```bash
pytest tests/api/test_tasks.py -v
pytest tests/api/test_agent.py -v
pytest tests/agent_runtime/context/ -v
pytest tests/agent_runtime/test_model_factory.py -v
```

### 编写测试

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_example():
    result = await some_function(param)
    assert result.expected_field == "value"
```

### 测试约定

- 测试文件命名为 `test_*.py`
- 使用 `pytest.mark.asyncio` 标记异步测试
- Mock 外部依赖（数据库、HTTP 调用）
- 每个功能应有基本正确路径和错误路径的覆盖

## 前端测试

前端使用 Vitest 运行回归测试，并配合类型检查、lint 和生产构建验证。

```bash
cd frontend
pnpm test          # Vitest 回归测试
pnpm type-check    # TypeScript 编译检查
pnpm lint          # 代码规范检查
pnpm build         # 生产构建（发现构建时错误）
```

当前回归测试包含设置响应校验与主题卡片布局等打包环境问题。新增可独立测试的前端逻辑时，应优先增加相邻的 `*.test.ts`/`*.test.tsx`。

## 桌面端测试

```bash
cd desktop
pnpm type-check
pnpm lint
pnpm build
pnpm test:runtime-paths
```

桌面测试覆盖便携 Python 路径、内置 wheel 版本选择、`app://` 后端路径隔离、WebView preload URL 与 Windows 更新架构命名。正式候选包还需要通过 `Desktop Release Candidate` 工作流生成 Windows/macOS 四种架构产物，并完成真机启动验证。

### 手动测试清单

- `/` 命令菜单：输入 `/` 后弹出面板，Skill 选择后插入 Token
- 模型设置：添加/编辑中转站模型，标记推理能力
- TXT 导入：选择大文件，验证分卷识别
- 世界书导入：上传 PDF/Word，验证 AI 增强
- Agent 对话：发送消息，验证推理计时，检查 `/状态`
- 任务目标：设置、保存、清除、切换任务后验证持久化
- 桌面首次启动：检查本地运行环境安装进度、失败提示和诊断日志
- Windows 更新：检查 x86_64/ARM64 更新清单与下载、安装流程
- macOS 安装：检查 Intel/Apple Silicon DMG、首次手动放行和本地后端启动
