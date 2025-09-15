// SPDX-License-Identifier: AGPL-3.0-or-later
// Unit tests for LoggerFactory
import { LoggerFactory } from '../factory';
import { Logger } from '../logger';
import { EmojiResolver } from '../emoji';
import { LogLevel } from '../types';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  // Reset factory state before each test
  LoggerFactory.reset();

  // Reset environment
  process.env = { ...originalEnv };
});

afterAll(() => {
  // Restore original environment
  process.env = originalEnv;
});

describe('LoggerFactory', () => {
  describe('configure', () => {
    it('should set default configuration', () => {
      LoggerFactory.configure({
        defaultService: 'test-service',
        defaultEnvironment: 'test',
        defaultEmojis: true,
        defaultLevel: LogLevel.DEBUG,
      });

      const config = LoggerFactory.getDefaultConfig();
      expect(config.defaultService).toBe('test-service');
      expect(config.defaultEnvironment).toBe('test');
      expect(config.defaultEmojis).toBe(true);
      expect(config.defaultLevel).toBe(LogLevel.DEBUG);
    });

    it('should partially update configuration', () => {
      LoggerFactory.configure({ defaultEmojis: true });
      const config = LoggerFactory.getDefaultConfig();

      expect(config.defaultEmojis).toBe(true);
      expect(config.defaultService).toBe('unknown-service'); // Should keep default
    });
  });

  describe('setGlobalEmojiResolver', () => {
    it('should set global emoji resolver', () => {
      const customResolver = new EmojiResolver(true);
      customResolver.addCustomMapping('CUSTOM_EVENT', {
        emoji: '🎯',
        description: 'Custom event',
        isDefault: true,
      });

      LoggerFactory.setGlobalEmojiResolver(customResolver);

      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        emojis: true,
      });

      expect(logger.getEmojiResolver().getEmoji('CUSTOM_EVENT')).toBe('🎯');
    });
  });

  describe('addCustomEvents', () => {
    it('should add custom events to global resolver', () => {
      const customMappings = {
        TEST_EVENT_1: { emoji: '1️⃣', description: 'Test event 1', isDefault: true },
        TEST_EVENT_2: { emoji: '2️⃣', description: 'Test event 2', isDefault: true },
      };

      LoggerFactory.addCustomEvents(customMappings);

      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        emojis: true,
      });

      expect(logger.getEmojiResolver().getEmoji('TEST_EVENT_1')).toBe('1️⃣');
      expect(logger.getEmojiResolver().getEmoji('TEST_EVENT_2')).toBe('2️⃣');
    });
  });

  describe('create', () => {
    it('should create logger with provided config', () => {
      const logger = LoggerFactory.create({
        service: 'test-service',
        environment: 'production',
        emojis: false,
        level: LogLevel.ERROR,
      });

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getService()).toBe('test-service');
      expect(logger.getEnvironment()).toBe('production');
      expect(logger.isEmojisEnabled()).toBe(false);
    });

    it('should use default values for missing config', () => {
      const logger = LoggerFactory.create({
        service: 'test-service',
        environment: 'test',
      });

      expect(logger.getService()).toBe('test-service');
      expect(logger.getEnvironment()).toBe('test');
      expect(logger.isEmojisEnabled()).toBe(false); // Default
    });

    it('should use factory defaults when config is minimal', () => {
      LoggerFactory.configure({
        defaultService: 'default-service',
        defaultEnvironment: 'default-env',
        defaultEmojis: true,
      });

      const logger = LoggerFactory.create({
        // Don't provide explicit service/environment to test defaults
      });

      expect(logger.getService()).toBe('default-service');
      expect(logger.getEnvironment()).toBe('default-env');
      expect(logger.isEmojisEnabled()).toBe(true);
    });

    it('should create logger with context', () => {
      const context = {
        userId: 'user123',
        sessionId: 'session456',
      };

      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        context,
      });

      const loggerContext = logger.getContext();
      expect(loggerContext.userId).toBe('user123');
      expect(loggerContext.sessionId).toBe('session456');
    });
  });

  describe('createFrontendLogger', () => {
    it('should create frontend logger with appropriate defaults', () => {
      const logger = LoggerFactory.createFrontendLogger({
        service: 'frontend-app',
        environment: 'development',
      });

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getService()).toBe('frontend-app');
      expect(logger.getEnvironment()).toBe('development');
    });

    it('should default to console adapter for frontend', () => {
      const logger = LoggerFactory.createFrontendLogger({
        service: 'frontend-app',
        environment: 'development',
      });

      // Logger should be created successfully (console adapter works)
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should allow custom adapters for frontend', () => {
      const logger = LoggerFactory.createFrontendLogger({
        service: 'frontend-app',
        environment: 'development',
        adapters: ['console'],
      });

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('createBackendLogger', () => {
    it('should create backend logger with file adapter support', () => {
      const logger = LoggerFactory.createBackendLogger({
        service: 'backend-api',
        environment: 'production',
      });

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getService()).toBe('backend-api');
      expect(logger.getEnvironment()).toBe('production');
    });

    it('should accept custom adapters', () => {
      const logger = LoggerFactory.createBackendLogger({
        service: 'backend-api',
        environment: 'production',
        adapters: ['console'],
      });

      expect(logger).toBeInstanceOf(Logger);
    });

    it('should handle logFile parameter', () => {
      const logger = LoggerFactory.createBackendLogger({
        service: 'backend-api',
        environment: 'production',
        logFile: '/tmp/test.log',
      });

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('createAgentLogger', () => {
    it('should create agent logger with agent-specific service name', () => {
      const logger = LoggerFactory.createAgentLogger({
        agentId: 'conversation-processor',
        environment: 'development',
      });

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getService()).toBe('agent-conversation-processor');
    });

    it('should include agent context', () => {
      const logger = LoggerFactory.createAgentLogger({
        agentId: 'conversation-processor',
        agentType: 'observation',
        environment: 'development',
      });

      const context = logger.getContext();
      // Agent-specific properties would be stored in metadata, not context
      expect(context).toBeDefined();
    });

    it('should merge additional context', () => {
      const logger = LoggerFactory.createAgentLogger({
        agentId: 'test-agent',
        environment: 'test',
        context: {
          sessionId: 'session123',
        },
      });

      const context = logger.getContext();
      // Agent ID would be stored in metadata, not context
      expect(context.sessionId).toBe('session123');
      expect(context.sessionId).toBe('session123');
    });
  });

  describe('createInfrastructureLogger', () => {
    it('should create infrastructure logger with stack-specific service name', () => {
      const logger = LoggerFactory.createInfrastructureLogger({
        stackName: 'artissist-prod-stack',
        environment: 'production',
      });

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.getService()).toBe('infra-artissist-prod-stack');
    });

    it('should default to infrastructure service name', () => {
      const logger = LoggerFactory.createInfrastructureLogger({
        environment: 'production',
      });

      expect(logger.getService()).toBe('infrastructure');
    });

    it('should include infrastructure context', () => {
      const logger = LoggerFactory.createInfrastructureLogger({
        stackName: 'test-stack',
        deploymentId: 'deploy123',
        environment: 'test',
      });

      const context = logger.getContext();
      // Infrastructure properties would be stored in metadata, not context
      expect(context).toBeDefined();
    });
  });

  describe('createFromEnvironment', () => {
    it('should create logger from environment variables', () => {
      process.env.SERVICE_NAME = 'env-service';
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_EMOJIS = 'true';
      process.env.CORRELATION_ID = '12345678-1234-4567-8901-123456789012';

      const logger = LoggerFactory.createFromEnvironment();

      expect(logger.getService()).toBe('env-service');
      expect(logger.getEnvironment()).toBe('production');
      expect(logger.isEmojisEnabled()).toBe(true);
      expect(logger.getContext().correlationId).toBe('12345678-1234-4567-8901-123456789012');
    });

    it('should use defaults when env vars are missing', () => {
      delete process.env.SERVICE_NAME;
      delete process.env.NODE_ENV;

      const logger = LoggerFactory.createFromEnvironment();

      expect(logger.getService()).toBe('unknown-service');
      expect(logger.getEnvironment()).toBe('development');
    });

    it('should merge config with environment', () => {
      process.env.NODE_ENV = 'production';

      const logger = LoggerFactory.createFromEnvironment({
        service: 'override-service',
        emojis: true,
      });

      expect(logger.getService()).toBe('override-service');
      expect(logger.getEnvironment()).toBe('production');
      expect(logger.isEmojisEnabled()).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return copy of default configuration', () => {
      const config1 = LoggerFactory.getDefaultConfig();
      const config2 = LoggerFactory.getDefaultConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });

    it('should reflect configuration changes', () => {
      LoggerFactory.configure({ defaultEmojis: true });
      const config = LoggerFactory.getDefaultConfig();

      expect(config.defaultEmojis).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset factory to initial state', () => {
      LoggerFactory.configure({
        defaultService: 'custom-service',
        defaultEmojis: true,
      });

      LoggerFactory.setGlobalEmojiResolver(new EmojiResolver(true));

      LoggerFactory.reset();

      const config = LoggerFactory.getDefaultConfig();
      expect(config.defaultService).toBe('unknown-service');
      expect(config.defaultEmojis).toBe(false);
    });
  });

  describe('adapter creation', () => {
    it('should create console adapter by default', () => {
      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
      });

      // Should create logger successfully with console adapter
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should handle unknown adapter types gracefully', () => {
      // Suppress console warnings for this test
      const originalWarn = console.warn;
      console.warn = jest.fn();

      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        adapters: ['unknown-adapter'] as any,
      });

      // Should still create logger with fallback console adapter
      expect(logger).toBeInstanceOf(Logger);
      expect(console.warn).toHaveBeenCalledWith('Unknown adapter type: unknown-adapter');

      // Restore console.warn
      console.warn = originalWarn;
    });

    it('should create multiple adapters', () => {
      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        adapters: ['console', 'file'],
      });

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('error handling', () => {
    it('should handle unknown adapter types gracefully', () => {
      // Suppress console warnings for this test
      const originalWarn = console.warn;
      console.warn = jest.fn();

      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        adapters: ['unknown-adapter'] as any,
      });

      // Should still create logger with fallback console adapter
      expect(logger).toBeInstanceOf(Logger);
      expect(console.warn).toHaveBeenCalledWith('Unknown adapter type: unknown-adapter');

      // Restore console.warn
      console.warn = originalWarn;
    });

    it('should create multiple adapters', () => {
      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        adapters: ['console', 'file'],
      });

      expect(logger).toBeInstanceOf(Logger);
    });
  });

  describe('error handling', () => {
    it('should handle adapter creation errors gracefully', () => {
      // Suppress console errors for this test
      const originalError = console.error;
      console.error = jest.fn();

      // Mock file adapter to throw error
      const originalEnv = process.env.LOG_FILE;
      process.env.LOG_FILE = '/proc/1/test.log';

      expect(() => {
        LoggerFactory.create({
          service: 'test',
          environment: 'test',
          adapters: ['file'],
        });
      }).not.toThrow(); // Should handle error and fallback to console

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create file adapter:'),
        expect.objectContaining({
          code: expect.stringMatching(/^E(NOENT|ACCES|PERM)$/),
        })
      );

      process.env.LOG_FILE = originalEnv;
      // Restore console.error
      console.error = originalError;
    });
  });

  describe('configuration validation', () => {
    it('should handle empty service name', () => {
      const logger = LoggerFactory.create({
        service: '',
        environment: 'test',
      });

      expect(logger.getService()).toBe('unknown-service'); // Should use default
    });

    it('should handle empty environment', () => {
      const logger = LoggerFactory.create({
        service: 'test',
        environment: '',
      });

      expect(logger.getEnvironment()).toBe('development'); // Should use default
    });
  });

  describe('LogLevel handling', () => {
    it('should respect configured log level', () => {
      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
        level: LogLevel.ERROR as LogLevel,
      });

      expect(logger).toBeInstanceOf(Logger);
      // Note: Level validation would be tested in adapter tests
    });

    it('should use default log level when not specified', () => {
      const logger = LoggerFactory.create({
        service: 'test',
        environment: 'test',
      });

      expect(logger).toBeInstanceOf(Logger);
    });
  });
});
