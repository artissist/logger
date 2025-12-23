# SPDX-License-Identifier: AGPL-3.0-or-later
"""
File output adapter for Artissist Logger Python client
"""

import asyncio
import json
import os
import threading
from collections import deque
from dataclasses import asdict
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, TextIO

from ..types import LogEntry
from .base import LogAdapter

try:
    import aiofiles

    HAS_AIOFILES = True
except ImportError:
    HAS_AIOFILES = False
    aiofiles = None  # type: ignore


def _validate_file_path(file_path: str) -> Path:
    """
    Validate file path to prevent directory traversal attacks.

    Args:
        file_path: The file path to validate

    Returns:
        Validated Path object

    Raises:
        ValueError: If the path is invalid or potentially unsafe
    """
    if not file_path:
        raise ValueError("File path cannot be empty")

    path = Path(file_path)

    # Resolve to absolute path to detect traversal
    try:
        resolved = path.resolve()
    except (OSError, RuntimeError) as e:
        raise ValueError(f"Invalid file path: {e}") from e

    # Check for null bytes (path injection)
    if "\x00" in str(path):
        raise ValueError("File path contains null bytes")

    # Prevent writing to sensitive system directories
    sensitive_prefixes = ["/etc", "/usr", "/bin", "/sbin", "/var/run"]
    for prefix in sensitive_prefixes:
        if str(resolved).startswith(prefix):
            raise ValueError(f"Cannot write to system directory: {prefix}")

    return path


class FileAdapter(LogAdapter):
    """Outputs log messages to files with rotation and buffering support"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)

        # Validate and set file path
        self.file_path = _validate_file_path(config["file_path"])
        self.format = config.get("format", "text")  # "text" or "json"
        self.rotate = config.get("rotate", False)
        self.max_size_mb = config.get("max_size_mb", 10)
        self.max_files = config.get("max_files", 5)
        self.use_async = config.get("async", True) and HAS_AIOFILES

        # Buffering configuration
        self.buffer_size = config.get("buffer_size", 10)
        self.flush_interval = config.get("flush_interval", 5.0)  # seconds

        # Ensure directory exists
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

        self._file_handle: Optional[TextIO] = None
        self._lock = asyncio.Lock()
        self._sync_lock = threading.Lock()

        # Buffering state
        self._buffer: Deque[str] = deque(maxlen=self.buffer_size * 2)
        self._flush_task: Optional[asyncio.Task] = None
        self._closed = False

    def _add_to_buffer(self, content: str) -> bool:
        """
        Add content to buffer.

        Returns:
            True if buffer should be flushed
        """
        self._buffer.append(content)
        return len(self._buffer) >= self.buffer_size

    def _get_buffered_content(self) -> str:
        """Get and clear buffered content."""
        content = "".join(self._buffer)
        self._buffer.clear()
        return content

    async def write(self, message: LogEntry, formatted_message: str):
        """Write message to file with buffering"""
        if self._closed:
            return

        # Format the content
        if self.format == "json":
            log_data = asdict(message)
            content = json.dumps(log_data, default=str) + "\n"
        else:
            lines = [formatted_message + "\n"]

            # Add structured data for errors and metrics
            if message.error:
                error_line = f"  ERROR: {json.dumps(asdict(message.error))}\n"
                lines.append(error_line)

            if message.metrics:
                metrics_line = (
                    f"  METRICS: {json.dumps(asdict(message.metrics))}\n"
                )
                lines.append(metrics_line)

            content = "".join(lines)

        # Add to buffer and check if flush needed
        async with self._lock:
            should_flush = self._add_to_buffer(content)

            if should_flush:
                await self._flush_buffer()

    async def _flush_buffer(self):
        """Flush the buffer to file."""
        content = self._get_buffered_content()
        if not content:
            return

        # Check for rotation before writing
        if self.rotate and self._should_rotate():
            await self._rotate_file_async()

        if self.use_async and HAS_AIOFILES:
            async with aiofiles.open(
                self.file_path, "a", encoding="utf-8"
            ) as f:
                await f.write(content)
        else:
            with self._sync_lock:
                with open(self.file_path, "a", encoding="utf-8") as f:
                    f.write(content)
                    f.flush()

    async def flush(self):
        """Force flush the buffer."""
        async with self._lock:
            await self._flush_buffer()

    def _should_rotate(self) -> bool:
        """Check if file should be rotated"""
        if not self.file_path.exists():
            return False

        try:
            file_size_mb = self.file_path.stat().st_size / (1024 * 1024)
            return file_size_mb >= self.max_size_mb
        except OSError:
            return False

    async def _rotate_file_async(self):
        """Rotate log files asynchronously"""
        if not self.file_path.exists():
            return

        try:
            # Move existing files
            for i in range(self.max_files - 1, 0, -1):
                old_file = self.file_path.with_suffix(
                    f".{i}{self.file_path.suffix}"
                )
                new_file = self.file_path.with_suffix(
                    f".{i+1}{self.file_path.suffix}"
                )

                if old_file.exists():
                    if new_file.exists():
                        new_file.unlink()
                    old_file.rename(new_file)

            # Move current file to .1
            rotated = self.file_path.with_suffix(f".1{self.file_path.suffix}")
            if rotated.exists():
                rotated.unlink()
            self.file_path.rename(rotated)
        except OSError as e:
            # Log rotation error but don't fail
            import sys

            print(
                f"[artissist-logger] File rotation error: {e}",
                file=sys.stderr,
            )

    async def close(self):
        """Flush buffer and close file handles"""
        self._closed = True

        # Flush remaining buffer
        try:
            await self.flush()
        except Exception:
            pass

        if self._file_handle:
            self._file_handle.close()
            self._file_handle = None
