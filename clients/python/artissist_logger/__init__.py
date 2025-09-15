# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Artissist Logger - Platform-agnostic logging client for Python
"""

from .context import LoggerContext
from .emoji import EmojiMapping, EmojiResolver
from .factory import LoggerFactory
from .logger import Logger
from .types import LogEvent, LogLevel, LogEntry

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
    "LogEntry",
]
