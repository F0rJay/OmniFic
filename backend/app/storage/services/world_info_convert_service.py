# -*- coding: utf-8 -*-
"""
World Info Convert Service - 将文档章节转换为世界书条目，支持 AI 智能优化。
"""

from loguru import logger

from app.core.document_parser import DocumentSection
from app.storage.services.world_info_entry_service import WorldInfoImportEntry


def convert_sections_to_entries(
    sections: list[DocumentSection],
) -> list[WorldInfoImportEntry]:
    """将文档章节转换为世界书条目（规则切分）。"""
    entries: list[WorldInfoImportEntry] = []
    for index, section in enumerate(sections):
        name = section.title.strip()[:200] if section.title.strip() else f"条目 {index + 1}"
        entries.append(WorldInfoImportEntry(
            uid=index,
            name=name,
            content=section.content.strip(),
            is_enabled=True,
            order=index + 1,
        ))
    return entries


_AI_SYSTEM_PROMPT = """你是小说世界观设定整理专家。
下面是从设定文档中自动切分的世界书条目（JSON 数组），可能存在以下问题：
- 内容重叠或重复的条目
- 单个条目过长，涵盖多个不相关主题
- 条目命名不清晰或过于笼统
- 缺少结构化组织

请重新整理这些条目：
1. 合并内容重叠或高度相关的条目
2. 拆分涵盖多个独立主题的过长条目
3. 优化每个条目的名称，使其简洁（不超过20个字）且语义自足
4. 整理内容格式，使用清晰的段落结构

严格要求：
- 不要删除任何有效的设定信息
- 不要编造原文中不存在的内容
- 保留原文的具体细节（名称、数字、关系等）

输出格式：JSON 数组，每个元素包含 "name" 和 "content" 两个字段。不要输出任何其他内容。"""


def _build_ai_user_prompt(entries: list[WorldInfoImportEntry]) -> str:
    """构建 AI 增强的用户消息。"""
    import json
    raw = [{"name": e.name, "content": e.content} for e in entries]
    return f"以下是待整理的条目（共 {len(entries)} 条）：\n\n{json.dumps(raw, ensure_ascii=False, indent=2)}"


def _parse_ai_response(content: str) -> list[WorldInfoImportEntry]:
    """解析 AI 返回的 JSON 数组为条目列表。"""
    from json_repair import repair_json

    try:
        repaired = repair_json(content, return_objects=True)
    except Exception:
        repaired = []

    if not isinstance(repaired, list):
        return []

    entries: list[WorldInfoImportEntry] = []
    for index, item in enumerate(repaired):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()[:200]
        entry_content = str(item.get("content", "")).strip()
        if not name:
            name = f"条目 {index + 1}"
        if not entry_content:
            continue
        entries.append(WorldInfoImportEntry(
            uid=index,
            name=name,
            content=entry_content,
            is_enabled=True,
            order=index + 1,
        ))

    return entries


async def enhance_entries_with_ai(
    entries: list[WorldInfoImportEntry],
    model_config: dict,
) -> list[WorldInfoImportEntry]:
    """使用 LLM 对条目进行全局审查和优化。

    Args:
        entries: 规则切分产生的粗条目。
        model_config: 运行时模型配置（provider_type, base_url, api_key, model_id 等）。

    Returns:
        优化后的条目列表。如果 AI 处理失败，回退到原始条目。
    """
    if not entries:
        return entries

    from langchain_core.messages import HumanMessage, SystemMessage

    from app.agent_runtime.model_config import to_client_model_config
    from app.models.clients.model_factory import ModelConfig, create_chat_model

    runtime_config = to_client_model_config(model_config)
    config = ModelConfig(**runtime_config)
    model = create_chat_model(config)

    try:
        response = await model.ainvoke([
            SystemMessage(content=_AI_SYSTEM_PROMPT),
            HumanMessage(content=_build_ai_user_prompt(entries)),
        ])

        raw_output = response.content if isinstance(response.content, str) else str(response.content)
        enhanced = _parse_ai_response(raw_output)

        if enhanced:
            logger.info(f"AI 增强完成：{len(entries)} 条 → {len(enhanced)} 条")
            return enhanced

        logger.warning("AI 增强返回空结果，回退到原始条目")
        return entries
    except Exception as e:
        logger.error(f"AI 增强失败，回退到原始条目: {e}")
        return entries
