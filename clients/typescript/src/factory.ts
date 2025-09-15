// SPDX-License-Identifier: AGPL-3.0-or-later
// LoggerFactory for creating and managing Logger instances
import { LogLevel } from './types';
import type { CustomEventMap, LogAdapter, LoggerConfig, LoggerFactoryConfig } from './types';
import { Logger } from './logger';
import { EmojiResolver } from './emoji';
import { ConsoleAdapter } from './adapters/console';
import { FileAdapter } from './adapters/file';
import { createContextFromEnv } from './context';

/**
 * Factory for creating Logger instances with consistent configuration
 */
export class LoggerFactory {
  private static defaultConfig: LoggerFactoryConfig = {
    defaultService: 'unknown-service',
    defaultEnvironment: 'development',
    defaultEmojis: false,
    defaultAdapters: ['console'],
    defaultLevel: LogLevel.INFO,
  };

  private static globalEmojiResolver?: EmojiResolver;

  /**
   * Configure factory defaults
   */
  static configure(config: Partial<LoggerFactoryConfig>): void {
    LoggerFactory.defaultConfig = { ...LoggerFactory.defaultConfig, ...config };
  }

  /**
   * Set global emoji resolver with custom mappings
   */
  static setGlobalEmojiResolver(resolver: EmojiResolver): void {
    LoggerFactory.globalEmojiResolver = resolver;
  }

  /**
   * Add custom event mappings to global emoji resolver
   */
  static addCustomEvents(customMappings: CustomEventMap): void {
    LoggerFactory.globalEmojiResolver ??= new EmojiResolver();
    LoggerFactory.globalEmojiResolver.addCustomMappings(customMappings);
  }

  /**
   * Create a new Logger instance
   */
  static create(config: LoggerConfig): Logger {
    const resolvedConfig = LoggerFactory.resolveConfig(config);
    const emojiResolver = LoggerFactory.createEmojiResolver(resolvedConfig);
    const adapters = LoggerFactory.createAdapters(resolvedConfig, emojiResolver);

    return new Logger(
      resolvedConfig.service,
      resolvedConfig.environment,
      emojiResolver,
      adapters,
      resolvedConfig.context
    );
  }

  /**
   * Create a logger for frontend applications
   */
  static createFrontendLogger(
    config: Omit<LoggerConfig, 'adapters'> & {
      adapters?: ('console' | 'localStorage')[];
    }
  ): Logger {
    const frontendConfig: LoggerConfig = {
      ...config,
      adapters: config.adapters ?? ['console'],
    };

    return LoggerFactory.create(frontendConfig);
  }

  /**
   * Create a logger for backend services
   */
  static createBackendLogger(
    config: Omit<LoggerConfig, 'adapters'> & {
      adapters?: ('console' | 'file')[];
      logFile?: string;
    }
  ): Logger {
    const backendConfig: LoggerConfig = {
      ...config,
      adapters: config.adapters ?? ['console', 'file'],
    };

    // Add file path to context for file adapter
    if (config.logFile && !backendConfig.context) {
      backendConfig.context = {};
    }

    return LoggerFactory.create(backendConfig);
  }

  /**
   * Create a logger for agent services
   */
  static createAgentLogger(
    config: Omit<LoggerConfig, 'service'> & {
      agentId: string;
      agentType?: string;
    }
  ): Logger {
    const agentConfig: LoggerConfig = {
      ...config,
      service: `agent-${config.agentId}`,
      context: {
        ...config.context,
        // Add agent-specific context
        agentId: config.agentId,
        agentType: config.agentType,
      } as Record<string, unknown>, // Type assertion for custom fields
    };

    return LoggerFactory.create(agentConfig);
  }

  /**
   * Create a logger for infrastructure/CDK
   */
  static createInfrastructureLogger(
    config: Omit<LoggerConfig, 'service'> & {
      stackName?: string;
      deploymentId?: string;
    }
  ): Logger {
    const infraConfig: LoggerConfig = {
      ...config,
      service: config.stackName ? `infra-${config.stackName}` : 'infrastructure',
      context: {
        ...config.context,
        // Add infrastructure-specific context
        stackName: config.stackName,
        deploymentId: config.deploymentId,
      } as Record<string, unknown>, // Type assertion for custom fields
    };

    return LoggerFactory.create(infraConfig);
  }

  /**
   * Create a logger with context from environment variables
   */
  static createFromEnvironment(config: Partial<LoggerConfig> = {}): Logger {
    const envContext = createContextFromEnv();
    const envConfig: LoggerConfig = {
      service:
        process.env.SERVICE_NAME ?? LoggerFactory.defaultConfig.defaultService ?? 'unknown-service',
      environment:
        process.env.NODE_ENV ?? LoggerFactory.defaultConfig.defaultEnvironment ?? 'development',
      emojis: process.env.ENABLE_EMOJIS === 'true',
      ...config,
      context: {
        ...envContext,
        ...config.context,
      },
    };

    return LoggerFactory.create(envConfig);
  }

  /**
   * Get the default factory configuration
   */
  static getDefaultConfig(): LoggerFactoryConfig {
    return { ...LoggerFactory.defaultConfig };
  }

  /**
   * Reset factory to default configuration
   */
  static reset(): void {
    LoggerFactory.defaultConfig = {
      defaultService: 'unknown-service',
      defaultEnvironment: 'development',
      defaultEmojis: false,
      defaultAdapters: ['console'],
      defaultLevel: LogLevel.INFO,
    };
    LoggerFactory.globalEmojiResolver = undefined;
  }

  /**
   * Resolve configuration with defaults
   */
  private static resolveConfig(config: LoggerConfig): Required<LoggerConfig> {
    // Handle empty strings as falsy for service and environment
    const service = config.service?.trim() ? config.service.trim() : undefined;
    const environment = config.environment?.trim() ? config.environment.trim() : undefined;

    return {
      service: service ?? LoggerFactory.defaultConfig.defaultService ?? 'unknown-service',
      environment: environment ?? LoggerFactory.defaultConfig.defaultEnvironment ?? 'development',
      emojis: config.emojis ?? LoggerFactory.defaultConfig.defaultEmojis ?? false,
      adapters: config.adapters ?? LoggerFactory.defaultConfig.defaultAdapters ?? ['console'],
      level: config.level ?? LoggerFactory.defaultConfig.defaultLevel ?? LogLevel.INFO,
      context: config.context ?? {},
    };
  }

  /**
   * Create emoji resolver for the logger
   */
  private static createEmojiResolver(config: Required<LoggerConfig>): EmojiResolver {
    if (LoggerFactory.globalEmojiResolver) {
      const resolver = new EmojiResolver(
        config.emojis,
        LoggerFactory.globalEmojiResolver.getAllMappings()
      );
      return resolver;
    }

    return new EmojiResolver(config.emojis);
  }

  /**
   * Create adapters based on configuration
   */
  private static createAdapters(
    config: Required<LoggerConfig>,
    emojiResolver: EmojiResolver
  ): LogAdapter[] {
    const adapters: LogAdapter[] = [];

    config.adapters.forEach((adapterName) => {
      try {
        switch (adapterName) {
          case 'console':
            adapters.push(
              new ConsoleAdapter({
                enableEmojis: config.emojis,
                logLevel: config.level,
                emojiResolver,
              })
            );
            break;

          case 'file':
            adapters.push(
              new FileAdapter({
                filePath: process.env.LOG_FILE ?? './logs/app.log',
                enableEmojis: config.emojis,
                logLevel: config.level,
                emojiResolver,
              })
            );
            break;

          case 'localStorage':
            // Browser-only adapter (would need implementation)
            if (typeof window !== 'undefined') {
              // TODO: Implement LocalStorage adapter
              // eslint-disable-next-line no-console
              console.warn('LocalStorage adapter not yet implemented');
            }
            break;

          default:
            // eslint-disable-next-line no-console
            console.warn(`Unknown adapter type: ${adapterName}`);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to create ${adapterName} adapter:`, error);
      }
    });

    // Ensure at least one adapter exists
    if (adapters.length === 0) {
      adapters.push(
        new ConsoleAdapter({
          enableEmojis: config.emojis,
          logLevel: config.level,
          emojiResolver,
        })
      );
    }

    return adapters;
  }
}
