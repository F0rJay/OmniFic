"""
Domain-specific errors.
"""


class OmniFicError(Exception):
    """Base exception for OmniFic."""

    pass


class ProviderError(OmniFicError):
    """Error from model provider."""

    error_type: str = "provider_error"
    status_code: int = 500


class RateLimitError(ProviderError):
    """Provider rate limit exceeded."""

    error_type = "provider_rate_limit"
    status_code = 429


class ProviderAuthError(ProviderError):
    """Provider authentication error."""

    error_type = "provider_auth"
    status_code = 401


class ProviderTimeoutError(ProviderError):
    """Provider request timed out."""

    error_type = "provider_timeout"
    status_code = 504


class LLMTimeoutError(ProviderTimeoutError):
    """LLM调用超时。"""

    pass


class AgentTimeoutError(OmniFicError):
    """Agent execution timed out."""

    pass


class StorageError(OmniFicError):
    """Storage/persistence error."""

    pass


class NotFoundError(OmniFicError):
    """资源不存在错误。"""

    pass


class ValidationError(OmniFicError):
    """验证错误。"""

    pass


class ConflictError(OmniFicError):
    """资源冲突错误。"""

    pass


class ProjectAlreadyBoundError(OmniFicError):
    """项目已绑定世界书错误。"""

    pass


class WorldInfoExistsError(OmniFicError):
    """世界书已存在错误。"""

    pass
