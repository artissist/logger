# SPDX-License-Identifier: AGPL-3.0-or-later
"""
File output adapter for Artissist Logger Python client
"""

import asyncio
import json
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, Optional, TextIO

from ..types import LogEntry
from .base import LogAdapter

try:
    import aiofiles

    HAS_AIOFILES = True
except ImportError:
    HAS_AIOFILES = False
    aiofiles = None  # type: ignore


class FileAdapter(LogAdapter):
    """Outputs log messages to files with rotation support"""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.file_path = Path(config["file_path"])
        self.format = config.get("format", "text")  # "text" or "json"
        self.rotate = config.get("rotate", False)
        self.max_size_mb = config.get("max_size_mb", 10)
        self.max_files = config.get("max_files", 5)
        self.use_async = config.get("async", True) and HAS_AIOFILES

        # Ensure directory exists
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

        self._file_handle: Optional[TextIO] = None
        self._lock = asyncio.Lock() if self.use_async else None

    async def write(self, message: LogEntry, formatted_message: str):
        """Write message to file"""
        if self.use_async and self._lock:
            async with self._lock:
                await self._write_async(message, formatted_message)
        else:
            await self._write_sync(message, formatted_message)

    async def _write_async(self, message: LogEntry, formatted_message: str):
        """Async file writing using aiofiles"""
        if not HAS_AIOFILES:
            await self._write_sync(message, formatted_message)
            return

        # Check for rotation
        if self.rotate and self._should_rotate():
            await self._rotate_file_async()

        async with aiofiles.open(self.file_path, "a", encoding="utf-8") as f:
            if self.format == "json":
                log_data = asdict(message)
                await f.write(json.dumps(log_data) + "\n")
            else:
                await f.write(formatted_message + "\n")

                # Add structured data for errors and metrics
                if message.error:
                    error_line = (
                        f"  ERROR: {json.dumps(asdict(message.error))}"
                    )
                    await f.write(error_line + "\n")

                if message.metrics:
                    metrics_line = (
                        f"  METRICS: {json.dumps(asdict(message.metrics))}"
                    )
                    await f.write(metrics_line + "\n")

    async def _write_sync(self, message: LogEntry, formatted_message: str):
        """Synchronous file writing"""
        # Check for rotation
        if self.rotate and self._should_rotate():
            self._rotate_file_sync()

        with open(self.file_path, "a", encoding="utf-8") as f:
            if self.format == "json":
                log_data = asdict(message)
                f.write(json.dumps(log_data) + "\n")
            else:
                f.write(formatted_message + "\n")

                # Add structured data for errors and metrics
                if message.error:
                    error_line = (
                        f"  ERROR: {json.dumps(asdict(message.error))}"
                    )
                    f.write(error_line + "\n")

                if message.metrics:
                    metrics_line = (
                        f"  METRICS: {json.dumps(asdict(message.metrics))}"
                    )
                    f.write(metrics_line + "\n")

            f.flush()

    def _should_rotate(self) -> bool:
        """Check if file should be rotated"""
        if not self.file_path.exists():
            return False

        file_size_mb = self.file_path.stat().st_size / (1024 * 1024)
        return file_size_mb >= self.max_size_mb

    async def _rotate_file_async(self):
        """Rotate log files asynchronously"""
        if not self.file_path.exists():
            return

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
        rotated_file = self.file_path.with_suffix(f".1{self.file_path.suffix}")
        if rotated_file.exists():
            rotated_file.unlink()
        self.file_path.rename(rotated_file)

    def _rotate_file_sync(self):
        """Rotate log files synchronously"""
        if not self.file_path.exists():
            return

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
        rotated_file = self.file_path.with_suffix(f".1{self.file_path.suffix}")
        if rotated_file.exists():
            rotated_file.unlink()
        self.file_path.rename(rotated_file)

    async def close(self):
        """Close file handles"""
        if self._file_handle:
            self._file_handle.close()
            self._file_handle = None
