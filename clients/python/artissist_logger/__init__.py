"""
Artissist Logger - Platform-agnostic logging client for Python
"""

from .context import LoggerContext
from .emoji import EmojiMapping, EmojiResolver
from .factory import LoggerFactory
from .logger import Logger
from .types import ErrorInfo, LogEvent, LogLevel, LogMessage, LogMetrics

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
