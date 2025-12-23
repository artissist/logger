# SPDX-License-Identifier: AGPL-3.0-or-later
"""Tests for log adapters"""

import asyncio
import os
import sys
import tempfile
from io import StringIO
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from artissist_logger.adapters.console import ConsoleAdapter
from artissist_logger.adapters.file import FileAdapter, _validate_file_path
from artissist_logger.types import LogLevel, LogEntry
from artissist_logger.generated_types import LoggingContext


def create_log_entry(
    message: str = "test message",
    level: LogLevel = LogLevel.INFO,
    service: str = "test-service",
) -> LogEntry:
    """Helper to create a LogEntry for testing"""
    return LogEntry(
        timestamp="2024-01-01T00:00:00+00:00",
        level=level,
        message=message,
        service=service,
        event=None,
        context=LoggingContext(),
        metadata=None,
        metrics=None,
        error=None,
    )


class TestConsoleAdapter:
    """Tests for ConsoleAdapter"""

    def test_init_defaults(self):
        """Should initialize with default settings"""
        adapter = ConsoleAdapter({})
        assert adapter.use_colors is True
        assert adapter.output_stream is sys.stdout

    def test_init_with_stderr(self):
        """Should use stderr when configured"""
        adapter = ConsoleAdapter({"use_stderr": True})
        assert adapter.output_stream is sys.stderr

    def test_init_colors_disabled(self):
        """Should disable colors when configured"""
        adapter = ConsoleAdapter({"colors": False})
        assert adapter.use_colors is False

    def test_is_tty_checks_output_stream(self):
        """_is_tty should check the output stream, not sys.stdout"""
        # Create mock stream with isatty
        mock_stream = MagicMock()
        mock_stream.isatty.return_value = True

        adapter = ConsoleAdapter({"use_stderr": True})
        adapter.output_stream = mock_stream

        assert adapter._is_tty() is True
        mock_stream.isatty.assert_called_once()

    def test_is_tty_handles_missing_isatty(self):
        """_is_tty should handle streams without isatty"""
        # Create stream without isatty
        adapter = ConsoleAdapter({})
        adapter.output_stream = object()  # No isatty method

        assert adapter._is_tty() is False

    @pytest.mark.asyncio
    async def test_write_basic(self):
        """Should write formatted message to output"""
        output = StringIO()
        adapter = ConsoleAdapter({"colors": False})
        adapter.output_stream = output

        entry = create_log_entry("Hello World")
        await adapter.write(entry, "formatted: Hello World")

        result = output.getvalue()
        assert "Hello World" in result

    @pytest.mark.asyncio
    async def test_write_flushes(self):
        """Should flush output after writing"""
        mock_stream = MagicMock()
        mock_stream.isatty.return_value = False

        adapter = ConsoleAdapter({"colors": False})
        adapter.output_stream = mock_stream

        entry = create_log_entry()
        await adapter.write(entry, "test message")

        mock_stream.flush.assert_called()

    def test_colors_for_all_levels(self):
        """Should have colors defined for all log levels"""
        assert LogLevel.TRACE in ConsoleAdapter.COLORS
        assert LogLevel.DEBUG in ConsoleAdapter.COLORS
        assert LogLevel.INFO in ConsoleAdapter.COLORS
        assert LogLevel.WARN in ConsoleAdapter.COLORS
        assert LogLevel.ERROR in ConsoleAdapter.COLORS
        assert LogLevel.FATAL in ConsoleAdapter.COLORS


class TestFilePathValidation:
    """Tests for file path validation"""

    def test_empty_path_raises(self):
        """Empty path should raise ValueError"""
        with pytest.raises(ValueError) as excinfo:
            _validate_file_path("")
        assert "cannot be empty" in str(excinfo.value)

    def test_null_byte_raises(self):
        """Path with null bytes should raise ValueError"""
        with pytest.raises(ValueError) as excinfo:
            _validate_file_path("test\x00file.log")
        # Python raises 'embedded null byte' error
        assert "null" in str(excinfo.value).lower()

    def test_system_directory_raises(self):
        """Paths to system directories should raise ValueError"""
        # Only test paths that actually exist on this system
        sensitive_paths = [
            path for path in [
                "/etc/passwd",
                "/usr/bin/test.log",
            ] if os.path.exists(os.path.dirname(path))
        ]
        for path in sensitive_paths:
            with pytest.raises(ValueError) as excinfo:
                _validate_file_path(path)
            assert "system directory" in str(excinfo.value)

    def test_valid_path_returns_path(self):
        """Valid path should return Path object"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            result = _validate_file_path(path)
            assert isinstance(result, Path)


class TestFileAdapter:
    """Tests for FileAdapter"""

    def test_init_creates_directory(self):
        """Should create parent directory if it doesn't exist"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "subdir", "test.log")
            adapter = FileAdapter({"file_path": path})

            assert Path(path).parent.exists()

    def test_init_validates_path(self):
        """Should validate path on initialization"""
        with pytest.raises(ValueError):
            FileAdapter({"file_path": ""})

    def test_buffer_size_configurable(self):
        """Buffer size should be configurable"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            adapter = FileAdapter({"file_path": path, "buffer_size": 20})
            assert adapter.buffer_size == 20

    @pytest.mark.asyncio
    async def test_write_buffers_messages(self):
        """Should buffer messages before writing"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            adapter = FileAdapter({"file_path": path, "buffer_size": 5})

            entry = create_log_entry("test")
            await adapter.write(entry, "formatted message")

            # Should be in buffer, not yet written
            assert len(adapter._buffer) == 1
            assert not Path(path).exists() or Path(path).stat().st_size == 0

    @pytest.mark.asyncio
    async def test_write_flushes_when_buffer_full(self):
        """Should flush when buffer reaches size"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            adapter = FileAdapter(
                {"file_path": path, "buffer_size": 2, "async": False}
            )

            entry = create_log_entry("test")

            # Write enough to trigger flush
            await adapter.write(entry, "message 1")
            await adapter.write(entry, "message 2")

            # File should exist and have content
            assert Path(path).exists()
            content = Path(path).read_text()
            assert "message" in content

    @pytest.mark.asyncio
    async def test_flush_writes_buffer(self):
        """flush() should write buffered content"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            adapter = FileAdapter(
                {"file_path": path, "buffer_size": 100, "async": False}
            )

            entry = create_log_entry("test")
            await adapter.write(entry, "buffered message")

            # Manually flush
            await adapter.flush()

            content = Path(path).read_text()
            assert "buffered message" in content

    @pytest.mark.asyncio
    async def test_close_flushes_buffer(self):
        """close() should flush remaining buffer"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            adapter = FileAdapter(
                {"file_path": path, "buffer_size": 100, "async": False}
            )

            entry = create_log_entry("test")
            await adapter.write(entry, "final message")
            await adapter.close()

            content = Path(path).read_text()
            assert "final message" in content

    @pytest.mark.asyncio
    async def test_json_format(self):
        """Should write JSON when format is json"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            adapter = FileAdapter(
                {
                    "file_path": path,
                    "format": "json",
                    "buffer_size": 1,
                    "async": False,
                }
            )

            entry = create_log_entry("test message")
            await adapter.write(entry, "ignored for json")

            content = Path(path).read_text()
            assert '"message":' in content or '"level":' in content

    @pytest.mark.asyncio
    async def test_write_after_close_ignored(self):
        """Writes after close should be ignored"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.log")
            adapter = FileAdapter({"file_path": path, "async": False})

            await adapter.close()

            entry = create_log_entry("should not appear")
            await adapter.write(entry, "should not appear")

            # File may not exist or be empty
            if Path(path).exists():
                content = Path(path).read_text()
                assert "should not appear" not in content
