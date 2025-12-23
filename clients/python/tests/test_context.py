# SPDX-License-Identifier: AGPL-3.0-or-later
"""Tests for context management"""

import pytest

from artissist_logger.context import (
    LoggerContext,
    ContextManager,
    MAX_CUSTOM_CONTEXT_KEYS,
)


class TestLoggerContext:
    """Tests for LoggerContext dataclass"""

    def test_default_values(self):
        """Context should have None defaults for all fields"""
        ctx = LoggerContext()
        assert ctx.correlation_id is None
        assert ctx.user_id is None
        assert ctx.session_id is None
        assert ctx.request_id is None
        assert ctx.trace_id is None
        assert ctx.span_id is None
        assert ctx.custom_context == {}

    def test_to_dict_empty(self):
        """Empty context should return empty dict"""
        ctx = LoggerContext()
        assert ctx.to_dict() == {}

    def test_to_dict_with_values(self):
        """to_dict should include non-None values"""
        ctx = LoggerContext(
            correlation_id="corr-123",
            user_id="user-456",
        )
        result = ctx.to_dict()
        assert result == {
            "correlation_id": "corr-123",
            "user_id": "user-456",
        }

    def test_to_dict_includes_custom_context(self):
        """to_dict should include custom context values"""
        ctx = LoggerContext(
            correlation_id="corr-123",
            custom_context={"key1": "value1", "key2": 42},
        )
        result = ctx.to_dict()
        assert result["correlation_id"] == "corr-123"
        assert result["key1"] == "value1"
        assert result["key2"] == 42

    def test_merge_contexts(self):
        """Merging should prefer other context values"""
        ctx1 = LoggerContext(
            correlation_id="old-corr",
            user_id="user-123",
        )
        ctx2 = LoggerContext(
            correlation_id="new-corr",
            session_id="sess-456",
        )
        merged = ctx1.merge(ctx2)

        assert merged.correlation_id == "new-corr"
        assert merged.user_id == "user-123"
        assert merged.session_id == "sess-456"

    def test_merge_custom_context(self):
        """Merging should combine custom context"""
        ctx1 = LoggerContext(custom_context={"a": 1, "b": 2})
        ctx2 = LoggerContext(custom_context={"b": 3, "c": 4})
        merged = ctx1.merge(ctx2)

        assert merged.custom_context["a"] == 1
        assert merged.custom_context["b"] == 3  # Overwritten
        assert merged.custom_context["c"] == 4

    def test_create_with_correlation_id(self):
        """Should create context with correlation ID"""
        ctx = LoggerContext.create_with_correlation_id("my-corr-id")
        assert ctx.correlation_id == "my-corr-id"

    def test_create_with_generated_correlation_id(self):
        """Should generate correlation ID if not provided"""
        ctx = LoggerContext.create_with_correlation_id()
        assert ctx.correlation_id is not None
        assert ctx.correlation_id.startswith("corr_")

    def test_from_headers(self):
        """Should create context from HTTP headers"""
        headers = {
            "x-correlation-id": "corr-123",
            "x-user-id": "user-456",
            "x-session-id": "sess-789",
            "x-request-id": "req-abc",
            "x-trace-id": "trace-def",
            "x-span-id": "span-ghi",
        }
        ctx = LoggerContext.from_headers(headers)

        assert ctx.correlation_id == "corr-123"
        assert ctx.user_id == "user-456"
        assert ctx.session_id == "sess-789"
        assert ctx.request_id == "req-abc"
        assert ctx.trace_id == "trace-def"
        assert ctx.span_id == "span-ghi"


class TestContextCleanup:
    """Tests for context cleanup methods"""

    def test_clear_custom_context(self):
        """Should clear all custom context entries"""
        ctx = LoggerContext(
            correlation_id="corr-123",
            custom_context={"a": 1, "b": 2, "c": 3},
        )
        ctx.clear_custom_context()

        assert ctx.custom_context == {}
        assert ctx.correlation_id == "corr-123"  # Not cleared

    def test_remove_custom_key(self):
        """Should remove specific custom context key"""
        ctx = LoggerContext(custom_context={"a": 1, "b": 2, "c": 3})
        ctx.remove_custom_key("b")

        assert "b" not in ctx.custom_context
        assert ctx.custom_context["a"] == 1
        assert ctx.custom_context["c"] == 3

    def test_remove_nonexistent_key(self):
        """Removing nonexistent key should not raise"""
        ctx = LoggerContext(custom_context={"a": 1})
        ctx.remove_custom_key("nonexistent")  # Should not raise
        assert ctx.custom_context["a"] == 1

    def test_clear_all(self):
        """Should clear all context values"""
        ctx = LoggerContext(
            correlation_id="corr-123",
            user_id="user-456",
            custom_context={"a": 1},
        )
        ctx.clear_all()

        assert ctx.correlation_id is None
        assert ctx.user_id is None
        assert ctx.custom_context == {}

    def test_set_custom_enforces_limit(self):
        """set_custom should enforce the maximum keys limit"""
        ctx = LoggerContext()

        # Add maximum number of keys
        for i in range(MAX_CUSTOM_CONTEXT_KEYS):
            ctx.set_custom(f"key{i}", i)

        # Adding one more should raise
        with pytest.raises(ValueError) as excinfo:
            ctx.set_custom("one_too_many", "value")

        assert "maximum" in str(excinfo.value)
        assert str(MAX_CUSTOM_CONTEXT_KEYS) in str(excinfo.value)

    def test_set_custom_allows_update(self):
        """set_custom should allow updating existing keys"""
        ctx = LoggerContext()

        # Add maximum number of keys
        for i in range(MAX_CUSTOM_CONTEXT_KEYS):
            ctx.set_custom(f"key{i}", i)

        # Updating existing key should work
        ctx.set_custom("key0", "updated")
        assert ctx.custom_context["key0"] == "updated"


class TestContextManager:
    """Tests for ContextManager class"""

    def setup_method(self):
        """Clear context before each test"""
        ContextManager.clear_context()

    def test_set_and_get_context(self):
        """Should set and retrieve context"""
        ctx = LoggerContext(correlation_id="test-corr")
        ContextManager.set_context(ctx)

        retrieved = ContextManager.get_context()
        assert retrieved is not None
        assert retrieved.correlation_id == "test-corr"

    def test_clear_context(self):
        """Should clear the current context"""
        ctx = LoggerContext(correlation_id="test-corr")
        ContextManager.set_context(ctx)
        ContextManager.clear_context()

        assert ContextManager.get_context() is None

    def test_update_context(self):
        """Should update context fields"""
        ContextManager.update_context(
            correlation_id="corr-123",
            user_id="user-456",
        )
        ctx = ContextManager.get_context()

        assert ctx.correlation_id == "corr-123"
        assert ctx.user_id == "user-456"

    def test_update_context_custom_keys(self):
        """Should add unknown keys to custom context"""
        ContextManager.update_context(
            correlation_id="corr-123",
            my_custom_key="custom_value",
        )
        ctx = ContextManager.get_context()

        assert ctx.correlation_id == "corr-123"
        assert ctx.custom_context["my_custom_key"] == "custom_value"

    def test_remove_custom_key(self):
        """Should remove custom key from current context"""
        ContextManager.update_context(key1="value1", key2="value2")
        ContextManager.remove_custom_key("key1")

        ctx = ContextManager.get_context()
        assert "key1" not in ctx.custom_context
        assert ctx.custom_context["key2"] == "value2"

    def test_clear_custom_context(self):
        """Should clear custom context from current context"""
        ContextManager.update_context(
            correlation_id="corr-123", key1="value1", key2="value2"
        )
        ContextManager.clear_custom_context()

        ctx = ContextManager.get_context()
        assert ctx.correlation_id == "corr-123"
        assert ctx.custom_context == {}

    def test_reset_context(self):
        """Should reset to fresh empty context"""
        ContextManager.update_context(
            correlation_id="corr-123", key1="value1"
        )
        ContextManager.reset_context()

        ctx = ContextManager.get_context()
        assert ctx is not None
        assert ctx.correlation_id is None
        assert ctx.custom_context == {}


class TestContextScope:
    """Tests for scoped context changes"""

    def setup_method(self):
        """Clear context before each test"""
        ContextManager.clear_context()

    def test_context_manager_sets_values(self):
        """Context manager should set values within scope"""
        with ContextManager.context(correlation_id="scoped-corr"):
            ctx = ContextManager.get_context()
            assert ctx.correlation_id == "scoped-corr"

    def test_context_manager_restores_previous(self):
        """Context manager should restore previous context on exit"""
        ContextManager.set_context(
            LoggerContext(correlation_id="original")
        )

        with ContextManager.context(correlation_id="scoped"):
            ctx = ContextManager.get_context()
            assert ctx.correlation_id == "scoped"

        ctx = ContextManager.get_context()
        assert ctx.correlation_id == "original"

    def test_context_manager_merges_values(self):
        """Context manager should merge with existing context"""
        ContextManager.set_context(
            LoggerContext(correlation_id="original", user_id="user-123")
        )

        with ContextManager.context(session_id="sess-456"):
            ctx = ContextManager.get_context()
            assert ctx.correlation_id == "original"
            assert ctx.user_id == "user-123"
            assert ctx.session_id == "sess-456"

    def test_nested_context_managers(self):
        """Nested context managers should work correctly"""
        with ContextManager.context(correlation_id="outer"):
            with ContextManager.context(user_id="inner"):
                ctx = ContextManager.get_context()
                assert ctx.correlation_id == "outer"
                assert ctx.user_id == "inner"

            ctx = ContextManager.get_context()
            assert ctx.correlation_id == "outer"
            assert ctx.user_id is None
