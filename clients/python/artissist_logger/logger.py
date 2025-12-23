# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Core Logger implementation for Artissist Logger Python client
"""

import asyncio
import sys
import threading
from datetime import datetime, timezone
from typing import Optional

from .context import ContextManager, LoggerContext
from .emoji import EmojiResolver
from .types import LogEntryParams, LogLevel, LogEntry
from .generated_types import LoggingContext, LoggerConfig

# Maximum message length (from Smithy schema)
MAX_MESSAGE_LENGTH = 4096

# Log level ordering for filtering
LOG_LEVEL_ORDER = {
    LogLevel.TRACE: 0,
    LogLevel.DEBUG: 1,
    LogLevel.INFO: 2,
    LogLevel.WARN: 3,
    LogLevel.ERROR: 4,
    LogLevel.FATAL: 5,
}

# Background event loop for sync methods
_background_loop: Optional[asyncio.AbstractEventLoop] = None
_background_thread: Optional[threading.Thread] = None
_loop_lock = threading.Lock()


def _get_background_loop() -> asyncio.AbstractEventLoop:
    """Get or create a background event loop for sync methods."""
    global _background_loop, _background_thread

    with _loop_lock:
        if _background_loop is None or not _background_loop.is_running():
            _background_loop = asyncio.new_event_loop()

            def run_loop():
                asyncio.set_event_loop(_background_loop)
                _background_loop.run_forever()

            _background_thread = threading.Thread(
                target=run_loop, daemon=True, name="artissist-logger-bg"
            )
            _background_thread.start()

    return _background_loop


class Logger:
    """Core logger implementation with emoji support and context management"""

    def __init__(
        self,
        config: LoggerConfig,
        adapter_instances=None,
        min_level: LogLevel = LogLevel.DEBUG,
    ):
        """
        Initialize logger

        Args:
            config: Logger configuration containing service, environment,
                adapter names
            adapter_instances: Pre-created adapter instances (for factory use)
            min_level: Minimum log level to process (default: DEBUG)
        """
        self.service = config.service or "unknown"
        self.environment = config.environment or "dev"
        self.emojis = config.emojis or False
        self.min_level = min_level

        # Convert LoggingContext to LoggerContext for internal use
        if config.context:
            self.base_context = LoggerContext(
                correlation_id=config.context.correlation_id,
                user_id=config.context.user_id,
                session_id=config.context.session_id,
                request_id=config.context.request_id,
                trace_id=config.context.trace_id,
                span_id=config.context.span_id,
            )
        else:
            self.base_context = LoggerContext()

        # Use provided adapter instances or resolve from adapter names
        if adapter_instances:
            self.adapters = adapter_instances
        else:
            self.adapters = self._resolve_adapters(config.adapters or [])

        self.emoji_resolver = EmojiResolver()

    def _should_log(self, level: LogLevel) -> bool:
        """Check if a message at the given level should be logged."""
        return LOG_LEVEL_ORDER.get(level, 0) >= LOG_LEVEL_ORDER.get(
            self.min_level, 0
        )

    def set_level(self, level: LogLevel) -> None:
        """Set the minimum log level."""
        self.min_level = level

    def _resolve_adapters(self, adapter_names):
        """Resolve adapter names to adapter instances"""
        from .adapters.console import ConsoleAdapter
        from .adapters.file import FileAdapter

        adapter_instances = []
        for adapter_name in adapter_names:
            if adapter_name == "console" or adapter_name.value == "console":
                adapter_instances.append(ConsoleAdapter({}))
            elif adapter_name == "file" or adapter_name.value == "file":
                adapter_instances.append(
                    FileAdapter({"file_path": f"logs/{self.service}.log"})
                )
            # Add other adapters as needed
        return adapter_instances

    def _convert_to_adapter_names(self):
        """Convert current adapter instances back to AdapterName enums"""
        from .generated_types import AdapterName

        adapter_names = []
        for adapter in self.adapters:
            adapter_class_name = adapter.__class__.__name__.lower()
            if "console" in adapter_class_name:
                adapter_names.append(AdapterName.CONSOLE)
            elif "file" in adapter_class_name:
                adapter_names.append(AdapterName.FILE)
            # Add other adapter mappings as needed
        return adapter_names

    def _validate_message(self, message: str) -> str:
        """Validate and potentially truncate message."""
        if not message:
            return ""
        if len(message) > MAX_MESSAGE_LENGTH:
            return message[: MAX_MESSAGE_LENGTH - 3] + "..."
        return message

    async def log(self, params: LogEntryParams):
        """
        Core logging method

        Args:
            params: LogEntryParams containing all log entry parameters
        """
        # Check log level filter
        if not self._should_log(params.level):
            return

        # Validate message
        validated_message = self._validate_message(params.message)

        # Merge contexts: base -> current -> provided
        current_context = ContextManager.get_context()
        final_context = self.base_context
        if current_context:
            final_context = final_context.merge(current_context)
        if params.context:
            final_context = final_context.merge(params.context)

        # Convert LoggerContext to LoggingContext for LogEntry
        logging_context = LoggingContext(
            correlation_id=final_context.correlation_id,
            trace_id=final_context.trace_id,
            span_id=final_context.span_id,
            user_id=final_context.user_id,
            session_id=final_context.session_id,
            request_id=final_context.request_id,
        )

        # Create log message with timezone-aware datetime
        log_message = LogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=params.level,
            message=validated_message,
            service=self.service,
            event=params.event,
            context=logging_context,
            metadata=params.metadata,
            metrics=params.metrics,
            error=params.error,
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
                results = await asyncio.gather(*tasks, return_exceptions=True)
                # Log adapter errors to stderr instead of silently ignoring
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        adapter_name = self.adapters[i].__class__.__name__
                        print(
                            f"[artissist-logger] Adapter error ({adapter_name})"
                            f": {result}",
                            file=sys.stderr,
                        )
            except Exception as e:
                # Fallback error logging to stderr
                print(
                    f"[artissist-logger] Critical error in log dispatch: {e}",
                    file=sys.stderr,
                )

    async def trace(self, message: str, **kwargs):
        """Log trace message"""
        await self.log(
            LogEntryParams(level=LogLevel.TRACE, message=message, **kwargs)
        )

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

    async def fatal(self, message: str, **kwargs):
        """Log fatal message"""
        await self.log(
            LogEntryParams(level=LogLevel.FATAL, message=message, **kwargs)
        )

    # Synchronous convenience methods using background event loop
    def trace_sync(self, message: str, **kwargs):
        """Synchronous trace logging (fire-and-forget)"""
        loop = _get_background_loop()
        asyncio.run_coroutine_threadsafe(self.trace(message, **kwargs), loop)

    def debug_sync(self, message: str, **kwargs):
        """Synchronous debug logging (fire-and-forget)"""
        loop = _get_background_loop()
        asyncio.run_coroutine_threadsafe(self.debug(message, **kwargs), loop)

    def info_sync(self, message: str, **kwargs):
        """Synchronous info logging (fire-and-forget)"""
        loop = _get_background_loop()
        asyncio.run_coroutine_threadsafe(self.info(message, **kwargs), loop)

    def warn_sync(self, message: str, **kwargs):
        """Synchronous warning logging (fire-and-forget)"""
        loop = _get_background_loop()
        asyncio.run_coroutine_threadsafe(self.warn(message, **kwargs), loop)

    def error_sync(self, message: str, **kwargs):
        """Synchronous error logging (fire-and-forget)"""
        loop = _get_background_loop()
        asyncio.run_coroutine_threadsafe(self.error(message, **kwargs), loop)

    def fatal_sync(self, message: str, **kwargs):
        """Synchronous fatal logging (fire-and-forget)"""
        loop = _get_background_loop()
        asyncio.run_coroutine_threadsafe(self.fatal(message, **kwargs), loop)

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

        # Convert LoggerContext to LoggingContext for Smithy compatibility
        logging_context = LoggingContext(
            correlation_id=merged_context.correlation_id,
            trace_id=merged_context.trace_id,
            span_id=merged_context.span_id,
            user_id=merged_context.user_id,
            session_id=merged_context.session_id,
            request_id=merged_context.request_id,
        )

        return Logger(
            LoggerConfig(
                service=self.service,
                environment=self.environment,
                adapters=self._convert_to_adapter_names(),
                emojis=self.emojis,
                context=logging_context,
            ),
            self.adapters,  # Pass current adapter instances
            self.min_level,  # Preserve log level
        )
