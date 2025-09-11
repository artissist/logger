// Browser-compatible factory for creating Logger instances
import type { LogAdapter, LoggerConfig, LoggerFactoryConfig } from './types';
import { Logger } from './logger';
import { EmojiResolver } from './emoji';
import { ConsoleAdapter } from './adapters/console';
import { createContextFromEnv } from './context';

/**
 * Factory for creating Logger instances with consistent configuration (Browser version)
 */
export class LoggerFactory {
  private static defaultConfig: LoggerFactoryConfig = {
    defaultService: 'unknown-service',
    defaultEnvironment: 'development',
    defaultEmojis: false,
    defaultAdapters: ['console'],
    defaultLevel: 'INFO',
  };

  private static globalEmojiResolver?: EmojiResolver;

  /**
   * Configure factory defaults
   */
  static configure(config: Partial<LoggerFactoryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Create a logger with the specified configuration
   */
  static create(config: LoggerConfig): Logger {
    const finalConfig = this.mergeWithDefaults(config);
    const adapters = this.createAdapters(finalConfig);

    return new Logger(
      finalConfig.service ?? this.defaultConfig.defaultService ?? 'unknown-service',
      finalConfig.environment ?? this.defaultConfig.defaultEnvironment ?? 'development',
      this.globalEmojiResolver ?? new EmojiResolver(),
      adapters,
      finalConfig.context ?? {}
    );
  }

  /**
   * Create a frontend logger optimized for web applications
   */
  static createFrontendLogger(config: Partial<LoggerConfig> = {}): Logger {
    const frontendConfig: LoggerConfig = {
      service: config.service ?? 'frontend-app',
      environment: config.environment ?? this.defaultConfig.defaultEnvironment ?? 'development',
      level: config.level ?? 'INFO',
      emojis: config.emojis ?? true,
      adapters: config.adapters ?? ['console'],
      context: {
        ...this.createContextFromEnv(),
        ...config.context,
      },
    };

    return this.create(frontendConfig);
  }

  /**
   * Create a backend logger optimized for server applications
   */
  static createBackendLogger(config: Partial<LoggerConfig> = {}): Logger {
    const backendConfig: LoggerConfig = {
      service: config.service ?? 'backend-service',
      environment: config.environment ?? this.defaultConfig.defaultEnvironment ?? 'development',
      level: config.level ?? 'INFO',
      emojis: config.emojis ?? false,
      adapters: config.adapters ?? ['console'], // File adapter handled by polyfills
      context: {
        ...this.createContextFromEnv(),
        ...config.context,
      },
    };

    return this.create(backendConfig);
  }

  /**
   * Create an agent logger for AI/ML agents
   */
  static createAgentLogger(
    config: Partial<
      LoggerConfig & {
        agentId?: string;
        agentType?: string;
      }
    > = {}
  ): Logger {
    const agentConfig: LoggerConfig = {
      service: config.service ?? `agent-${config.agentId ?? 'unknown'}`,
      environment: config.environment ?? this.defaultConfig.defaultEnvironment ?? 'development',
      level: config.level ?? 'INFO',
      emojis: config.emojis ?? true,
      adapters: config.adapters ?? ['console'],
      context: {
        ...this.createContextFromEnv(),
        ...config.context,
      },
    };

    return this.create(agentConfig);
  }

  /**
   * Create an infrastructure logger for deployment and ops
   */
  static createInfrastructureLogger(
    config: Partial<
      LoggerConfig & {
        stackName?: string;
        deploymentId?: string;
      }
    > = {}
  ): Logger {
    const infraConfig: LoggerConfig = {
      service: config.service ?? 'infrastructure',
      environment: config.environment ?? this.defaultConfig.defaultEnvironment ?? 'development',
      level: config.level ?? 'INFO',
      emojis: config.emojis ?? false,
      adapters: config.adapters ?? ['console'], // File adapter handled by polyfills
      context: {
        ...this.createContextFromEnv(),
        ...config.context,
      },
    };

    return this.create(infraConfig);
  }

  /**
   * Create adapters based on configuration (browser-compatible)
   */
  private static createAdapters(config: LoggerConfig): LogAdapter[] {
    const adapters: LogAdapter[] = [];

    for (const adapterType of config.adapters ?? ['console']) {
      switch (adapterType) {
        case 'console':
          adapters.push(
            new ConsoleAdapter({
              enableEmojis: config.emojis,
              timestampFormat: 'iso',
              logLevel: config.level,
              emojiResolver: this.globalEmojiResolver,
            })
          );
          break;
        case 'file':
          // In browser builds, file adapter is handled by polyfills
          // The polyfills will provide no-op fs methods
          try {
            // Dynamic import will be resolved by rollup polyfills
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fileModule = require('./adapters/file') as {
              FileAdapter: new (options: Record<string, unknown>) => LogAdapter;
            };
            adapters.push(
              new fileModule.FileAdapter({
                filePath: './logs/app.log',
                enableEmojis: config.emojis,
                timestampFormat: 'iso',
                logLevel: config.level,
                emojiResolver: this.globalEmojiResolver,
              })
            );
          } catch {
            // FileAdapter not available in browser, silently skip
            // eslint-disable-next-line no-console
            console.warn('FileAdapter not available in browser environment');
          }
          break;
        default:
          // eslint-disable-next-line no-console
          console.warn(`Unknown adapter type: ${adapterType}`);
      }
    }

    return adapters;
  }

  /**
   * Merge user config with factory defaults
   */
  private static mergeWithDefaults(config: LoggerConfig): LoggerConfig {
    return {
      service: config.service ?? this.defaultConfig.defaultService,
      environment: config.environment ?? this.defaultConfig.defaultEnvironment,
      level: config.level ?? this.defaultConfig.defaultLevel,
      emojis: config.emojis ?? this.defaultConfig.defaultEmojis,
      adapters: config.adapters ?? this.defaultConfig.defaultAdapters,
      context: config.context ?? {},
    };
  }

  /**
   * Get current factory configuration
   */
  static getConfig(): LoggerFactoryConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Reset factory to default configuration
   */
  static reset(): void {
    this.defaultConfig = {
      defaultService: 'unknown-service',
      defaultEnvironment: 'development',
      defaultEmojis: false,
      defaultAdapters: ['console'],
      defaultLevel: 'INFO',
    };
    this.globalEmojiResolver = undefined;
  }

  /**
   * Create context from environment variables (browser-safe)
   */
  private static createContextFromEnv(): Record<string, unknown> {
    // Check if we're in a browser environment
    if (typeof process === 'undefined') {
      return {};
    }

    try {
      return createContextFromEnv();
    } catch {
      return {};
    }
  }
}
