"""
Core type definitions for Artissist Logger Python client
Import and re-export ONLY generated Smithy types
"""

from dataclasses import dataclass
from typing import Optional, List

# Import and re-export specific generated Smithy types
from .generated_types import (
    LogLevel,
    LogEvent,
    LogMetadata,
    PerformanceMetrics,
    ErrorDetails,
    LoggingContext,
    LogEntry,
    # Re-export all other types for backward compatibility
    Document,
    AdapterName,
    TimestampFormat,
    ServiceName,
    Environment,
    LogId,
    UserId,
    SessionId,
    RequestId,
    Timestamp,
    LogEntryList,
    LogIdList,
    FailedLogEntryList,
    AdapterNameList,
    TagMap,
    MetricsMap,
    CustomEventMap,
    EmojiMappingMap,
    AWSContext,
    AgentLogEntry,
    AgentLoggerConfig,
    BrowserAdapterConfig,
    ClientInfo,
    ConsoleAdapterConfig,
    CoordinateInfo,
    CostImpact,
    CreateBatchLogEntriesRequest,
    CreateBatchLogEntriesResponse,
    CreateLogEntryRequest,
    CreateLogEntryResponse,
    DefaultEmojiMappings,
    DeploymentContext,
    ECSInfo,
    EmojiMapping,
    ErrorContext,
    FailedLogEntry,
    FileAdapterConfig,
    FrontendLogEntry,
    GetLogEntryRequest,
    GetLogEntryResponse,
    InfrastructureLogEntry,
    InfrastructureLoggerConfig,
    LocalStorageAdapterConfig,
    LoggerConfig,
    LoggerFactoryConfig,
    MemoryInfo,
    ObservationContext,
    PerformanceTiming,
    QueryLogsRequest,
    QueryLogsResponse,
    ResourceMetrics,
    ServiceError,
    StandardEmojiMappings,
    ToolExecutionContext,
    UserInteractionContext,
    ValidationError,
    DEFAULT_EMOJI_MAPPINGS,
    TYPED_EMOJI_MAPPINGS,
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
