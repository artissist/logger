// Unit tests for Logger error handling
import { Logger } from '../logger';
import { EmojiResolver } from '../emoji';
import { ConsoleAdapter } from '../adapters/console';
import { FileAdapter } from '../adapters/file';
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

    it('should log entries with null level using method default level', () => {
      const logger = createTestLogger();

      logger.info('Info with null level', { level: null });
      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('INFO');
      expect(entry.message).toBe('Info with null level');
    });

    it('should log entries with undefined level using method default level', () => {
      const logger = createTestLogger();

      logger.warn('Warning with undefined level', { level: undefined });
      expect(loggedEntries).toHaveLength(1);
      const entry = loggedEntries[0];
      expect(entry.level).toBe('WARN');
      expect(entry.message).toBe('Warning with undefined level');
    });
  });

  describe('adapter filtering with null/undefined levels', () => {
    it('should reject entries with null level before fix', () => {
      // This test demonstrates what happened before the fix
      const consoleAdapter = new ConsoleAdapter({ logLevel: 'INFO' });

      const mockConsoleInfo = jest.fn();
      const originalConsoleInfo = console.info;
      console.info = mockConsoleInfo;

      // Create a log entry with null level directly
      const entryWithNullLevel = {
        logId: 'test_123',
        timestamp: new Date(),
        level: null, // This should now be handled gracefully
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        includeEmoji: false,
        context: {},
      };

      consoleAdapter.write(entryWithNullLevel);

      // Restore console.info
      console.info = originalConsoleInfo;

      // After the fix, the adapter should log the entry using default 'INFO' level
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should handle undefined level gracefully in ConsoleAdapter', () => {
      const consoleAdapter = new ConsoleAdapter({ logLevel: 'INFO' });

      const mockConsoleInfo = jest.fn();
      const originalConsoleInfo = console.info;
      console.info = mockConsoleInfo;

      // Create a log entry with undefined level
      const entryWithUndefinedLevel = {
        logId: 'test_123',
        timestamp: new Date(),
        level: undefined,
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        includeEmoji: false,
        context: {},
      };

      consoleAdapter.write(entryWithUndefinedLevel);

      // Restore console.info
      console.info = originalConsoleInfo;

      // After the fix, the adapter should log the entry using default 'INFO' level
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should handle null level gracefully in FileAdapter', () => {
      // Create a temporary file for testing
      const testFilePath = '/tmp/test.log';
      const fileAdapter = new FileAdapter({
        filePath: testFilePath,
        logLevel: 'INFO',
        bufferSize: 1, // Flush immediately for testing
      });

      // Create a log entry with null level
      const entryWithNullLevel = {
        logId: 'test_123',
        timestamp: new Date(),
        level: null,
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        includeEmoji: false,
        context: {},
      };

      // This should not throw and should write to the buffer
      expect(() => {
        fileAdapter.write(entryWithNullLevel);
      }).not.toThrow();

      // Clean up
      void fileAdapter.close();
    });

    it('should handle all nullable fields in ConsoleAdapter', () => {
      const consoleAdapter = new ConsoleAdapter({ logLevel: 'INFO' });

      const mockConsoleInfo = jest.fn();
      const originalConsoleInfo = console.info;
      console.info = mockConsoleInfo;

      // Create a log entry with ALL fields null or undefined to test complete nullable handling
      const entryWithAllNullFields = {
        logId: null,
        timestamp: null,
        level: null, // This should default to 'INFO'
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

      // This should not throw and should write using defaults
      expect(() => {
        consoleAdapter.write(entryWithAllNullFields);
      }).not.toThrow();

      // Restore console.info
      console.info = originalConsoleInfo;

      // Should have been called (logged)
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should handle all undefined fields in FileAdapter', () => {
      // Create a temporary file for testing
      const testFilePath = '/tmp/test_all_undefined.log';
      const fileAdapter = new FileAdapter({
        filePath: testFilePath,
        logLevel: 'INFO',
        bufferSize: 1, // Flush immediately for testing
      });

      // Create a log entry with ALL fields undefined to test complete nullable handling
      const entryWithAllUndefinedFields = {
        logId: undefined,
        timestamp: undefined,
        level: undefined, // This should default to 'INFO'
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

      // This should not throw and should write using defaults
      expect(() => {
        fileAdapter.write(entryWithAllUndefinedFields);
      }).not.toThrow();

      // Clean up
      void fileAdapter.close();
    });

    it('should respect entry.includeEmoji when set to false even if adapter has emojis enabled', () => {
      const consoleAdapter = new ConsoleAdapter({
        logLevel: 'INFO',
        enableEmojis: true, // Adapter has emojis enabled
      });

      const mockConsoleInfo = jest.fn();
      const originalConsoleInfo = console.info;
      console.info = mockConsoleInfo;

      // Create a log entry that explicitly disables emojis for this entry
      const entryWithEmojiDisabled = {
        logId: 'test_123',
        timestamp: new Date(),
        level: 'INFO' as const,
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        event: 'USER_AUTH' as const,
        includeEmoji: false, // Entry explicitly disables emojis
        context: {},
      };

      consoleAdapter.write(entryWithEmojiDisabled);

      // Restore console.info
      console.info = originalConsoleInfo;

      // Should have been called
      expect(mockConsoleInfo).toHaveBeenCalled();

      // Message should not contain emoji even though adapter has emojis enabled
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).not.toMatch(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
      );
    });

    it('should respect entry.includeEmoji when set to true even if adapter has emojis disabled', () => {
      const consoleAdapter = new ConsoleAdapter({
        logLevel: 'INFO',
        enableEmojis: false, // Adapter has emojis disabled
      });

      const mockConsoleInfo = jest.fn();
      const originalConsoleInfo = console.info;
      console.info = mockConsoleInfo;

      // Create a log entry that explicitly enables emojis for this entry
      const entryWithEmojiEnabled = {
        logId: 'test_123',
        timestamp: new Date(),
        level: 'INFO' as const,
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        event: 'USER_AUTH' as const,
        includeEmoji: true, // Entry explicitly enables emojis
        context: {},
      };

      consoleAdapter.write(entryWithEmojiEnabled);

      // Restore console.info
      console.info = originalConsoleInfo;

      // Should have been called
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should fall back to adapter emoji setting when entry.includeEmoji is null', () => {
      const consoleAdapter = new ConsoleAdapter({
        logLevel: 'INFO',
        enableEmojis: true, // Adapter has emojis enabled
      });

      const mockConsoleInfo = jest.fn();
      const originalConsoleInfo = console.info;
      console.info = mockConsoleInfo;

      // Create a log entry with null includeEmoji - should use adapter setting
      const entryWithNullEmoji = {
        logId: 'test_123',
        timestamp: new Date(),
        level: 'INFO' as const,
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        event: 'USER_AUTH' as const,
        includeEmoji: null, // Entry doesn't specify, should use adapter setting
        context: {},
      };

      consoleAdapter.write(entryWithNullEmoji);

      // Restore console.info
      console.info = originalConsoleInfo;

      // Should have been called and should use adapter's emoji setting (enabled)
      expect(mockConsoleInfo).toHaveBeenCalled();
    });

    it('should fall back to adapter emoji setting when entry.includeEmoji is undefined', () => {
      const consoleAdapter = new ConsoleAdapter({
        logLevel: 'INFO',
        enableEmojis: false, // Adapter has emojis disabled
      });

      const mockConsoleInfo = jest.fn();
      const originalConsoleInfo = console.info;
      console.info = mockConsoleInfo;

      // Create a log entry with undefined includeEmoji - should use adapter setting
      const entryWithUndefinedEmoji = {
        logId: 'test_123',
        timestamp: new Date(),
        level: 'INFO' as const,
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        event: 'USER_AUTH' as const,
        includeEmoji: undefined, // Entry doesn't specify, should use adapter setting
        context: {},
      };

      consoleAdapter.write(entryWithUndefinedEmoji);

      // Restore console.info
      console.info = originalConsoleInfo;

      // Should have been called and should use adapter's emoji setting (disabled)
      expect(mockConsoleInfo).toHaveBeenCalled();

      // Message should not contain emoji since adapter has emojis disabled
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).not.toMatch(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u
      );
    });

    it('should respect entry.includeEmoji in FileAdapter', () => {
      // Create a temporary file for testing
      const testFilePath = '/tmp/test_emoji.log';
      const fileAdapter = new FileAdapter({
        filePath: testFilePath,
        logLevel: 'INFO',
        enableEmojis: true, // Adapter has emojis enabled
        bufferSize: 1, // Flush immediately for testing
      });

      // Create a log entry that explicitly disables emojis for this entry
      const entryWithEmojiDisabled = {
        logId: 'test_123',
        timestamp: new Date(),
        level: 'INFO' as const,
        message: 'Test message',
        service: 'test-service',
        environment: 'test',
        event: 'USER_AUTH' as const,
        includeEmoji: false, // Entry explicitly disables emojis
        context: {},
      };

      // This should not throw and should respect the entry's emoji setting
      expect(() => {
        fileAdapter.write(entryWithEmojiDisabled);
      }).not.toThrow();

      // Clean up
      void fileAdapter.close();
    });
  });
});
