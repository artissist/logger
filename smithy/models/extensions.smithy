$version: "2"

namespace artissist.logging

/// Extension for agent-specific logging
structure AgentLogEntry {
    /// Base log entry fields
    @required
    baseEntry: LogEntry
    
    /// Agent-specific identifier
    @required
    agentId: String
    
    /// Agent type (observation, conversation, etc.)
    agentType: String
    
    /// Observation context if applicable
    observationContext: ObservationContext
    
    /// Tool execution context
    toolContext: ToolExecutionContext
}

/// Context for observation processing in agents
structure ObservationContext {
    /// Session identifier for the observation
    @required
    sessionId: String
    
    /// Type of observation being processed
    observationType: String
    
    /// Confidence score of the observation
    @range(min: 0.0, max: 1.0)
    confidence: Double
    
    /// Processing mode (sync, async, batch)
    processingMode: String
    
    /// Model version used for processing
    modelVersion: String
    
    /// Number of entities extracted
    entitiesCount: Integer
}

/// Context for tool execution within agents
structure ToolExecutionContext {
    /// Name of the tool being executed
    @required
    toolName: String
    
    /// Tool execution identifier
    executionId: String
    
    /// Input parameters to the tool
    inputParameters: Document
    
    /// Tool execution result
    result: Document
    
    /// Execution duration in milliseconds
    @range(min: 0)
    executionDurationMs: Long
    
    /// Whether the tool execution was successful
    success: Boolean
}

/// Extension for frontend-specific logging  
structure FrontendLogEntry {
    /// Base log entry fields
    @required
    baseEntry: LogEntry
    
    /// Browser/client information
    clientInfo: ClientInfo
    
    /// User interaction context
    userInteraction: UserInteractionContext
    
    /// Performance timing data
    performanceTiming: PerformanceTiming
}

/// Browser and client environment information
structure ClientInfo {
    /// User agent string
    userAgent: String
    
    /// Browser name and version
    browser: String
    
    /// Operating system information
    os: String
    
    /// Screen resolution
    screenResolution: String
    
    /// Viewport dimensions
    viewportSize: String
    
    /// Device type (mobile, tablet, desktop)
    deviceType: String
    
    /// Network connection type
    connectionType: String
    
    /// Timezone of the client
    timezone: String
}

/// User interaction context for frontend events
structure UserInteractionContext {
    /// Type of user interaction (click, scroll, input, etc.)
    interactionType: String
    
    /// Element that triggered the interaction
    targetElement: String
    
    /// Page or route where interaction occurred
    page: String
    
    /// URL of the page
    url: String
    
    /// Referrer URL
    referrer: String
    
    /// Mouse/touch coordinates
    coordinates: CoordinateInfo
    
    /// Additional interaction metadata
    interactionData: Document
}

/// Coordinate information for user interactions
structure CoordinateInfo {
    /// X coordinate
    x: Integer
    
    /// Y coordinate  
    y: Integer
    
    /// Element-relative X coordinate
    relativeX: Integer
    
    /// Element-relative Y coordinate
    relativeY: Integer
}

/// Browser performance timing information
structure PerformanceTiming {
    /// Page load time in milliseconds
    @range(min: 0)
    pageLoadTime: Long
    
    /// DOM content loaded time
    @range(min: 0)
    domContentLoadedTime: Long
    
    /// First contentful paint time
    @range(min: 0)
    firstContentfulPaint: Long
    
    /// Largest contentful paint time
    @range(min: 0)
    largestContentfulPaint: Long
    
    /// Cumulative layout shift score
    @range(min: 0)
    cumulativeLayoutShift: Double
    
    /// First input delay
    @range(min: 0)
    firstInputDelay: Long
    
    /// Memory usage information
    memoryInfo: MemoryInfo
}

/// Memory usage information from the browser
structure MemoryInfo {
    /// Used heap size in bytes
    @range(min: 0)
    usedJSHeapSize: Long
    
    /// Total heap size in bytes
    @range(min: 0)
    totalJSHeapSize: Long
    
    /// Heap size limit in bytes
    @range(min: 0)
    jsHeapSizeLimit: Long
}

/// Extension for infrastructure logging
structure InfrastructureLogEntry {
    /// Base log entry fields
    @required  
    baseEntry: LogEntry
    
    /// AWS resource context
    awsContext: AWSContext
    
    /// Deployment context
    deploymentContext: DeploymentContext
    
    /// Resource metrics
    resourceMetrics: ResourceMetrics
}

/// AWS-specific context for infrastructure logging
structure AWSContext {
    /// AWS region
    region: String
    
    /// AWS account ID
    @pattern("^[0-9]{12}$")
    accountId: String
    
    /// Resource ARN if applicable
    resourceArn: String
    
    /// CloudFormation stack name
    stackName: String
    
    /// Lambda function name
    functionName: String
    
    /// Lambda request ID
    lambdaRequestId: String
    
    /// EC2 instance ID
    instanceId: String
    
    /// ECS cluster and task information
    ecsInfo: ECSInfo
}

/// ECS-specific information
structure ECSInfo {
    /// ECS cluster name
    clusterName: String
    
    /// ECS task ARN
    taskArn: String
    
    /// ECS service name
    serviceName: String
    
    /// ECS task definition family
    taskDefinitionFamily: String
    
    /// ECS task definition revision
    taskDefinitionRevision: String
}

/// Deployment context for infrastructure operations
structure DeploymentContext {
    /// Deployment identifier
    deploymentId: String
    
    /// Deployment stage (plan, apply, destroy)
    deploymentStage: String
    
    /// Infrastructure as code tool (CDK, Terraform, etc.)
    iacTool: String
    
    /// Tool version
    toolVersion: String
    
    /// Target environment
    targetEnvironment: String
    
    /// Deployment trigger (manual, automated, scheduled)
    trigger: String
    
    /// Git commit hash if applicable
    commitHash: String
    
    /// Git branch name
    branch: String
}

/// Resource metrics for infrastructure operations
structure ResourceMetrics {
    /// Number of resources being created
    resourcesCreated: Integer
    
    /// Number of resources being updated
    resourcesUpdated: Integer
    
    /// Number of resources being deleted
    resourcesDeleted: Integer
    
    /// Total resource count
    totalResources: Integer
    
    /// Deployment duration in milliseconds
    @range(min: 0)
    deploymentDurationMs: Long
    
    /// Estimated cost impact
    costImpact: CostImpact
}

/// Cost impact information for infrastructure changes
structure CostImpact {
    /// Estimated monthly cost change in USD
    monthlyCostChangeUSD: Double
    
    /// Currency code
    currency: String
    
    /// Cost calculation confidence
    @range(min: 0.0, max: 1.0)
    confidence: Double
    
    /// Breakdown by resource type
    resourceCostBreakdown: Document
}

// ========== Configuration Structures ==========

/// Logger configuration structure
structure LoggerConfig {
    /// Service name for the logger
    service: ServiceName

    /// Environment name (dev, staging, prod)
    environment: Environment

    /// Enable emoji prefixes in log messages
    emojis: Boolean = false

    /// Correlation context for distributed tracing
    context: LoggingContext

    /// List of adapter names to use
    adapters: AdapterNameList

    /// Minimum log level to output
    level: LogLevel = "INFO"
}

/// Factory configuration for creating loggers
structure LoggerFactoryConfig {
    /// Default service name
    defaultService: ServiceName = "unknown-service"

    /// Default environment name
    defaultEnvironment: Environment = "dev"

    /// Default emoji setting
    defaultEmojis: Boolean = false

    /// Default adapters to use
    defaultAdapters: AdapterNameList

    /// Default log level
    defaultLevel: LogLevel = "INFO"
}

/// Configuration for agent-specific loggers
structure AgentLoggerConfig {
    /// Agent identifier
    @required
    agentId: String

    /// Agent type (observation, conversation, etc.)
    agentType: String

    /// Environment name
    environment: Environment = "dev"

    /// Enable emojis
    emojis: Boolean = true

    /// Additional context
    context: LoggingContext

    /// Adapters to use
    adapters: AdapterNameList

    /// Log level
    level: LogLevel = "INFO"
}

/// Configuration for infrastructure loggers
structure InfrastructureLoggerConfig {
    /// Stack name for infrastructure
    stackName: String

    /// Deployment identifier
    deploymentId: String

    /// Environment name
    environment: Environment = "dev"

    /// Enable emojis
    emojis: Boolean = false

    /// Additional context
    context: LoggingContext

    /// Adapters to use
    adapters: AdapterNameList

    /// Log level
    level: LogLevel = "INFO"
}

/// List of adapter names
list AdapterNameList {
    member: AdapterName
}

/// Supported adapter types
enum AdapterName {
    /// Console/stdout adapter
    CONSOLE = "console"

    /// File system adapter
    FILE = "file"

    /// Browser console adapter
    BROWSER = "browser"

    /// Browser localStorage adapter
    LOCAL_STORAGE = "localStorage"
}

// ========== Adapter Configuration Structures ==========

/// Console adapter configuration
structure ConsoleAdapterConfig {
    /// Enable colored output
    enableColors: Boolean = true

    /// Enable emoji prefixes
    enableEmojis: Boolean = false

    /// Timestamp format
    timestampFormat: TimestampFormat = "iso"

    /// Minimum log level
    logLevel: LogLevel = "INFO"

    /// Use stderr instead of stdout for output
    useStderr: Boolean = false
}

/// File adapter configuration
structure FileAdapterConfig {
    /// Path to log file
    @required
    filePath: String

    /// Enable colored output (usually false for files)
    enableColors: Boolean = false

    /// Enable emoji prefixes
    enableEmojis: Boolean = false

    /// Timestamp format
    timestampFormat: TimestampFormat = "iso"

    /// Minimum log level
    logLevel: LogLevel = "INFO"

    /// Enable file rotation
    rotationEnabled: Boolean = true

    /// Maximum file size in MB before rotation
    @range(min: 1, max: 1000)
    maxSizeMB: Integer = 50

    /// Maximum number of rotated files to keep
    @range(min: 1, max: 100)
    maxFiles: Integer = 10
}

/// Browser adapter configuration
structure BrowserAdapterConfig {
    /// Enable colored console output
    enableColors: Boolean = true

    /// Enable emoji prefixes
    enableEmojis: Boolean = true

    /// Timestamp format
    timestampFormat: TimestampFormat = "short"

    /// Minimum log level
    logLevel: LogLevel = "INFO"

    /// Use console.error for error levels
    useConsoleError: Boolean = true
}

/// LocalStorage adapter configuration
structure LocalStorageAdapterConfig {
    /// Storage key prefix
    storageKey: String = "artissist-logger"

    /// Enable emoji prefixes
    enableEmojis: Boolean = false

    /// Timestamp format
    timestampFormat: TimestampFormat = "iso"

    /// Minimum log level
    logLevel: LogLevel = "INFO"

    /// Maximum entries to store
    @range(min: 100, max: 10000)
    maxEntries: Integer = 1000
}

/// Timestamp formatting options
enum TimestampFormat {
    /// ISO 8601 format (2024-01-01T12:00:00.000Z)
    ISO = "iso"

    /// Short format (12:00:00)
    SHORT = "short"

    /// Relative format (2m ago)
    RELATIVE = "relative"

    /// No timestamp
    NONE = "none"
}

// ========== Emoji Mapping Structures ==========

/// Default emoji mappings for all log events
structure DefaultEmojiMappings {
    /// Mapping from log events to emoji configurations
    @required
    mappings: EmojiMappingMap
}

/// Map from log events to emoji configurations
map EmojiMappingMap {
    key: String  // LogEvent as string for extensibility
    value: EmojiMapping
}

/// Standard emoji mappings for log events
structure StandardEmojiMappings {
    /// Predefined emoji mappings
    @required
    mappings: EmojiMappingMap
}