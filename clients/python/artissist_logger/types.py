"""
Core type definitions for Artissist Logger Python client
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime


class LogLevel(Enum):
    """Log severity levels"""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


class LogEvent(Enum):
    """Pre-defined log event types with emoji mappings"""

    SYSTEM_START = "SYSTEM_START"
    ERROR_OCCURRED = "ERROR_OCCURRED"
    API_REQUEST = "API_REQUEST"
    DATABASE_OPERATION = "DATABASE_OPERATION"
    USER_AUTH = "USER_AUTH"
    PROJECT_LIFECYCLE = "PROJECT_LIFECYCLE"
    PERFORMANCE_METRIC = "PERFORMANCE_METRIC"
    WARNING_ISSUED = "WARNING_ISSUED"
    SECURITY_EVENT = "SECURITY_EVENT"
    AI_INFERENCE = "AI_INFERENCE"
    CONVERSATION_EVENT = "CONVERSATION_EVENT"
    AGENT_LIFECYCLE = "AGENT_LIFECYCLE"
    TASK_EXECUTION = "TASK_EXECUTION"
    BUSINESS_METRIC = "BUSINESS_METRIC"
    INSPIRATION_EVENT = "INSPIRATION_EVENT"
    WORKFLOW_EVENT = "WORKFLOW_EVENT"
    INTEGRATION_EVENT = "INTEGRATION_EVENT"
    CONFIGURATION_CHANGE = "CONFIGURATION_CHANGE"
    DEPLOYMENT_EVENT = "DEPLOYMENT_EVENT"
    BACKUP_OPERATION = "BACKUP_OPERATION"
    MAINTENANCE_EVENT = "MAINTENANCE_EVENT"
    USER_INTERACTION = "USER_INTERACTION"
    DATA_PROCESSING = "DATA_PROCESSING"
    CUSTOM_EVENT = "CUSTOM_EVENT"


@dataclass
class LogMetrics:
    """Performance and business metrics"""

    duration_ms: Optional[float] = None
    count: Optional[int] = None
    bytes_processed: Optional[int] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    custom_metrics: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        if self.duration_ms is not None:
            result["duration_ms"] = self.duration_ms
        if self.count is not None:
            result["count"] = self.count
        if self.bytes_processed is not None:
            result["bytes_processed"] = self.bytes_processed
        if self.cpu_usage is not None:
            result["cpu_usage"] = self.cpu_usage
        if self.memory_usage is not None:
            result["memory_usage"] = self.memory_usage
        if self.custom_metrics:
            result.update(self.custom_metrics)
        return result


@dataclass
class ErrorInfo:
    """Error details for logging"""

    type: str
    message: str
    stack_trace: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {"type": self.type, "message": self.message}
        if self.stack_trace:
            result["stack_trace"] = self.stack_trace
        if self.context:
            result["context"] = self.context
        return result


@dataclass
class LogMessage:
    """Complete log message structure"""

    timestamp: datetime
    level: LogLevel
    message: str
    service: str
    event: Optional[LogEvent] = None
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    metrics: Optional[LogMetrics] = None
    error: Optional[ErrorInfo] = None
    tags: Optional[List[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result: Dict[str, Any] = {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level.value,
            "message": self.message,
            "service": self.service,
        }

        if self.event:
            result["event"] = self.event.value
        if self.correlation_id:
            result["correlation_id"] = self.correlation_id
        if self.user_id:
            result["user_id"] = self.user_id
        if self.session_id:
            result["session_id"] = self.session_id
        if self.request_id:
            result["request_id"] = self.request_id
        if self.metadata:
            result["metadata"] = self.metadata
        if self.metrics:
            result["metrics"] = self.metrics.to_dict()
        if self.error:
            result["error"] = self.error.to_dict()
        if self.tags:
            result["tags"] = self.tags

        return result
