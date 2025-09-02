$version: "2"

namespace mosaic.logging

/// Primary log entry structure
structure LogEntry {
    /// Unique identifier for this log entry
    @required
    logId: LogId

    /// Timestamp when the log entry was created
    @required
    timestamp: Timestamp

    /// Severity level of the log entry
    @required
    level: LogLevel

    /// Human-readable log message
    @required
    @length(min: 1, max: 4096)
    message: String

    /// Service or component that generated this log entry
    @required
    service: ServiceName

    /// Deployment environment (dev, staging, prod)
    @required
    environment: Environment

    /// Pre-defined event type for consistent categorization
    event: LogEvent

    /// Whether to include emoji prefix in log message output
    includeEmoji: Boolean

    /// Correlation context for distributed tracing
    context: LoggingContext

    /// Additional structured data
    metadata: LogMetadata

    /// Performance metrics associated with this log entry
    metrics: PerformanceMetrics

    /// Error details if this is an error log entry
    error: ErrorDetails
}

/// Context information for distributed tracing and correlation
structure LoggingContext {
    /// Primary correlation identifier for request tracking
    @pattern("^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$")
    correlationId: String

    /// OpenTelemetry trace identifier  
    @pattern("^[a-fA-F0-9]{32}$")
    traceId: String

    /// OpenTelemetry span identifier
    @pattern("^[a-fA-F0-9]{16}$") 
    spanId: String

    /// User context if applicable
    userId: UserId

    /// Session context if applicable
    sessionId: SessionId

    /// Request context if applicable  
    requestId: RequestId

    /// Parent correlation ID for nested operations
    parentCorrelationId: String
}

/// Flexible metadata container for additional log data
structure LogMetadata {
    /// Key-value pairs for additional context
    tags: TagMap

    /// Nested structured data
    data: Document

    /// Component or module within the service
    component: String

    /// Operation or function being logged
    operation: String

    /// Version of the service/component
    version: String
    
    /// Custom event mappings for extensible event system
    customEventMappings: CustomEventMap
}

/// Performance metrics for operations
structure PerformanceMetrics {
    /// Operation duration in milliseconds
    @range(min: 0)
    durationMs: Long

    /// Memory usage in bytes
    @range(min: 0)
    memoryBytes: Long

    /// CPU usage percentage
    @range(min: 0, max: 100)
    cpuPercent: Double

    /// Custom performance counters
    counters: MetricsMap
}

/// Error details for error-level log entries
structure ErrorDetails {
    /// Error type or class name
    @required
    type: String

    /// Detailed error message
    @required 
    @length(min: 1, max: 2048)
    message: String

    /// Stack trace if available
    stackTrace: String

    /// Error code if applicable
    code: String

    /// Additional error context
    context: ErrorContext
}

/// Error context with file and location information
structure ErrorContext {
    /// File where error occurred
    file: String
    
    /// Line number where error occurred
    line: Integer
    
    /// Function/method where error occurred  
    function: String
    
    /// Additional context data
    data: Document
}

/// Emoji mapping configuration for events
structure EmojiMapping {
    /// Unicode emoji character
    @required
    emoji: String
    
    /// Human-readable description of the event
    @required
    description: String
    
    /// Whether this emoji should be used by default
    isDefault: Boolean
}

/// Failed log entry for batch operations
structure FailedLogEntry {
    @required
    entry: LogEntry
    
    @required
    reason: String
}