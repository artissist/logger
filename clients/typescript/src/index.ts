// SPDX-License-Identifier: AGPL-3.0-or-later
// Main entry point for Mosaic Logger TypeScript client
export * from './factory';
export * from './types';
export * from './context';
export * from './adapters';
export * from './emoji';

// Export core types and interfaces
export type {
  LogLevel,
  LogEvent,
  LogEntry,
  LoggingContext,
  LogMetadata,
  PerformanceMetrics,
  ErrorDetails,
  EmojiMapping,
  CustomEventMap,
} from './types';

// Export factory and logger classes
export { LoggerFactory } from './factory';
export { Logger } from './logger';

// Export adapters
export { ConsoleAdapter } from './adapters/console';
export { FileAdapter } from './adapters/file';

// Export context utilities
export { ContextManager, createCorrelationId } from './context';

// Export emoji utilities
export { EmojiResolver, EventEmojiMapping } from './emoji';
