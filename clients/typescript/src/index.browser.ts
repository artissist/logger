// Browser-compatible entry point for Artissist Logger TypeScript client
// Excludes Node.js-only modules like FileAdapter

export * from './types';
export * from './context';
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
export { LoggerFactory } from './factory.browser';
export { Logger } from './logger';

// Export browser-compatible adapters only
export { ConsoleAdapter } from './adapters/console';

// Export context utilities
export { ContextManager, createCorrelationId } from './context';

// Export emoji utilities
export { EmojiResolver, EventEmojiMapping } from './emoji';
