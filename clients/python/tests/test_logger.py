# SPDX-License-Identifier: AGPL-3.0-or-later
"""Tests for the Logger class"""

import asyncio
import sys
from io import StringIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from artissist_logger.logger import (
    Logger,
    LogLevel,
    LOG_LEVEL_ORDER,
    MAX_MESSAGE_LENGTH,
    _get_background_loop,
)
from artissist_logger.generated_types import LoggerConfig, LoggingContext


class TestLogLevelFiltering:
    """Tests for log level filtering"""

    def test_log_level_order_defined(self):
        """Verify all log levels have an order defined"""
        assert LogLevel.TRACE in LOG_LEVEL_ORDER
        assert LogLevel.DEBUG in LOG_LEVEL_ORDER
        assert LogLevel.INFO in LOG_LEVEL_ORDER
        assert LogLevel.WARN in LOG_LEVEL_ORDER
        assert LogLevel.ERROR in LOG_LEVEL_ORDER
        assert LogLevel.FATAL in LOG_LEVEL_ORDER

    def test_log_level_order_increasing(self):
        """Verify log levels are in increasing order of severity"""
        assert LOG_LEVEL_ORDER[LogLevel.TRACE] < LOG_LEVEL_ORDER[LogLevel.DEBUG]
        assert LOG_LEVEL_ORDER[LogLevel.DEBUG] < LOG_LEVEL_ORDER[LogLevel.INFO]
        assert LOG_LEVEL_ORDER[LogLevel.INFO] < LOG_LEVEL_ORDER[LogLevel.WARN]
        assert LOG_LEVEL_ORDER[LogLevel.WARN] < LOG_LEVEL_ORDER[LogLevel.ERROR]
        assert LOG_LEVEL_ORDER[LogLevel.ERROR] < LOG_LEVEL_ORDER[LogLevel.FATAL]

    def test_should_log_at_same_level(self):
        """Logger should log at the configured level"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[], min_level=LogLevel.INFO)
        assert logger._should_log(LogLevel.INFO) is True

    def test_should_log_above_level(self):
        """Logger should log above the configured level"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[], min_level=LogLevel.INFO)
        assert logger._should_log(LogLevel.WARN) is True
        assert logger._should_log(LogLevel.ERROR) is True
        assert logger._should_log(LogLevel.FATAL) is True

    def test_should_not_log_below_level(self):
        """Logger should not log below the configured level"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[], min_level=LogLevel.WARN)
        assert logger._should_log(LogLevel.DEBUG) is False
        assert logger._should_log(LogLevel.INFO) is False

    def test_set_level(self):
        """Logger level can be changed at runtime"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[], min_level=LogLevel.DEBUG)
        assert logger._should_log(LogLevel.DEBUG) is True

        logger.set_level(LogLevel.ERROR)
        assert logger._should_log(LogLevel.DEBUG) is False
        assert logger._should_log(LogLevel.ERROR) is True


class TestMessageValidation:
    """Tests for message validation"""

    def test_validate_empty_message(self):
        """Empty messages should return empty string"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[])
        assert logger._validate_message("") == ""
        assert logger._validate_message(None) == ""

    def test_validate_normal_message(self):
        """Normal messages should pass through unchanged"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[])
        msg = "This is a test message"
        assert logger._validate_message(msg) == msg

    def test_validate_long_message_truncated(self):
        """Messages exceeding max length should be truncated"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[])
        long_msg = "x" * (MAX_MESSAGE_LENGTH + 100)
        result = logger._validate_message(long_msg)

        assert len(result) == MAX_MESSAGE_LENGTH
        assert result.endswith("...")

    def test_validate_message_at_boundary(self):
        """Messages at exactly max length should not be truncated"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[])
        msg = "x" * MAX_MESSAGE_LENGTH
        assert logger._validate_message(msg) == msg


class TestLogMethods:
    """Tests for log methods"""

    @pytest.mark.asyncio
    async def test_trace_method(self):
        """trace() should log at TRACE level"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(
            config, adapter_instances=[mock_adapter], min_level=LogLevel.TRACE
        )

        await logger.trace("test message")
        mock_adapter.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_debug_method(self):
        """debug() should log at DEBUG level"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        await logger.debug("test message")
        mock_adapter.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_info_method(self):
        """info() should log at INFO level"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        await logger.info("test message")
        mock_adapter.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_warn_method(self):
        """warn() should log at WARN level"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        await logger.warn("test message")
        mock_adapter.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_error_method(self):
        """error() should log at ERROR level"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        await logger.error("test message")
        mock_adapter.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_fatal_method(self):
        """fatal() should log at FATAL level"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        await logger.fatal("test message")
        mock_adapter.write.assert_called_once()

    @pytest.mark.asyncio
    async def test_log_filtered_by_level(self):
        """Logs below min_level should not call adapters"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(
            config, adapter_instances=[mock_adapter], min_level=LogLevel.ERROR
        )

        await logger.debug("should not log")
        await logger.info("should not log")
        await logger.warn("should not log")

        mock_adapter.write.assert_not_called()


class TestSyncMethods:
    """Tests for synchronous logging methods"""

    def test_sync_methods_use_background_loop(self):
        """Sync methods should use the background event loop"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[])

        # Should not raise RuntimeError
        logger.debug_sync("test")
        logger.info_sync("test")
        logger.warn_sync("test")
        logger.error_sync("test")
        logger.trace_sync("test")
        logger.fatal_sync("test")

    def test_background_loop_created(self):
        """Background loop should be created and running"""
        loop = _get_background_loop()
        assert loop is not None
        assert loop.is_running()


class TestErrorHandling:
    """Tests for error handling in logging"""

    @pytest.mark.asyncio
    async def test_adapter_error_logged_to_stderr(self):
        """Adapter errors should be logged to stderr, not swallowed"""
        mock_adapter = AsyncMock()
        mock_adapter.write.side_effect = Exception("Adapter failed")
        mock_adapter.__class__.__name__ = "TestAdapter"

        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        # Capture stderr
        captured = StringIO()
        with patch.object(sys, "stderr", captured):
            await logger.info("test message")

        assert "Adapter error" in captured.getvalue()
        assert "TestAdapter" in captured.getvalue()

    @pytest.mark.asyncio
    async def test_multiple_adapters_continue_on_error(self):
        """If one adapter fails, others should still be called"""
        failing_adapter = AsyncMock()
        failing_adapter.write.side_effect = Exception("Failed")
        failing_adapter.__class__.__name__ = "FailingAdapter"

        working_adapter = AsyncMock()
        working_adapter.__class__.__name__ = "WorkingAdapter"

        config = LoggerConfig(service="test", environment="test")
        logger = Logger(
            config, adapter_instances=[failing_adapter, working_adapter]
        )

        with patch.object(sys, "stderr", StringIO()):
            await logger.info("test message")

        # Both adapters should be called
        failing_adapter.write.assert_called_once()
        working_adapter.write.assert_called_once()


class TestWithContext:
    """Tests for logger context management"""

    def test_with_context_creates_new_logger(self):
        """with_context should return a new logger instance"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[])

        child = logger.with_context(user_id="user123")
        assert child is not logger

    def test_with_context_preserves_settings(self):
        """with_context should preserve service and environment"""
        config = LoggerConfig(service="myservice", environment="prod")
        logger = Logger(config, adapter_instances=[], min_level=LogLevel.WARN)

        child = logger.with_context(user_id="user123")
        assert child.service == "myservice"
        assert child.environment == "prod"
        assert child.min_level == LogLevel.WARN

    def test_with_context_adds_context(self):
        """with_context should add context values"""
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[])

        child = logger.with_context(
            user_id="user123", correlation_id="corr-456"
        )
        assert child.base_context.user_id == "user123"
        assert child.base_context.correlation_id == "corr-456"


class TestClose:
    """Tests for logger cleanup"""

    @pytest.mark.asyncio
    async def test_close_calls_adapter_close(self):
        """close() should close all adapters"""
        mock_adapter = AsyncMock()
        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        await logger.close()
        mock_adapter.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_close_handles_adapter_errors(self):
        """close() should handle adapter errors gracefully"""
        mock_adapter = AsyncMock()
        mock_adapter.close.side_effect = Exception("Close failed")

        config = LoggerConfig(service="test", environment="test")
        logger = Logger(config, adapter_instances=[mock_adapter])

        # Should not raise
        await logger.close()
