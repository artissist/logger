// Console adapter with emoji support for Mosaic Logger
import type {
  ErrorDetails,
  LogAdapter,
  LogEntry,
  LogLevel,
  LogMetadata,
  PerformanceMetrics,
} from '../types';
import { EmojiResolver } from '../emoji';

export interface ConsoleAdapterOptions {
  enableColors?: boolean;
  enableEmojis?: boolean;
  timestampFormat?: 'iso' | 'short' | 'relative';
  logLevel?: LogLevel;
  emojiResolver?: EmojiResolver;
}

/**
 * Console adapter that outputs log entries to the console with optional emoji and color support
 */
export class ConsoleAdapter implements LogAdapter {
  private options: Required<ConsoleAdapterOptions>;
  private emojiResolver: EmojiResolver;

  // ANSI color codes
  private static readonly COLORS = {
    TRACE: '\x1b[90m', // Gray
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m', // Green
    WARN: '\x1b[33m', // Yellow
    ERROR: '\x1b[31m', // Red
    FATAL: '\x1b[35m', // Magenta
    RESET: '\x1b[0m', // Reset
    BOLD: '\x1b[1m', // Bold
    DIM: '\x1b[2m', // Dim
  };

  private static readonly LOG_LEVEL_ORDER: Record<LogLevel, number> = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
  };

  constructor(options: ConsoleAdapterOptions = {}) {
    this.options = {
      enableColors: options.enableColors ?? true,
      enableEmojis: options.enableEmojis ?? false,
      timestampFormat: options.timestampFormat ?? 'iso',
      logLevel: options.logLevel ?? 'INFO',
      emojiResolver: options.emojiResolver ?? new EmojiResolver(options.enableEmojis ?? false),
    };

    this.emojiResolver = this.options.emojiResolver;
    this.emojiResolver.setEnabled(this.options.enableEmojis);
  }

  /**
   * Write a log entry to the console
   */
  write(entry: LogEntry): void {
    // Check if this log entry should be output based on log level
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formattedMessage = this.formatLogEntry(entry);

    // Choose appropriate console method based on log level
    switch (entry.level) {
      case 'TRACE':
      case 'DEBUG':
        // eslint-disable-next-line no-console
        console.debug(formattedMessage);
        break;
      case 'INFO':
        // eslint-disable-next-line no-console
        console.info(formattedMessage);
        break;
      case 'WARN':
        // eslint-disable-next-line no-console
        console.warn(formattedMessage);
        break;
      case 'ERROR':
      case 'FATAL':
        // eslint-disable-next-line no-console
        console.error(formattedMessage);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(formattedMessage);
    }
  }

  /**
   * Flush any buffered output (no-op for console)
   */
  async flush(): Promise<void> {
    // Console output is synchronous, no need to flush
  }

  /**
   * Close the adapter (no-op for console)
   */
  async close(): Promise<void> {
    // Nothing to close for console output
  }

  /**
   * Check if a log entry should be output based on the configured log level
   */
  private shouldLog(level: LogLevel): boolean {
    const entryLevelOrder = ConsoleAdapter.LOG_LEVEL_ORDER[level];
    const configuredLevelOrder = ConsoleAdapter.LOG_LEVEL_ORDER[this.options.logLevel];
    return entryLevelOrder >= configuredLevelOrder;
  }

  /**
   * Format a log entry for console output
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    const timestamp = this.formatTimestamp(entry.timestamp);
    if (this.options.enableColors) {
      parts.push(`${ConsoleAdapter.COLORS.DIM}${timestamp}${ConsoleAdapter.COLORS.RESET}`);
    } else {
      parts.push(timestamp);
    }

    // Log level with color
    const levelStr = this.formatLogLevel(entry.level);
    parts.push(levelStr);

    // Service name
    if (this.options.enableColors) {
      parts.push(`${ConsoleAdapter.COLORS.DIM}[${entry.service}]${ConsoleAdapter.COLORS.RESET}`);
    } else {
      parts.push(`[${entry.service}]`);
    }

    // Message with optional emoji
    let { message } = entry;
    if (this.options.enableEmojis && entry.event) {
      message = this.emojiResolver.formatMessage(message, entry.event);
    }

    // Add correlation ID if present
    if (entry.context?.correlationId) {
      if (this.options.enableColors) {
        message += ` ${ConsoleAdapter.COLORS.DIM}(${entry.context.correlationId})${ConsoleAdapter.COLORS.RESET}`;
      } else {
        message += ` (${entry.context.correlationId})`;
      }
    }

    parts.push(message);

    // Add error details if present
    if (entry.error) {
      parts.push(this.formatError(entry.error));
    }

    // Add performance metrics if present
    if (entry.metrics) {
      parts.push(this.formatMetrics(entry.metrics));
    }

    // Add metadata if present and not empty
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(this.formatMetadata(entry.metadata));
    }

    return parts.join(' ');
  }

  /**
   * Format timestamp according to the configured format
   */
  private formatTimestamp(timestamp: Date): string {
    switch (this.options.timestampFormat) {
      case 'iso':
        return timestamp.toISOString();
      case 'short':
        return timestamp.toLocaleTimeString();
      case 'relative': {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        return `+${diff}ms`;
      }
      default:
        return timestamp.toISOString();
    }
  }

  /**
   * Format log level with color
   */
  private formatLogLevel(level: LogLevel): string {
    const levelStr = level.padEnd(5); // Pad to consistent width

    if (!this.options.enableColors) {
      return `[${levelStr}]`;
    }

    const color = ConsoleAdapter.COLORS[level] || ConsoleAdapter.COLORS.RESET;
    return `${color}${ConsoleAdapter.COLORS.BOLD}[${levelStr}]${ConsoleAdapter.COLORS.RESET}`;
  }

  /**
   * Format error details
   */
  private formatError(error: ErrorDetails): string {
    let errorStr = '';

    if (this.options.enableColors) {
      errorStr += `${ConsoleAdapter.COLORS.ERROR}`;
    }

    errorStr += `ERROR: ${error.type}: ${error.message}`;

    if (error.code) {
      errorStr += ` (${error.code})`;
    }

    if (this.options.enableColors) {
      errorStr += ConsoleAdapter.COLORS.RESET;
    }

    // Add stack trace on new line if present
    if (error.stackTrace) {
      if (this.options.enableColors) {
        errorStr += `\n${ConsoleAdapter.COLORS.DIM}${error.stackTrace}${ConsoleAdapter.COLORS.RESET}`;
      } else {
        errorStr += `\n${error.stackTrace}`;
      }
    }

    return errorStr;
  }

  /**
   * Format performance metrics
   */
  private formatMetrics(metrics: PerformanceMetrics): string {
    const metricParts: string[] = [];

    if (metrics.durationMs !== undefined) {
      metricParts.push(`${metrics.durationMs}ms`);
    }
    if (metrics.memoryBytes !== undefined) {
      metricParts.push(`${Math.round(metrics.memoryBytes / 1024)}KB`);
    }
    if (metrics.cpuPercent !== undefined) {
      metricParts.push(`${metrics.cpuPercent.toFixed(1)}% CPU`);
    }

    if (metricParts.length === 0) {
      return '';
    }

    let metricsStr = `METRICS: ${metricParts.join(', ')}`;

    if (this.options.enableColors) {
      metricsStr = `${ConsoleAdapter.COLORS.DIM}${metricsStr}${ConsoleAdapter.COLORS.RESET}`;
    }

    return metricsStr;
  }

  /**
   * Format metadata
   */
  private formatMetadata(metadata: LogMetadata): string {
    const parts: string[] = [];

    if (metadata.component) {
      parts.push(`component=${metadata.component}`);
    }
    if (metadata.operation) {
      parts.push(`operation=${metadata.operation}`);
    }
    if (metadata.version) {
      parts.push(`version=${metadata.version}`);
    }
    if (metadata.tags && Object.keys(metadata.tags).length > 0) {
      const tagStr = Object.entries(metadata.tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      parts.push(`tags=[${tagStr}]`);
    }

    if (parts.length === 0) {
      return '';
    }

    let metadataStr = parts.join(' ');

    if (this.options.enableColors) {
      metadataStr = `${ConsoleAdapter.COLORS.DIM}${metadataStr}${ConsoleAdapter.COLORS.RESET}`;
    }

    return metadataStr;
  }

  /**
   * Update adapter options
   */
  updateOptions(options: Partial<ConsoleAdapterOptions>): void {
    this.options = { ...this.options, ...options };

    if (options.enableEmojis !== undefined) {
      this.emojiResolver.setEnabled(options.enableEmojis);
    }

    if (options.emojiResolver) {
      this.emojiResolver = options.emojiResolver;
    }
  }

  /**
   * Get current adapter options
   */
  getOptions(): Required<ConsoleAdapterOptions> {
    return { ...this.options };
  }
}
