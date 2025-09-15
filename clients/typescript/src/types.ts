// SPDX-License-Identifier: AGPL-3.0-or-later
// Type definitions for Artissist Logger TypeScript client
// Import and re-export ONLY generated Smithy types

// Create a more permissive partial type that allows null values for user convenience
type NullablePartial<T> = {
  [P in keyof T]?: T[P] | null;
};

// Import enums as values and types as types
import { LogEvent, LogLevel } from './generated-types';
import type {
  CustomEventMap,
  Document,
  EmojiMapping,
  Environment,
  ErrorContext,
  ErrorDetails,
  LogEntry,
  LogId,
  LogMetadata,
  LoggingContext,
  MetricsMap,
  PerformanceMetrics,
  RequestId,
  ServiceName,
  SessionId,
  TagMap,
  Timestamp,
  UserId,
} from './generated-types';

// Re-export everything
export { LogLevel, LogEvent };
export type {
  LogEntry,
  LoggingContext,
  LogMetadata,
  PerformanceMetrics,
  ErrorDetails,
  ErrorContext,
  EmojiMapping,
  CustomEventMap,
  TagMap,
  MetricsMap,
  ServiceName,
  Environment,
  LogId,
  UserId,
  SessionId,
  RequestId,
  Timestamp,
  Document,
};

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
  metadata(metadata: LogMetadata): LogEntryBuilder;
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
  trace(message: string, data?: NullablePartial<LogEntry>): void;
  debug(message: string, data?: NullablePartial<LogEntry>): void;
  info(message: string, data?: NullablePartial<LogEntry>): void;
  warn(message: string, data?: NullablePartial<LogEntry>): void;
  error(message: string, data?: NullablePartial<LogEntry>): void;
  fatal(message: string, data?: NullablePartial<LogEntry>): void;
  log(level: LogLevel, message: string, data?: NullablePartial<LogEntry>): void;
  child(context: Partial<LoggingContext>): Logger;
  flush(): Promise<void>;
}
