// Context management utilities for distributed tracing and correlation
import type { LoggingContext } from './types';

/**
 * Generate a new correlation ID using UUID v4 format
 */
export function createCorrelationId(): string {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a trace ID (32 hex characters for OpenTelemetry compatibility)
 */
export function createTraceId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

/**
 * Generate a span ID (16 hex characters for OpenTelemetry compatibility)
 */
export function createSpanId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

/**
 * Context manager for handling correlation IDs and distributed tracing context
 */
export class ContextManager {
  private currentContext: LoggingContext = {};
  private contextStack: LoggingContext[] = [];

  /**
   * Set the current logging context
   */
  setContext(context: Partial<LoggingContext>): void {
    this.currentContext = { ...this.currentContext, ...context };
  }

  /**
   * Get the current logging context
   */
  getContext(): LoggingContext {
    return { ...this.currentContext };
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    this.currentContext = {};
  }

  /**
   * Push the current context onto the stack and start a new context
   * Useful for nested operations
   */
  pushContext(newContext: Partial<LoggingContext> = {}): void {
    this.contextStack.push({ ...this.currentContext });
    this.currentContext = {
      ...this.currentContext,
      ...newContext,
      parentCorrelationId: this.currentContext.correlationId,
    };
  }

  /**
   * Pop the previous context from the stack
   */
  popContext(): LoggingContext | undefined {
    const previousContext = this.contextStack.pop();
    if (previousContext) {
      this.currentContext = previousContext;
    }
    return previousContext;
  }

  /**
   * Create a new context with automatic correlation ID generation
   */
  createNewContext(baseContext: Partial<LoggingContext> = {}): LoggingContext {
    return {
      correlationId: createCorrelationId(),
      traceId: createTraceId(),
      spanId: createSpanId(),
      ...baseContext,
    };
  }

  /**
   * Create a child context that inherits from the current context
   */
  createChildContext(additionalContext: Partial<LoggingContext> = {}): LoggingContext {
    return {
      ...this.currentContext,
      spanId: createSpanId(), // New span for child operation
      parentCorrelationId: this.currentContext.correlationId,
      ...additionalContext,
    };
  }

  /**
   * Merge contexts with priority to the second context
   */
  static mergeContexts(
    context1: LoggingContext,
    context2: Partial<LoggingContext>
  ): LoggingContext {
    return { ...context1, ...context2 };
  }

  /**
   * Extract context from HTTP headers (common patterns)
   */
  static extractFromHeaders(headers: Record<string, string>): Partial<LoggingContext> {
    const context: Partial<LoggingContext> = {};

    // Common header patterns
    if (headers['x-correlation-id']) {
      context.correlationId = headers['x-correlation-id'];
    }
    if (headers['x-trace-id']) {
      context.traceId = headers['x-trace-id'];
    }
    if (headers['x-span-id']) {
      context.spanId = headers['x-span-id'];
    }
    if (headers['x-request-id']) {
      context.requestId = headers['x-request-id'];
    }
    if (headers['x-user-id']) {
      context.userId = headers['x-user-id'];
    }
    if (headers['x-session-id']) {
      context.sessionId = headers['x-session-id'];
    }

    return context;
  }

  /**
   * Convert context to HTTP headers for propagation
   */
  static toHeaders(context: LoggingContext): Record<string, string> {
    const headers: Record<string, string> = {};

    if (context.correlationId) {
      headers['x-correlation-id'] = context.correlationId;
    }
    if (context.traceId) {
      headers['x-trace-id'] = context.traceId;
    }
    if (context.spanId) {
      headers['x-span-id'] = context.spanId;
    }
    if (context.requestId) {
      headers['x-request-id'] = context.requestId;
    }
    if (context.userId) {
      headers['x-user-id'] = context.userId;
    }
    if (context.sessionId) {
      headers['x-session-id'] = context.sessionId;
    }

    return headers;
  }

  /**
   * Validate correlation ID format (UUID v4)
   */
  static isValidCorrelationId(correlationId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(correlationId);
  }

  /**
   * Validate trace ID format (32 hex characters)
   */
  static isValidTraceId(traceId: string): boolean {
    const traceIdRegex = /^[0-9a-f]{32}$/i;
    return traceIdRegex.test(traceId);
  }

  /**
   * Validate span ID format (16 hex characters)
   */
  static isValidSpanId(spanId: string): boolean {
    const spanIdRegex = /^[0-9a-f]{16}$/i;
    return spanIdRegex.test(spanId);
  }

  /**
   * Sanitize context by removing invalid fields
   */
  static sanitizeContext(context: LoggingContext): LoggingContext {
    const sanitized: LoggingContext = {};

    if (context.correlationId && ContextManager.isValidCorrelationId(context.correlationId)) {
      sanitized.correlationId = context.correlationId;
    }
    if (context.traceId && ContextManager.isValidTraceId(context.traceId)) {
      sanitized.traceId = context.traceId;
    }
    if (context.spanId && ContextManager.isValidSpanId(context.spanId)) {
      sanitized.spanId = context.spanId;
    }
    if (context.userId) {
      sanitized.userId = context.userId;
    }
    if (context.sessionId) {
      sanitized.sessionId = context.sessionId;
    }
    if (context.requestId) {
      sanitized.requestId = context.requestId;
    }
    if (
      context.parentCorrelationId &&
      ContextManager.isValidCorrelationId(context.parentCorrelationId)
    ) {
      sanitized.parentCorrelationId = context.parentCorrelationId;
    }

    return sanitized;
  }
}

/**
 * Global context manager instance
 */
export const globalContextManager = new ContextManager();

/**
 * Utility function to run a function with a specific context
 */
export async function withContext<T>(
  context: Partial<LoggingContext>,
  fn: (context: LoggingContext) => Promise<T> | T
): Promise<T> {
  globalContextManager.pushContext(context);
  try {
    const result = await fn(globalContextManager.getContext());
    return result;
  } finally {
    globalContextManager.popContext();
  }
}

/**
 * Decorator for automatically adding correlation context to functions
 */
export function withCorrelation(
  _target: any,
  _propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const context = globalContextManager.createNewContext();
    return withContext(context, () => method.apply(this, args));
  };

  return descriptor;
}

/**
 * Create context from environment variables (for serverless/container environments)
 */
export function createContextFromEnv(): Partial<LoggingContext> {
  const context: Partial<LoggingContext> = {};

  if (process.env.CORRELATION_ID) {
    context.correlationId = process.env.CORRELATION_ID;
  }
  if (process.env.TRACE_ID) {
    context.traceId = process.env.TRACE_ID;
  }
  if (process.env.SPAN_ID) {
    context.spanId = process.env.SPAN_ID;
  }
  if (process.env.USER_ID) {
    context.userId = process.env.USER_ID;
  }
  if (process.env.SESSION_ID) {
    context.sessionId = process.env.SESSION_ID;
  }
  if (process.env.REQUEST_ID) {
    context.requestId = process.env.REQUEST_ID;
  }

  return context;
}
