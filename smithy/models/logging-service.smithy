// SPDX-License-Identifier: AGPL-3.0-or-later
$version: "2"

namespace mosaic.logging

/// Unified logging service for Mosaic platform components
service LoggingService {
    version: "2025-01-01"
    operations: [
        CreateLogEntry
        CreateBatchLogEntries
        QueryLogs
        GetLogEntry
    ]
    errors: [
        ValidationError
        ServiceError
    ]
}

/// Primary operation for creating individual log entries
@http(method: "POST", uri: "/logs")
operation CreateLogEntry {
    input: CreateLogEntryRequest
    output: CreateLogEntryResponse
    errors: [ValidationError]
}

/// Batch operation for high-volume logging scenarios
@http(method: "POST", uri: "/logs/batch")
operation CreateBatchLogEntries {
    input: CreateBatchLogEntriesRequest
    output: CreateBatchLogEntriesResponse
    errors: [ValidationError, ServiceError]
}

/// Query operation for log retrieval and analysis
@readonly
@http(method: "GET", uri: "/logs")
operation QueryLogs {
    input: QueryLogsRequest
    output: QueryLogsResponse
    errors: [ValidationError]
}

/// Individual log entry retrieval
@readonly
@http(method: "GET", uri: "/logs/{logId}")
operation GetLogEntry {
    input: GetLogEntryRequest
    output: GetLogEntryResponse
    errors: [ValidationError]
}

/// Request/Response Structures

/// Request structure for creating a single log entry
structure CreateLogEntryRequest {
    @required
    logEntry: LogEntry
}

/// Response structure for log entry creation
structure CreateLogEntryResponse {
    @required
    logId: LogId
    
    @required
    timestamp: Timestamp
    
    status: String
}

/// Request structure for batch log entry creation
structure CreateBatchLogEntriesRequest {
    @required
    @length(min: 1, max: 100)
    logEntries: LogEntryList
}

/// Response structure for batch log entry creation
structure CreateBatchLogEntriesResponse {
    @required
    processedCount: Integer
    
    @required
    successfulIds: LogIdList
    
    failedEntries: FailedLogEntryList
}

/// Request structure for querying logs
structure QueryLogsRequest {
    /// Service name filter
    @httpQuery("service")
    service: ServiceName
    
    /// Environment filter  
    @httpQuery("environment")
    environment: Environment
    
    /// Log level filter (minimum level)
    @httpQuery("minLevel")
    minLevel: LogLevel
    
    /// Time range start
    @httpQuery("startTime")
    startTime: Timestamp
    
    /// Time range end
    @httpQuery("endTime")
    endTime: Timestamp
    
    /// Correlation ID filter
    @httpQuery("correlationId")
    correlationId: String
    
    /// User ID filter
    @httpQuery("userId")
    userId: UserId
    
    /// Event type filter
    @httpQuery("event")
    event: LogEvent
    
    /// Maximum results to return
    @httpQuery("limit")
    @range(min: 1, max: 1000)
    limit: Integer
    
    /// Pagination token
    @httpQuery("nextToken")
    nextToken: String
}

/// Response structure for log queries
structure QueryLogsResponse {
    @required
    logEntries: LogEntryList
    
    nextToken: String
    
    @required
    totalCount: Integer
}

/// Request structure for getting a single log entry
structure GetLogEntryRequest {
    @required
    @httpLabel
    logId: LogId
}

/// Response structure for getting a single log entry
structure GetLogEntryResponse {
    logEntry: LogEntry
}

/// Error definitions

/// Client error for validation failures
@error("client")
@httpError(400)
structure ValidationError {
    @required
    message: String
    
    field: String
    
    code: String
}

/// Server error for service failures
@error("server") 
@httpError(500)
structure ServiceError {
    @required
    message: String
    
    @required
    requestId: String
    
    code: String
}