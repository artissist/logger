"""
Core Logger implementation for Mosaic Logger Python client
"""

import asyncio
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from .types import LogLevel, LogEvent, LogMessage, LogMetrics, ErrorInfo
from .context import LoggerContext, ContextManager
from .emoji import EmojiResolver
from .adapters.base import LogAdapter


class Logger:
    """Core logger implementation with emoji support and context management"""
    
    def __init__(
        self,
        service: str,
        environment: str,
        adapters: List[LogAdapter],
        emojis: bool = False,
        context: Optional[LoggerContext] = None,
        emoji_resolver: Optional[EmojiResolver] = None
    ):
        """
        Initialize logger
        
        Args:
            service: Service name for identification
            environment: Environment (dev, staging, prod)
            adapters: List of output adapters
            emojis: Whether to include emojis in log messages
            context: Base context for all log messages
            emoji_resolver: Custom emoji resolver
        """
        self.service = service
        self.environment = environment
        self.adapters = adapters
        self.emojis = emojis
        self.base_context = context or LoggerContext()
        self.emoji_resolver = emoji_resolver or EmojiResolver()
        
    async def log(
        self,
        level: LogLevel,
        message: str,
        event: Optional[LogEvent] = None,
        custom_event: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        metrics: Optional[LogMetrics] = None,
        error: Optional[ErrorInfo] = None,
        tags: Optional[List[str]] = None,
        context: Optional[LoggerContext] = None
    ):
        """
        Core logging method
        
        Args:
            level: Log severity level
            message: Log message text
            event: Pre-defined event type
            custom_event: Custom event name for extensibility
            metadata: Additional structured data
            metrics: Performance and business metrics
            error: Error information
            tags: List of tags for categorization
            context: Context information for this log entry
        """
        # Merge contexts: base -> current -> provided
        current_context = ContextManager.get_context()
        final_context = self.base_context
        if current_context:
            final_context = final_context.merge(current_context)
        if context:
            final_context = final_context.merge(context)
            
        # Create log message
        log_message = LogMessage(
            timestamp=datetime.utcnow(),
            level=level,
            message=message,
            service=self.service,
            event=event,
            correlation_id=final_context.correlation_id,
            user_id=final_context.user_id,
            session_id=final_context.session_id,
            request_id=final_context.request_id,
            metadata=metadata,
            metrics=metrics,
            error=error,
            tags=tags
        )
        
        # Get emoji if enabled
        emoji = None
        if self.emojis:
            emoji = self.emoji_resolver.get_emoji(event, custom_event)
            
        # Format and send to all adapters
        tasks = []
        for adapter in self.adapters:
            formatted_message = adapter.format_message(log_message, self.emojis, emoji)
            task = adapter.write(log_message, formatted_message)
            tasks.append(task)
            
        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception:
                # Ignore adapter errors to prevent logging failures from breaking application
                pass
                
    async def debug(self, message: str, **kwargs):
        """Log debug message"""
        await self.log(LogLevel.DEBUG, message, **kwargs)
        
    async def info(self, message: str, **kwargs):
        """Log info message"""
        await self.log(LogLevel.INFO, message, **kwargs)
        
    async def warn(self, message: str, **kwargs):
        """Log warning message"""
        await self.log(LogLevel.WARN, message, **kwargs)
        
    async def error(self, message: str, **kwargs):
        """Log error message"""
        await self.log(LogLevel.ERROR, message, **kwargs)
        
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
            
    def with_context(self, **kwargs) -> 'Logger':
        """Create a logger with additional context"""
        new_context = self.base_context
        
        # Update context with provided values
        context_update = LoggerContext(
            correlation_id=kwargs.get('correlation_id'),
            user_id=kwargs.get('user_id'),
            session_id=kwargs.get('session_id'),
            request_id=kwargs.get('request_id'),
            trace_id=kwargs.get('trace_id'),
            span_id=kwargs.get('span_id'),
            custom_context={k: v for k, v in kwargs.items() 
                          if k not in ['correlation_id', 'user_id', 'session_id', 'request_id', 'trace_id', 'span_id']}
        )
        
        merged_context = new_context.merge(context_update)
        
        return Logger(
            service=self.service,
            environment=self.environment,
            adapters=self.adapters,
            emojis=self.emojis,
            context=merged_context,
            emoji_resolver=self.emoji_resolver
        )