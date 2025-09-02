"""
Base adapter interface for Artissist Logger Python client
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
from ..types import LogMessage


class LogAdapter(ABC):
    """Base class for log output adapters"""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize adapter with configuration"""
        self.config = config
        
    @abstractmethod
    async def write(self, message: LogMessage, formatted_message: str):
        """Write formatted log message to output destination"""
        pass
        
    @abstractmethod
    async def close(self):
        """Clean up adapter resources"""
        pass
        
    def format_message(self, message: LogMessage, include_emoji: bool = False, emoji: str = None) -> str:
        """Format log message for output"""
        timestamp = message.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        level = message.level.value.ljust(5)
        service = f"[{message.service}]"
        
        # Build message components
        parts = [timestamp, level, service]
        
        # Add emoji if enabled and available
        if include_emoji and emoji:
            parts.append(emoji)
            
        parts.append(message.message)
        
        base_message = " ".join(parts)
        
        # Add context information if available
        context_parts = []
        if message.correlation_id:
            context_parts.append(f"correlation_id={message.correlation_id}")
        if message.user_id:
            context_parts.append(f"user_id={message.user_id}")
        if message.request_id:
            context_parts.append(f"request_id={message.request_id}")
            
        if context_parts:
            base_message += f" | {', '.join(context_parts)}"
            
        return base_message