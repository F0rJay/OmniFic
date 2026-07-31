import json
from typing import Any

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)

from app.agent_runtime.context.errors import ContextBuildError
from app.agent_runtime.context.types import ContextMessage


def _tool_call_name(raw: dict[str, Any]) -> str | None:
    name = raw.get("name")
    if isinstance(name, str) and name:
        return name

    function = raw.get("function")
    if isinstance(function, dict):
        function_name = function.get("name")
        if isinstance(function_name, str) and function_name:
            return function_name
    return None


def _tool_call_args(raw: dict[str, Any]) -> dict[str, Any] | None:
    value: Any = raw.get("args")
    if value is None:
        value = raw.get("arguments")
    function = raw.get("function")
    if value is None and isinstance(function, dict):
        value = function.get("args", function.get("arguments"))
    if value is None:
        return {}
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return None
    return value if isinstance(value, dict) else None


def _normalize_tool_calls(tool_calls: list[dict]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for raw in tool_calls:
        name = _tool_call_name(raw)
        args = _tool_call_args(raw)
        if name is None or args is None:
            raise ContextBuildError("to_langchain", "invalid assistant tool call")

        tool_call_id = raw.get("id")
        if tool_call_id is not None and not isinstance(tool_call_id, str):
            raise ContextBuildError("to_langchain", "invalid assistant tool call id")
        normalized.append(
            {
                "id": tool_call_id,
                "name": name,
                "args": args,
            }
        )
    return normalized


def to_langchain_messages(parts: list[ContextMessage]) -> list[BaseMessage]:
    """将 ContextMessage 列表按 role 映射为 LangChain BaseMessage 列表。"""
    out: list[BaseMessage] = []
    for p in parts:
        if p.role == "system":
            out.append(SystemMessage(content=p.content))
        elif p.role == "user":
            out.append(HumanMessage(content=p.content))
        elif p.role == "assistant":
            out.append(
                AIMessage(
                    content=p.content,
                    tool_calls=_normalize_tool_calls(p.tool_calls or []),
                    additional_kwargs=p.additional_kwargs or {},
                )
            )
        elif p.role == "tool":
            if not p.tool_call_id:
                raise ContextBuildError(
                    "to_langchain", "tool message missing tool_call_id"
                )
            out.append(
                ToolMessage(
                    content=p.content,
                    tool_call_id=p.tool_call_id,
                    name=p.name,
                )
            )
        else:
            raise ContextBuildError(
                "to_langchain", f"unknown role: {p.role}"
            )
    return out
