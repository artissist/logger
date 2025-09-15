# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Base adapter interface for Artissist Logger Python client
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from ..types import LogEntry


class LogAdapter(ABC):
    """Base class for log output adapters"""

    def __init__(self, config: Dict[str, Any]):
        """Initialize adapter with configuration"""
        self.config = config

    @abstractmethod
    async def write(self, message: LogEntry, formatted_message: str):
        """Write formatted log message to output destination"""
        raise NotImplementedError

    @abstractmethod
    async def close(self):
        """Clean up adapter resources"""
        raise NotImplementedError

    def format_message(
        self,
        message: LogEntry,
        include_emoji: bool = False,
        emoji: Optional[str] = None,
    ) -> str:
        """Format log message for output"""
        timestamp_str = "unknown"
        if message.timestamp:
            if isinstance(message.timestamp, str):
                timestamp_str = message.timestamp
            else:
                timestamp_str = message.timestamp.strftime("%Y-%m-%d %H:%M:%S")

        level_str = "INFO"
        if message.level:
            level_str = message.level.value.ljust(5)
        service = f"[{message.service or 'unknown'}]"

        # Build message components
        parts = [timestamp_str, level_str, service]

        # Add emoji if enabled and available
        if include_emoji and emoji:
            parts.append(emoji)

        parts.append(message.message or "")

        base_message = " ".join(parts)

        # Add context information if available
        context_parts = []
        if message.context and message.context.correlation_id:
            context_parts.append(
                f"correlation_id={message.context.correlation_id}"
            )
        if message.context and message.context.user_id:
            context_parts.append(f"user_id={message.context.user_id}")
        if message.context and message.context.request_id:
            context_parts.append(f"request_id={message.context.request_id}")

        if context_parts:
            base_message += f" | {', '.join(context_parts)}"

        return base_message
