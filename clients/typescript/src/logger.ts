// Core Logger class for Mosaic Logger
import { 
    Logger as ILogger, 
    LogEntry, 
    LogLevel, 
    LogEvent, 
    LoggingContext, 
    LogMetadata, 
    PerformanceMetrics, 
    ErrorDetails,
    LogAdapter 
} from './types';
import { EmojiResolver } from './emoji';
import { ContextManager, createCorrelationId } from './context';

/**
 * Core Logger implementation with emoji support and context management
 */
export class Logger implements ILogger {
    private service: string;
    private environment: string;
    private emojiResolver: EmojiResolver;
    private contextManager: ContextManager;
    private adapters: LogAdapter[];
    private baseContext: Partial<LoggingContext>;

    constructor(
        service: string,
        environment: string,
        emojiResolver: EmojiResolver,
        adapters: LogAdapter[],
        baseContext: Partial<LoggingContext> = {}
    ) {
        this.service = service;
        this.environment = environment;
        this.emojiResolver = emojiResolver;
        this.adapters = adapters;
        this.baseContext = baseContext;
        this.contextManager = new ContextManager();
        
        // Set initial context
        if (Object.keys(baseContext).length > 0) {
            this.contextManager.setContext(baseContext);
        }
    }

    /**
     * Log a trace level message
     */
    trace(message: string, data?: Partial<LogEntry>): void {
        this.log('TRACE', message, data);
    }

    /**
     * Log a debug level message
     */
    debug(message: string, data?: Partial<LogEntry>): void {
        this.log('DEBUG', message, data);
    }

    /**
     * Log an info level message
     */
    info(message: string, data?: Partial<LogEntry>): void {
        this.log('INFO', message, data);
    }

    /**
     * Log a warn level message
     */
    warn(message: string, data?: Partial<LogEntry>): void {
        this.log('WARN', message, data);
    }

    /**
     * Log an error level message
     */
    error(message: string, data?: Partial<LogEntry>): void {
        this.log('ERROR', message, data);
    }

    /**
     * Log a fatal level message
     */
    fatal(message: string, data?: Partial<LogEntry>): void {
        this.log('FATAL', message, data);
    }

    /**
     * Log a message at the specified level
     */
    log(level: LogLevel, message: string, data?: Partial<LogEntry>): void {
        const entry = this.createLogEntry(level, message, data);
        this.writeToAdapters(entry);
    }

    /**
     * Create a child logger with additional context
     */
    child(context: Partial<LoggingContext>): Logger {
        const mergedContext = { ...this.baseContext, ...context };
        const childLogger = new Logger(
            this.service,
            this.environment,
            this.emojiResolver,
            this.adapters,
            mergedContext
        );
        return childLogger;
    }

    /**
     * Flush all adapters
     */
    async flush(): Promise<void> {
        const flushPromises = this.adapters
            .filter(adapter => adapter.flush)
            .map(adapter => adapter.flush!());
        
        await Promise.all(flushPromises);
    }

    /**
     * Create a complete log entry
     */
    private createLogEntry(level: LogLevel, message: string, data?: Partial<LogEntry>): LogEntry {
        const timestamp = new Date();
        const logId = this.generateLogId();
        const currentContext = this.contextManager.getContext();

        // Merge contexts: base -> current -> data.context
        const context: LoggingContext = {
            ...this.baseContext,
            ...currentContext,
            ...(data?.context || {})
        };

        // Ensure we have a correlation ID
        if (!context.correlationId) {
            context.correlationId = createCorrelationId();
        }

        const entry: LogEntry = {
            logId,
            timestamp,
            level,
            message,
            service: this.service,
            environment: this.environment,
            includeEmoji: this.emojiResolver.isEnabled(),
            context,
            ...(data?.event && { event: data.event }),
            ...(data?.metadata && { metadata: data.metadata }),
            ...(data?.metrics && { metrics: data.metrics }),
            ...(data?.error && { error: data.error })
        };

        return entry;
    }

    /**
     * Generate a unique log ID
     */
    private generateLogId(): string {
        // Generate log ID in format: log_<32 hex chars>
        const chars = '0123456789abcdef';
        let result = 'log_';
        for (let i = 0; i < 32; i++) {
            result += chars[Math.floor(Math.random() * 16)];
        }
        return result;
    }

    /**
     * Write log entry to all adapters
     */
    private writeToAdapters(entry: LogEntry): void {
        this.adapters.forEach(adapter => {
            try {
                adapter.write(entry);
            } catch (error) {
                // Don't let adapter errors break logging
                console.error('Logger adapter error:', error);
            }
        });
    }

    /**
     * Get current context
     */
    getContext(): LoggingContext {
        return this.contextManager.getContext();
    }

    /**
     * Set context for this logger
     */
    setContext(context: Partial<LoggingContext>): void {
        this.contextManager.setContext(context);
    }

    /**
     * Get service name
     */
    getService(): string {
        return this.service;
    }

    /**
     * Get environment
     */
    getEnvironment(): string {
        return this.environment;
    }

    /**
     * Check if emojis are enabled
     */
    isEmojisEnabled(): boolean {
        return this.emojiResolver.isEnabled();
    }

    /**
     * Enable or disable emojis
     */
    setEmojisEnabled(enabled: boolean): void {
        this.emojiResolver.setEnabled(enabled);
    }

    /**
     * Get the emoji resolver
     */
    getEmojiResolver(): EmojiResolver {
        return this.emojiResolver;
    }

    /**
     * Close the logger and clean up resources
     */
    async close(): Promise<void> {
        // Flush all adapters first
        await this.flush();

        // Close adapters that support it
        const closePromises = this.adapters
            .filter(adapter => adapter.close)
            .map(adapter => adapter.close!());
        
        await Promise.all(closePromises);
    }
}