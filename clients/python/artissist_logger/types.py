"""
Core type definitions for Artissist Logger Python client
Import and re-export ONLY generated Smithy types
"""

from dataclasses import dataclass
from typing import Optional, List

# Import only the types used in this module and exported to other modules
from .generated_types import (
    LogLevel,
    LogEvent,
    LogMetadata,
    PerformanceMetrics,
    ErrorDetails,
    LoggingContext,
    LogEntry,  # noqa: F401,W0611  # Re-exported for adapters and other modules
)


# Client-specific helper types (not in Smithy schema)
@dataclass
class LogEntryParams:
    """Parameters for creating a log entry"""

    level: LogLevel
    message: str
    event: Optional[LogEvent] = None
    custom_event: Optional[str] = None
    metadata: Optional[LogMetadata] = None
    metrics: Optional[PerformanceMetrics] = None
    error: Optional[ErrorDetails] = None
    tags: Optional[List[str]] = None
    context: Optional[LoggingContext] = None
