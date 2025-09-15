$version: "2"

namespace artissist.logging

/// Timestamp in ISO-8601 format
@timestampFormat("date-time")
timestamp Timestamp

/// Enumeration of supported log levels
enum LogLevel {
    /// Detailed tracing information for debugging
    TRACE
    /// General debugging information  
    DEBUG
    /// Informational messages during normal operations
    INFO
    /// Warning conditions that should be addressed
    WARN
    /// Error conditions that require attention
    ERROR
    /// Critical failures that may cause system shutdown
    FATAL
}

/// Pre-defined event types with emoji mappings
enum LogEvent {
    @documentation("System startup or initialization events")
    SYSTEM_START
    
    @documentation("System shutdown or termination events")
    SYSTEM_STOP
    
    @documentation("User authentication events")
    USER_AUTH
    
    @documentation("Authorization and permission events")
    USER_AUTHZ
    
    @documentation("Project lifecycle events")
    PROJECT_LIFECYCLE
    
    @documentation("Database operations")
    DATABASE_OPERATION
    
    @documentation("API request/response events")
    API_REQUEST
    
    @documentation("Performance metrics and timing")
    PERFORMANCE_METRIC
    
    @documentation("Error conditions and exceptions")
    ERROR_OCCURRED
    
    @documentation("Warning conditions")
    WARNING_ISSUED
    
    @documentation("Configuration changes")
    CONFIG_CHANGE
    
    @documentation("Analytics and tracking events")
    ANALYTICS_EVENT
    
    @documentation("Agent processing events")
    AGENT_PROCESSING
    
    @documentation("Conversation and interaction events")
    CONVERSATION_EVENT
    
    @documentation("Asset upload and processing")
    ASSET_PROCESSING
    
    @documentation("Inspiration capture events")
    INSPIRATION_EVENT
    
    @documentation("Infrastructure deployment events")
    INFRASTRUCTURE_DEPLOY
    
    @documentation("Business metric events")
    BUSINESS_METRIC
    
    @documentation("Search and discovery events")
    SEARCH_OPERATION
    
    @documentation("Background job processing")
    BACKGROUND_JOB
    
    @documentation("Notification events")
    NOTIFICATION_SENT
    
    @documentation("Security-related events")
    SECURITY_EVENT
    
    @documentation("Scheduled task execution")
    SCHEDULED_TASK
    
    @documentation("External service integration")
    EXTERNAL_SERVICE
    
    @documentation("Audit trail events")
    AUDIT_TRAIL
}

/// Service name identifier pattern
@pattern("^[a-zA-Z0-9\\-_]{1,64}$")
string ServiceName

/// Environment identifier pattern  
@pattern("^(dev|test|staging|prod)$")
string Environment

/// Unique log entry identifier
@pattern("^log_[a-fA-F0-9]{32}$")
string LogId

/// User identifier pattern
@pattern("^usr_[a-zA-Z0-9]{8,32}$")
string UserId

/// Session identifier pattern
@pattern("^sess_[a-fA-F0-9]{32}$")
string SessionId

/// Request identifier pattern
@pattern("^req_[a-fA-F0-9]{16}$")
string RequestId

/// Collections
list LogEntryList {
    member: LogEntry
}

list LogIdList {
    member: LogId  
}

list FailedLogEntryList {
    member: FailedLogEntry
}

/// Key-value pairs for tags
map TagMap {
    key: String
    value: String
}

/// Metrics as key-value pairs
map MetricsMap {
    key: String
    value: Double
}

/// Custom event mappings for extensible event system
map CustomEventMap {
    key: String
    value: EmojiMapping
}

/// Document type for flexible structured data
document Document