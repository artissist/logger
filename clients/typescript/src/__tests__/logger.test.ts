// Unit tests for Logger error handling
import { Logger } from '../logger';
import { EmojiResolver } from '../emoji';
import type { LogAdapter, LogEntry } from '../types';

describe('Logger error handling', () => {
  let mockAdapter: LogAdapter;
  let loggedEntries: LogEntry[];

  beforeEach(() => {
    loggedEntries = [];
    mockAdapter = {
      write: jest.fn((entry: LogEntry) => {
        loggedEntries.push(entry);
      }),
    };
  });

  function createTestLogger(): Logger {
    return new Logger('test-service', 'test', new EmojiResolver(false), [mockAdapter]);
  }

  describe('error method with undefined error objects', () => {
    it('should handle undefined error gracefully', () => {
      const logger = createTestLogger();
      const undefinedError = undefined;

      expect(() => {
        logger.error('Failed to load observations', { error: undefinedError });
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Failed to load observations');
      // The error field should not be present when undefined
      expect(entry.error).toBeUndefined();
    });

    it('should handle null error gracefully', () => {
      const logger = createTestLogger();
      const nullError = null;

      expect(() => {
        logger.error('Failed to load observations', { error: nullError as any });
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Failed to load observations');
      // The error field should not be present when null
      expect(entry.error).toBeUndefined();
    });

    it('should handle empty object error gracefully', () => {
      const logger = createTestLogger();
      const emptyError = {};

      expect(() => {
        logger.error('Failed to load observations', { error: emptyError as any });
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Failed to load observations');
      // The error field should not be present when empty object without required fields
      expect(entry.error).toBeUndefined();
    });

    it('should include valid error objects', () => {
      const logger = createTestLogger();
      const validError = {
        type: 'TestError',
        message: 'Test error message',
        stackTrace: 'Error stack trace',
      };

      logger.error('Failed to load observations', { error: validError });

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Failed to load observations');
      expect(entry.error).toEqual(validError);
    });

    it('should handle Error instance and convert it to ErrorDetails', () => {
      const logger = createTestLogger();
      const jsError = new Error('JavaScript error');

      logger.error('Failed to load observations', { error: jsError as any });

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Failed to load observations');
      expect(entry.error).toBeDefined();
      expect(entry.error?.type).toBe('Error');
      expect(entry.error?.message).toBe('JavaScript error');
      expect(entry.error?.stackTrace).toBe(jsError.stack);
    });

    it('should handle partial error objects with required fields', () => {
      const logger = createTestLogger();
      const partialError = {
        type: 'ValidationError',
        message: 'Missing required field',
        // Missing optional fields like stackTrace, code, context
      };

      logger.error('Failed to load observations', { error: partialError });

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Failed to load observations');
      expect(entry.error).toEqual(partialError);
    });

    it('should handle string error by converting to ErrorDetails', () => {
      const logger = createTestLogger();
      const stringError = 'Something went wrong';

      logger.error('Failed to load observations', { error: stringError as any });

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Failed to load observations');
      expect(entry.error).toBeDefined();
      expect(entry.error?.type).toBe('Unknown');
      expect(entry.error?.message).toBe('Something went wrong');
    });
  });

  describe('other log levels with error objects', () => {
    it('should handle undefined error in warn level', () => {
      const logger = createTestLogger();

      expect(() => {
        logger.warn('Warning with undefined error', { error: undefined });
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('WARN');
      expect(entry.error).toBeUndefined();
    });

    it('should handle undefined error in info level', () => {
      const logger = createTestLogger();

      expect(() => {
        logger.info('Info with undefined error', { error: undefined });
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('INFO');
      expect(entry.error).toBeUndefined();
    });
  });

  describe('nullable field handling', () => {
    it('should accept LogEntry with null values for all fields', () => {
      const logger = createTestLogger();

      // This should compile and work since all fields are now nullable
      const nullableEntry: LogEntry = {
        logId: null,
        timestamp: null,
        level: null,
        message: null,
        service: null,
        environment: null,
        event: null,
        includeEmoji: null,
        context: null,
        metadata: null,
        metrics: null,
        error: null,
      };

      // The logger should still function with nullable fields in partial data
      expect(() => {
        logger.info('Test message', nullableEntry);
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];

      // The logger should still provide sensible defaults for core fields
      expect(entry.level).toBe('INFO');
      expect(entry.message).toBe('Test message');
      expect(entry.service).toBe('test-service');
      expect(entry.environment).toBe('test');
      expect(typeof entry.logId).toBe('string');
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('should accept LogEntry with undefined values for all fields', () => {
      const logger = createTestLogger();

      // This should compile and work since all fields are now nullable
      const undefinedEntry: LogEntry = {
        logId: undefined,
        timestamp: undefined,
        level: undefined,
        message: undefined,
        service: undefined,
        environment: undefined,
        event: undefined,
        includeEmoji: undefined,
        context: undefined,
        metadata: undefined,
        metrics: undefined,
        error: undefined,
      };

      expect(() => {
        logger.warn('Warning message', undefinedEntry);
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];

      // The logger should still provide sensible defaults for core fields
      expect(entry.level).toBe('WARN');
      expect(entry.message).toBe('Warning message');
      expect(entry.service).toBe('test-service');
      expect(entry.environment).toBe('test');
    });

    it('should accept empty LogEntry object', () => {
      const logger = createTestLogger();

      // This should compile now that all fields are optional
      const emptyEntry: LogEntry = {};

      expect(() => {
        logger.error('Error message', emptyEntry);
      }).not.toThrow();

      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];

      // The logger should still provide sensible defaults
      expect(entry.level).toBe('ERROR');
      expect(entry.message).toBe('Error message');
      expect(entry.service).toBe('test-service');
      expect(entry.environment).toBe('test');
    });
  });
});
