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
pytest tests/api/test_writing_readiness.py -v
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

当前回归测试包含设置响应、主题卡片布局、澄清流程、模型切换消息、工具消息注册和内容导出格式。新增可独立测试的前端逻辑时，应优先增加相邻的 `*.test.ts`/`*.test.tsx`。

## 桌面端测试

```bash
cd desktop
pnpm type-check
pnpm lint
pnpm build
pnpm test:runtime-paths
```

桌面测试覆盖便携 Python 路径、内置 wheel 版本选择、`app://` 后端路径隔离、WebView preload URL、Windows 更新架构命名，以及 Release 正文清理和 Changelog 版本段落提取。正式候选包还需要通过 `Desktop Release Candidate` 工作流生成 Windows/macOS 四种架构产物，并完成真机启动验证。

## 文档检查

```bash
python3 scripts/check_docs.py
python3 scripts/extract_release_notes.py CHANGELOG.md 0.8.2
git diff --check
```

第二条命令中的版本应替换为待发布版本，用于确认正式 Release 可以提取非空的用户可读说明。

### 手动测试清单

- `/` 命令菜单：输入 `/` 后弹出面板，Skill 选择后插入 Token
- 模型设置：添加/编辑中转站模型，标记推理能力
- TXT 导入：选择大文件，验证分卷识别
- 世界书导入：上传 PDF/Word，验证 AI 增强
- 内容导出：分别导出章节、笔记、世界书条目和角色卡，检查实时草稿、文件名与 Markdown/JSON 结构
- 三栏布局：在项目、世界书和角色工作区分别收起与恢复左栏、编辑区和 Agent 栏，检查高度、按钮和窄轨道一致性
- Agent 对话：发送消息，验证推理计时，检查 `/状态`
- 模型切换：运行中切换模型，检查会话记录中的独立状态提示及重进任务后的可追溯性
- 澄清问题：覆盖单选自动推进、多选确认、自定义回答、返回修改、长题目滚动和窄栏布局
- 子智能体列表：创建超过可视高度的子任务，确认列表内部滚动且底部条目可达
- 首次正文准入：覆盖资料缺失、审查失败/通过、资料变更后过期、当前回合授权和必须由 Writer 首次写入
- 任务目标：设置、保存、清除、切换任务后验证持久化
- 桌面首次启动：检查本地运行环境安装进度、失败提示和诊断日志
- Windows 更新：检查 x86_64/ARM64 更新清单、用户可读更新列表、GitHub 完整说明入口、下载和重启安装流程
- 更新日志兜底：检查 link-only `Full Changelog` 被过滤，并验证 Release 正文缺失时可以读取 tag 内 `CHANGELOG.md`
- macOS 安装：检查 Intel/Apple Silicon DMG、首次手动放行和本地后端启动
