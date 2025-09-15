# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Core Logger implementation for Artissist Logger Python client
"""

import asyncio
from datetime import datetime

from .context import ContextManager, LoggerContext
from .emoji import EmojiResolver
from .types import LogEntryParams, LoggerConfig, LogLevel, LogMessage


class Logger:
    """Core logger implementation with emoji support and context management"""

    def __init__(self, config: LoggerConfig):
        """
        Initialize logger

        Args:
            config: Logger configuration containing service, environment,
                adapters
        """
        self.service = config.service
        self.environment = config.environment
        self.adapters = config.adapters
        self.emojis = config.emojis
        self.base_context = config.context or LoggerContext()
        self.emoji_resolver = config.emoji_resolver or EmojiResolver()

    async def log(self, params: LogEntryParams):
        """
        Core logging method

        Args:
            params: LogEntryParams containing all log entry parameters
        """
        # Merge contexts: base -> current -> provided
        current_context = ContextManager.get_context()
        final_context = self.base_context
        if current_context:
            final_context = final_context.merge(current_context)
        if params.context:
            final_context = final_context.merge(params.context)

        # Create log message
        log_message = LogMessage(
            timestamp=datetime.utcnow(),
            level=params.level,
            message=params.message,
            service=self.service,
            event=params.event,
            correlation_id=final_context.correlation_id,
            user_id=final_context.user_id,
            session_id=final_context.session_id,
            request_id=final_context.request_id,
            metadata=params.metadata,
            metrics=params.metrics,
            error=params.error,
            tags=params.tags,
        )

        # Get emoji if enabled
        emoji = None
        if self.emojis:
            emoji = self.emoji_resolver.get_emoji(
                params.event, params.custom_event
            )

        # Format and send to all adapters
        tasks = []
        for adapter in self.adapters:
            formatted_message = adapter.format_message(
                log_message, self.emojis, emoji
            )
            task = adapter.write(log_message, formatted_message)
            tasks.append(task)

        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception:
                # Ignore adapter errors to prevent logging failures
                pass

    async def debug(self, message: str, **kwargs):
        """Log debug message"""
        await self.log(
            LogEntryParams(level=LogLevel.DEBUG, message=message, **kwargs)
        )

    async def info(self, message: str, **kwargs):
        """Log info message"""
        await self.log(
            LogEntryParams(level=LogLevel.INFO, message=message, **kwargs)
        )

    async def warn(self, message: str, **kwargs):
        """Log warning message"""
        await self.log(
            LogEntryParams(level=LogLevel.WARN, message=message, **kwargs)
        )

    async def error(self, message: str, **kwargs):
        """Log error message"""
        await self.log(
            LogEntryParams(level=LogLevel.ERROR, message=message, **kwargs)
        )

    # Synchronous convenience methods
    def debug_sync(self, message: str, **kwargs):
        """Synchronous debug logging"""
        asyncio.create_task(self.debug(message, **kwargs))

    def info_sync(self, message: str, **kwargs):
        """Synchronous info logging"""
        asyncio.create_task(self.info(message, **kwargs))

    def warn_sync(self, message: str, **kwargs):
        """Synchronous warning logging"""
        asyncio.create_task(self.warn(message, **kwargs))

    def error_sync(self, message: str, **kwargs):
        """Synchronous error logging"""
        asyncio.create_task(self.error(message, **kwargs))

    async def close(self):
        """Close all adapters and cleanup resources"""
        tasks = [adapter.close() for adapter in self.adapters]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def with_context(self, **kwargs) -> "Logger":
        """Create a logger with additional context"""
        new_context = self.base_context

        # Update context with provided values
        context_update = LoggerContext(
            correlation_id=kwargs.get("correlation_id"),
            user_id=kwargs.get("user_id"),
            session_id=kwargs.get("session_id"),
            request_id=kwargs.get("request_id"),
            trace_id=kwargs.get("trace_id"),
            span_id=kwargs.get("span_id"),
            custom_context={
                k: v
                for k, v in kwargs.items()
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
        )

        merged_context = new_context.merge(context_update)

        return Logger(
            LoggerConfig(
                service=self.service,
                environment=self.environment,
                adapters=self.adapters,
                emojis=self.emojis,
                context=merged_context,
                emoji_resolver=self.emoji_resolver,
            )
        )
