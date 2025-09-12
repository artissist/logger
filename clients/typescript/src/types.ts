// Type definitions for Mosaic Logger TypeScript client
// These types mirror the Smithy model definitions

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export type LogEvent =
  | 'SYSTEM_START'
  | 'SYSTEM_STOP'
  | 'USER_AUTH'
  | 'USER_AUTHZ'
  | 'PROJECT_LIFECYCLE'
  | 'DATABASE_OPERATION'
  | 'API_REQUEST'
  | 'PERFORMANCE_METRIC'
  | 'ERROR_OCCURRED'
  | 'WARNING_ISSUED'
  | 'CONFIG_CHANGE'
  | 'ANALYTICS_EVENT'
  | 'AGENT_PROCESSING'
  | 'CONVERSATION_EVENT'
  | 'ASSET_PROCESSING'
  | 'INSPIRATION_EVENT'
  | 'INFRASTRUCTURE_DEPLOY'
  | 'BUSINESS_METRIC'
  | 'SEARCH_OPERATION'
  | 'BACKGROUND_JOB'
  | 'NOTIFICATION_SENT'
  | 'SECURITY_EVENT'
  | 'SCHEDULED_TASK'
  | 'EXTERNAL_SERVICE'
  | 'AUDIT_TRAIL';

export interface LogEntry {
  logId?: string | null;
  timestamp?: Date | null;
  level?: LogLevel | null;
  message?: string | null;
  service?: string | null;
  environment?: string | null;
  event?: LogEvent | null;
  includeEmoji?: boolean | null;
  context?: LoggingContext | null;
  metadata?: LogMetadata | null;
  metrics?: PerformanceMetrics | null;
  error?: ErrorDetails | null;
}

export interface LoggingContext {
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  parentCorrelationId?: string;
}

export interface LogMetadata {
  tags?: Record<string, string>;
  data?: unknown;
  component?: string;
  operation?: string;
  version?: string;
  customEventMappings?: CustomEventMap;
}

export interface PerformanceMetrics {
  durationMs?: number;
  memoryBytes?: number;
  cpuPercent?: number;
  counters?: Record<string, number>;
}

export interface ErrorDetails {
  type: string;
  message: string;
  stackTrace?: string;
  code?: string;
  context?: ErrorContext;
}

export interface ErrorContext {
  file?: string;
  line?: number;
  function?: string;
  data?: unknown;
}

export interface EmojiMapping {
  emoji: string;
  description: string;
  isDefault?: boolean;
}

export type CustomEventMap = Record<string, EmojiMapping>;

// Logger configuration interfaces
export interface LoggerConfig {
  service?: string;
  environment?: string;
  emojis?: boolean;
  context?: Partial<LoggingContext>;
  adapters?: string[];
  level?: LogLevel;
}

export interface AdapterConfig {
  type: string;
  options?: Record<string, unknown>;
}

// Adapter interface
export interface LogAdapter {
  write(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void> | void;
  close?(): Promise<void> | void;
}

// Log entry builder interface
export interface LogEntryBuilder {
  level(level: LogLevel): LogEntryBuilder;
  message(message: string): LogEntryBuilder;
  event(event: LogEvent): LogEntryBuilder;
  context(context: Partial<LoggingContext>): LogEntryBuilder;
  metadata(metadata: Partial<LogMetadata>): LogEntryBuilder;
  metrics(metrics: Partial<PerformanceMetrics>): LogEntryBuilder;
  error(error: Partial<ErrorDetails>): LogEntryBuilder;
  tags(tags: Record<string, string>): LogEntryBuilder;
  tag(key: string, value: string): LogEntryBuilder;
  build(): LogEntry;
  log(): void;
}

// Factory interfaces
export interface LoggerFactoryConfig {
  defaultService?: string;
  defaultEnvironment?: string;
  defaultEmojis?: boolean;
  defaultAdapters?: string[];
  defaultLevel?: LogLevel;
}

export interface Logger {
  trace(message: string, data?: Partial<LogEntry>): void;
  debug(message: string, data?: Partial<LogEntry>): void;
  info(message: string, data?: Partial<LogEntry>): void;
  warn(message: string, data?: Partial<LogEntry>): void;
  error(message: string, data?: Partial<LogEntry>): void;
  fatal(message: string, data?: Partial<LogEntry>): void;
  log(level: LogLevel, message: string, data?: Partial<LogEntry>): void;
  child(context: Partial<LoggingContext>): Logger;
  flush(): Promise<void>;
}
