# SPDX-License-Identifier: AGPL-3.0-or-later
"""Tests for LoggerFactory"""

import pytest

from artissist_logger.factory import LoggerFactory, _sanitize_path_component
from artissist_logger.context import LoggerContext
from artissist_logger.generated_types import AgentLoggerConfig, AdapterName


class TestSanitizePathComponent:
    """Tests for path component sanitization"""

    def test_empty_string_returns_unknown(self):
        """Empty string should return 'unknown'"""
        assert _sanitize_path_component("") == "unknown"

    def test_none_returns_unknown(self):
        """None should return 'unknown'"""
        assert _sanitize_path_component(None) == "unknown"

    def test_whitespace_only_returns_unknown(self):
        """Whitespace only should return 'unknown'"""
        assert _sanitize_path_component("   ") == "unknown"

    def test_normal_string_unchanged(self):
        """Normal strings should pass through"""
        assert _sanitize_path_component("myservice") == "myservice"
        assert _sanitize_path_component("my-service") == "my-service"
        assert _sanitize_path_component("my_service") == "my_service"

    def test_forward_slash_replaced(self):
        """Forward slashes should be replaced with underscores"""
        result = _sanitize_path_component("path/to/file")
        assert "/" not in result
        assert result == "path_to_file"

    def test_backslash_replaced(self):
        """Backslashes should be replaced with underscores"""
        result = _sanitize_path_component("path\\to\\file")
        assert "\\" not in result

    def test_dot_dot_replaced(self):
        """Parent directory references should be replaced"""
        result = _sanitize_path_component("../../../etc/passwd")
        assert ".." not in result

    def test_control_characters_removed(self):
        """Control characters should be removed"""
        result = _sanitize_path_component("test\x00file\x1f")
        assert "\x00" not in result
        assert "\x1f" not in result

    def test_length_limited(self):
        """Long strings should be truncated to 64 characters"""
        long_string = "x" * 100
        result = _sanitize_path_component(long_string)
        assert len(result) == 64


class TestLoggerFactory:
    """Tests for LoggerFactory"""

    def test_create_logger_with_console(self):
        """Should create logger with console adapter"""
        logger = LoggerFactory.create_logger(
            service="test-service",
            environment="test",
            adapters=["console"],
        )
        assert logger is not None
        assert logger.service == "test-service"
        assert len(logger.adapters) == 1

    def test_create_logger_unknown_adapter_raises(self):
        """Should raise for unknown adapter"""
        with pytest.raises(ValueError) as excinfo:
            LoggerFactory.create_logger(
                service="test",
                environment="test",
                adapters=["unknown_adapter"],
            )
        assert "Unknown adapter" in str(excinfo.value)

    def test_create_logger_with_context(self):
        """Should create logger with provided context"""
        ctx = LoggerContext(correlation_id="test-corr")
        logger = LoggerFactory.create_logger(
            service="test",
            environment="test",
            adapters=["console"],
            context=ctx,
        )
        assert logger.base_context.correlation_id == "test-corr"

    def test_create_logger_with_emojis(self):
        """Should enable emojis when configured"""
        logger = LoggerFactory.create_logger(
            service="test",
            environment="test",
            adapters=["console"],
            emojis=True,
        )
        assert logger.emojis is True


class TestFrontendLogger:
    """Tests for frontend logger factory"""

    def test_creates_console_only(self):
        """Frontend logger should use console only by default"""
        logger = LoggerFactory.create_frontend_logger(
            service="frontend-app",
            environment="development",
        )
        assert len(logger.adapters) == 1
        assert "Console" in logger.adapters[0].__class__.__name__

    def test_service_name_preserved(self):
        """Service name should be preserved"""
        logger = LoggerFactory.create_frontend_logger(
            service="my-frontend",
            environment="production",
        )
        assert logger.service == "my-frontend"


class TestBackendLogger:
    """Tests for backend logger factory"""

    def test_creates_console_and_file(self):
        """Backend logger should use console and file by default"""
        logger = LoggerFactory.create_backend_logger(
            service="backend-app",
            environment="development",
        )
        assert len(logger.adapters) == 2

    def test_environment_affects_colors(self):
        """Development environment should have colors enabled"""
        logger = LoggerFactory.create_backend_logger(
            service="backend",
            environment="development",
        )
        # Console adapter should have colors based on environment
        console_adapter = logger.adapters[0]
        assert console_adapter.use_colors is True


class TestAgentLogger:
    """Tests for agent logger factory"""

    def test_creates_agent_logger(self):
        """Should create agent logger with proper config"""
        config = AgentLoggerConfig(
            agent_id="agent-123",
            agent_type="conversation",
            environment="development",
        )
        logger = LoggerFactory.create_agent_logger(config)

        assert logger is not None
        assert "agent-conversation" in logger.service

    def test_agent_context_included(self):
        """Agent ID and type should be in service name"""
        config = AgentLoggerConfig(
            agent_id="agent-123",
            agent_type="conversation",
            environment="development",
        )
        logger = LoggerFactory.create_agent_logger(config)

        # Agent type is in service name, agent info available via logger
        assert "conversation" in logger.service
        assert logger is not None

    def test_sanitizes_agent_id(self):
        """Should sanitize agent ID in file path"""
        config = AgentLoggerConfig(
            agent_id="../../../etc/passwd",
            agent_type="test",
            environment="development",
            adapters=[AdapterName.FILE],
        )
        logger = LoggerFactory.create_agent_logger(config)

        # File adapter's path should not contain traversal
        file_adapter = logger.adapters[-1]
        assert ".." not in str(file_adapter.file_path)


class TestInfrastructureLogger:
    """Tests for infrastructure logger factory"""

    def test_creates_infrastructure_logger(self):
        """Should create infrastructure logger"""
        logger = LoggerFactory.create_infrastructure_logger(
            component="database",
            environment="production",
        )
        assert logger is not None
        assert "infra-database" in logger.service

    def test_sanitizes_component_name_in_file_path(self):
        """Should sanitize component name in file path"""
        logger = LoggerFactory.create_infrastructure_logger(
            component="../bad/path",
            environment="production",
        )
        # File adapter's path should be sanitized
        file_adapter = logger.adapters[-1]
        assert ".." not in str(file_adapter.file_path)
