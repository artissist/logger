// Emoji mapping utilities for Mosaic Logger
import { LogEvent, EmojiMapping, CustomEventMap } from './types';

/**
 * Default emoji mappings for predefined events
 * Maps LogEvent enum values to their corresponding emojis and descriptions
 */
export const DEFAULT_EMOJI_MAPPINGS: Record<LogEvent, EmojiMapping> = {
    SYSTEM_START: { emoji: '🚀', description: 'System startup or initialization', isDefault: true },
    SYSTEM_STOP: { emoji: '🛑', description: 'System shutdown or termination', isDefault: true },
    USER_AUTH: { emoji: '👤', description: 'User authentication events', isDefault: true },
    USER_AUTHZ: { emoji: '🔐', description: 'Authorization and permission events', isDefault: true },
    PROJECT_LIFECYCLE: { emoji: '📁', description: 'Project lifecycle events', isDefault: true },
    DATABASE_OPERATION: { emoji: '💾', description: 'Database operations', isDefault: true },
    API_REQUEST: { emoji: '🔄', description: 'API request/response events', isDefault: true },
    PERFORMANCE_METRIC: { emoji: '⚡', description: 'Performance metrics and timing', isDefault: true },
    ERROR_OCCURRED: { emoji: '🐛', description: 'Error conditions and exceptions', isDefault: true },
    WARNING_ISSUED: { emoji: '⚠️', description: 'Warning conditions', isDefault: true },
    CONFIG_CHANGE: { emoji: '🔧', description: 'Configuration changes', isDefault: true },
    ANALYTICS_EVENT: { emoji: '📊', description: 'Analytics and tracking events', isDefault: true },
    AGENT_PROCESSING: { emoji: '🤖', description: 'Agent processing events', isDefault: true },
    CONVERSATION_EVENT: { emoji: '💬', description: 'Conversation and interaction events', isDefault: true },
    ASSET_PROCESSING: { emoji: '📸', description: 'Asset upload and processing', isDefault: true },
    INSPIRATION_EVENT: { emoji: '🎨', description: 'Inspiration capture events', isDefault: true },
    INFRASTRUCTURE_DEPLOY: { emoji: '🏗️', description: 'Infrastructure deployment events', isDefault: true },
    BUSINESS_METRIC: { emoji: '📈', description: 'Business metric events', isDefault: true },
    SEARCH_OPERATION: { emoji: '🔍', description: 'Search and discovery events', isDefault: true },
    BACKGROUND_JOB: { emoji: '🔄', description: 'Background job processing', isDefault: true },
    NOTIFICATION_SENT: { emoji: '📧', description: 'Notification events', isDefault: true },
    SECURITY_EVENT: { emoji: '🔐', description: 'Security-related events', isDefault: true },
    SCHEDULED_TASK: { emoji: '⏰', description: 'Scheduled task execution', isDefault: true },
    EXTERNAL_SERVICE: { emoji: '🌐', description: 'External service integration', isDefault: true },
    AUDIT_TRAIL: { emoji: '📋', description: 'Audit trail events', isDefault: true },
};

/**
 * Emoji resolver class for handling event-to-emoji mappings
 */
export class EmojiResolver {
    private customMappings: CustomEventMap = {};
    private enabled: boolean = false;

    constructor(enabled: boolean = false, customMappings: CustomEventMap = {}) {
        this.enabled = enabled;
        this.customMappings = customMappings;
    }

    /**
     * Enable or disable emoji resolution
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Check if emoji resolution is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Add or update custom event mappings
     */
    addCustomMapping(event: string, mapping: EmojiMapping): void {
        this.customMappings[event] = mapping;
    }

    /**
     * Add multiple custom event mappings
     */
    addCustomMappings(mappings: CustomEventMap): void {
        this.customMappings = { ...this.customMappings, ...mappings };
    }

    /**
     * Get emoji for a given event
     * @param event - The log event
     * @param fallbackEmoji - Optional fallback emoji if event not found
     * @returns The emoji string or empty string if disabled/not found
     */
    getEmoji(event: LogEvent | string, fallbackEmoji?: string): string {
        if (!this.enabled) {
            return '';
        }

        // Check custom mappings first
        if (typeof event === 'string' && this.customMappings[event]) {
            return this.customMappings[event].emoji;
        }

        // Check default mappings for LogEvent
        if (typeof event === 'string' && Object.keys(DEFAULT_EMOJI_MAPPINGS).includes(event)) {
            const logEvent = event as LogEvent;
            return DEFAULT_EMOJI_MAPPINGS[logEvent].emoji;
        }

        if (typeof event !== 'string' && DEFAULT_EMOJI_MAPPINGS[event]) {
            return (DEFAULT_EMOJI_MAPPINGS as any)[event].emoji;
        }

        // Return fallback or empty string
        return fallbackEmoji || '';
    }

    /**
     * Get description for a given event
     */
    getDescription(event: LogEvent | string): string {
        // Check custom mappings first
        if (typeof event === 'string' && this.customMappings[event]) {
            return this.customMappings[event].description;
        }

        // Check default mappings
        if (typeof event === 'string' && Object.keys(DEFAULT_EMOJI_MAPPINGS).includes(event)) {
            const logEvent = event as LogEvent;
            return DEFAULT_EMOJI_MAPPINGS[logEvent].description;
        }

        if (typeof event !== 'string' && DEFAULT_EMOJI_MAPPINGS[event]) {
            return (DEFAULT_EMOJI_MAPPINGS as any)[event].description;
        }

        return 'Unknown event';
    }

    /**
     * Format a log message with emoji prefix
     */
    formatMessage(message: string, event?: LogEvent | string, fallbackEmoji?: string): string {
        if (!this.enabled || !event) {
            return message;
        }

        const emoji = this.getEmoji(event, fallbackEmoji);
        return emoji ? `${emoji} ${message}` : message;
    }

    /**
     * Get all available event mappings (default + custom)
     */
    getAllMappings(): Record<string, EmojiMapping> {
        return {
            ...DEFAULT_EMOJI_MAPPINGS,
            ...this.customMappings
        };
    }

    /**
     * Validate emoji character (basic Unicode emoji check)
     */
    static isValidEmoji(emoji: string): boolean {
        // Basic emoji regex - checks for common emoji ranges
        const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]$/u;
        return emojiRegex.test(emoji);
    }

    /**
     * Create a new custom event mapping with validation
     */
    static createCustomMapping(emoji: string, description: string, isDefault: boolean = false): EmojiMapping {
        if (!EmojiResolver.isValidEmoji(emoji)) {
            throw new Error(`Invalid emoji character: ${emoji}`);
        }

        if (!description || description.trim().length === 0) {
            throw new Error('Description cannot be empty');
        }

        return {
            emoji: emoji.trim(),
            description: description.trim(),
            isDefault
        };
    }
}

/**
 * Global emoji resolver instance
 * Can be used across the application for consistent emoji handling
 */
export const EventEmojiMapping = new EmojiResolver();

/**
 * Utility function to format log messages with emojis
 */
export function formatLogMessage(
    message: string,
    event?: LogEvent | string,
    enableEmojis: boolean = false,
    customResolver?: EmojiResolver
): string {
    const resolver = customResolver || EventEmojiMapping;
    
    if (!enableEmojis) {
        return message;
    }

    return resolver.formatMessage(message, event);
}

/**
 * Utility function to get all predefined events with their emojis
 */
export function getAllPredefinedEvents(): Array<{ event: LogEvent; emoji: string; description: string }> {
    return Object.entries(DEFAULT_EMOJI_MAPPINGS).map(([event, mapping]) => ({
        event: event as LogEvent,
        emoji: mapping.emoji,
        description: mapping.description
    }));
}

/**
 * Utility function to create a custom event registry
 */
export function createCustomEventRegistry(customMappings: CustomEventMap = {}): EmojiResolver {
    return new EmojiResolver(false, customMappings);
}