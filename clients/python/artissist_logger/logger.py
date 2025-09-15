"""
Core Logger implementation for Artissist Logger Python client
"""

import asyncio
from datetime import datetime

from .context import ContextManager, LoggerContext
from .emoji import EmojiResolver
from .types import LogEntryParams, LogLevel, LogEntry
from .generated_types import LoggingContext, LoggerConfig


class Logger:
    """Core logger implementation with emoji support and context management"""

    def __init__(self, config: LoggerConfig, adapter_instances=None):
        """
        Initialize logger

        Args:
            config: Logger configuration containing service, environment,
                adapter names
            adapter_instances: Pre-created adapter instances (for factory use)
        """
        self.service = config.service or "unknown"
        self.environment = config.environment or "dev"
        self.emojis = config.emojis or False

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

        # Convert LoggerContext to LoggingContext for LogEntry
        logging_context = LoggingContext(
            correlation_id=final_context.correlation_id,
            trace_id=final_context.trace_id,
            span_id=final_context.span_id,
            user_id=final_context.user_id,
            session_id=final_context.session_id,
            request_id=final_context.request_id,
        )

        # Create log message
        log_message = LogEntry(
            timestamp=datetime.utcnow().isoformat(),
            level=params.level,
            message=params.message,
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
        )
