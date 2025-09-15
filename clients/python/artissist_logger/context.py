# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Context management for distributed tracing in Artissist Logger Python client
"""

import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


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

    def merge(self, other: "LoggerContext") -> "LoggerContext":
        """Merge with another context, with other taking precedence"""
        return LoggerContext(
            correlation_id=other.correlation_id or self.correlation_id,
            user_id=other.user_id or self.user_id,
            session_id=other.session_id or self.session_id,
            request_id=other.request_id or self.request_id,
            trace_id=other.trace_id or self.trace_id,
            span_id=other.span_id or self.span_id,
            custom_context={**self.custom_context, **other.custom_context},
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

        # Update fields
        for key, value in kwargs.items():
            if hasattr(current, key):
                setattr(current, key, value)
            else:
                current.custom_context[key] = value

        _current_context.set(current)

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
