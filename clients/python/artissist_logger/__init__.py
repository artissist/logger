"""
Artissist Logger - Platform-agnostic logging client for Python
"""

from .logger import Logger
from .factory import LoggerFactory
from .context import LoggerContext
from .emoji import EmojiResolver, EmojiMapping
from .types import LogLevel, LogEvent, LogMessage, LogMetrics, ErrorInfo

__version__ = "1.0.0"
__author__ = "Artissist"

__all__ = [
    "Logger",
    "LoggerFactory",
    "LoggerContext",
    "EmojiResolver",
    "EmojiMapping",
    "LogLevel",
    "LogEvent",
    "LogMessage",
    "LogMetrics",
    "ErrorInfo",
]
