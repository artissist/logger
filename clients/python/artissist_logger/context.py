# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Context management for distributed tracing in Artissist Logger Python client
"""

import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


# Maximum number of custom context keys to prevent memory growth
MAX_CUSTOM_CONTEXT_KEYS = 100


@dataclass
class LoggerContext:
    """Context information for distributed logging"""

    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    custom_context: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary"""
        result = {}
        if self.correlation_id:
            result["correlation_id"] = self.correlation_id
        if self.user_id:
            result["user_id"] = self.user_id
        if self.session_id:
            result["session_id"] = self.session_id
        if self.request_id:
            result["request_id"] = self.request_id
        if self.trace_id:
            result["trace_id"] = self.trace_id
        if self.span_id:
            result["span_id"] = self.span_id
        if self.custom_context:
            result.update(self.custom_context)
        return result

    def merge(self, other) -> "LoggerContext":
        """Merge with another context, with other taking precedence"""
        # Handle both LoggerContext and LoggingContext
        if hasattr(other, "custom_context"):
            # It's a LoggerContext
            return LoggerContext(
                correlation_id=other.correlation_id or self.correlation_id,
                user_id=other.user_id or self.user_id,
                session_id=other.session_id or self.session_id,
                request_id=other.request_id or self.request_id,
                trace_id=other.trace_id or self.trace_id,
                span_id=other.span_id or self.span_id,
                custom_context={**self.custom_context, **other.custom_context},
            )

        # It's a LoggingContext (from generated types)
        return LoggerContext(
            correlation_id=other.correlation_id or self.correlation_id,
            user_id=other.user_id or self.user_id,
            session_id=other.session_id or self.session_id,
            request_id=other.request_id or self.request_id,
            trace_id=other.trace_id or self.trace_id,
            span_id=other.span_id or self.span_id,
            custom_context=self.custom_context,
        )

    @classmethod
    def create_with_correlation_id(
        cls, correlation_id: Optional[str] = None
    ) -> "LoggerContext":
        """Create context with generated or provided correlation ID"""
        return cls(
            correlation_id=correlation_id or f"corr_{uuid.uuid4().hex[:16]}"
        )

    @classmethod
    def from_headers(cls, headers: Dict[str, str]) -> "LoggerContext":
        """Create context from HTTP headers"""
        return cls(
            correlation_id=headers.get("x-correlation-id"),
            user_id=headers.get("x-user-id"),
            session_id=headers.get("x-session-id"),
            request_id=headers.get("x-request-id"),
            trace_id=headers.get("x-trace-id"),
            span_id=headers.get("x-span-id"),
        )

    def clear_custom_context(self) -> None:
        """Clear all custom context entries."""
        self.custom_context.clear()

    def remove_custom_key(self, key: str) -> None:
        """Remove a specific key from custom context."""
        self.custom_context.pop(key, None)

    def clear_all(self) -> None:
        """Clear all context values, resetting to defaults."""
        self.correlation_id = None
        self.user_id = None
        self.session_id = None
        self.request_id = None
        self.trace_id = None
        self.span_id = None
        self.custom_context.clear()

    def set_custom(self, key: str, value: Any) -> None:
        """
        Set a custom context value with size limit enforcement.

        Args:
            key: The context key
            value: The context value

        Raises:
            ValueError: If adding this key would exceed the maximum limit
        """
        if key not in self.custom_context:
            if len(self.custom_context) >= MAX_CUSTOM_CONTEXT_KEYS:
                raise ValueError(
                    f"Cannot add custom context key '{key}': "
                    f"maximum of {MAX_CUSTOM_CONTEXT_KEYS} keys reached. "
                    "Use clear_custom_context() or remove_custom_key() first."
                )
        self.custom_context[key] = value


# Context variable for async context propagation
_current_context: ContextVar[Optional[LoggerContext]] = ContextVar(
    "artissist_logger_context", default=None
)


class ContextManager:
    """Manages logger context in async environments"""

    @staticmethod
    def set_context(context: LoggerContext):
        """Set current context"""
        _current_context.set(context)

    @staticmethod
    def get_context() -> Optional[LoggerContext]:
        """Get current context"""
        return _current_context.get()

    @staticmethod
    def clear_context():
        """Clear current context"""
        _current_context.set(None)

    @staticmethod
    def update_context(**kwargs):
        """Update current context with new values"""
        current = _current_context.get() or LoggerContext()

        # Define known fields
        known_fields = {
            "correlation_id",
            "user_id",
            "session_id",
            "request_id",
            "trace_id",
            "span_id",
        }

        # Update fields
        for key, value in kwargs.items():
            if key in known_fields:
                setattr(current, key, value)
            else:
                # Use set_custom for size limit enforcement
                current.set_custom(key, value)

        _current_context.set(current)

    @staticmethod
    def remove_custom_key(key: str):
        """Remove a custom context key from current context."""
        current = _current_context.get()
        if current:
            current.remove_custom_key(key)

    @staticmethod
    def clear_custom_context():
        """Clear all custom context from current context."""
        current = _current_context.get()
        if current:
            current.clear_custom_context()

    @staticmethod
    def reset_context():
        """Reset current context to a fresh empty state."""
        _current_context.set(LoggerContext())

    @classmethod
    def context(cls, **kwargs):
        """Context manager for scoped context changes"""
        return _ContextScope(**kwargs)


class _ContextScope:
    """Context manager for scoped context changes"""

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.previous_context = None

    def __enter__(self):
        self.previous_context = _current_context.get()
        current = self.previous_context or LoggerContext()

        # Create new context with updates
        new_context = LoggerContext(
            correlation_id=self.kwargs.get("correlation_id")
            or current.correlation_id,
            user_id=self.kwargs.get("user_id") or current.user_id,
            session_id=self.kwargs.get("session_id") or current.session_id,
            request_id=self.kwargs.get("request_id") or current.request_id,
            trace_id=self.kwargs.get("trace_id") or current.trace_id,
            span_id=self.kwargs.get("span_id") or current.span_id,
            custom_context={
                **current.custom_context,
                **{
                    k: v
                    for k, v in self.kwargs.items()
                    if k
                    not in [
                        "correlation_id",
                        "user_id",
                        "session_id",
                        "request_id",
                        "trace_id",
                        "span_id",
                    ]
                },
            },
        )

        _current_context.set(new_context)
        return new_context

    def __exit__(self, exc_type, exc_val, exc_tb):
        _current_context.set(self.previous_context)
