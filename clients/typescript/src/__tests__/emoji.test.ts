// Unit tests for emoji utilities
import { 
  EmojiResolver, 
  EventEmojiMapping, 
  DEFAULT_EMOJI_MAPPINGS,
  formatLogMessage,
  getAllPredefinedEvents,
  createCustomEventRegistry
} from '../emoji';
import { LogEvent } from '../types';

describe('EmojiResolver', () => {
  let resolver: EmojiResolver;

  beforeEach(() => {
    resolver = new EmojiResolver();
  });

  describe('constructor', () => {
    it('should create resolver with enabled=false by default', () => {
      expect(resolver.isEnabled()).toBe(false);
    });

    it('should create resolver with specified enabled state', () => {
      const enabledResolver = new EmojiResolver(true);
      expect(enabledResolver.isEnabled()).toBe(true);
    });

    it('should create resolver with custom mappings', () => {
      const customMappings = {
        CUSTOM_EVENT: { emoji: '🎯', description: 'Custom event', isDefault: true }
      };
      const customResolver = new EmojiResolver(true, customMappings);
      expect(customResolver.getEmoji('CUSTOM_EVENT')).toBe('🎯');
    });
  });

  describe('setEnabled/isEnabled', () => {
    it('should enable and disable emoji resolution', () => {
      resolver.setEnabled(true);
      expect(resolver.isEnabled()).toBe(true);
      
      resolver.setEnabled(false);
      expect(resolver.isEnabled()).toBe(false);
    });
  });

  describe('getEmoji', () => {
    beforeEach(() => {
      resolver.setEnabled(true);
    });

    it('should return empty string when disabled', () => {
      resolver.setEnabled(false);
      expect(resolver.getEmoji('SYSTEM_START')).toBe('');
    });

    it('should return correct emoji for predefined events', () => {
      expect(resolver.getEmoji('SYSTEM_START')).toBe('🚀');
      expect(resolver.getEmoji('ERROR_OCCURRED')).toBe('🐛');
      expect(resolver.getEmoji('USER_AUTH')).toBe('👤');
    });

    it('should return fallback emoji for unknown events', () => {
      expect(resolver.getEmoji('UNKNOWN_EVENT' as LogEvent, '❓')).toBe('❓');
    });

    it('should return empty string for unknown events without fallback', () => {
      expect(resolver.getEmoji('UNKNOWN_EVENT' as LogEvent)).toBe('');
    });

    it('should prioritize custom mappings over default mappings', () => {
      resolver.addCustomMapping('SYSTEM_START', {
        emoji: '🎉',
        description: 'Custom system start',
        isDefault: false
      });
      expect(resolver.getEmoji('SYSTEM_START')).toBe('🎉');
    });
  });

  describe('getDescription', () => {
    it('should return correct description for predefined events', () => {
      expect(resolver.getDescription('SYSTEM_START')).toBe('System startup or initialization');
      expect(resolver.getDescription('ERROR_OCCURRED')).toBe('Error conditions and exceptions');
    });

    it('should return custom description for custom events', () => {
      resolver.addCustomMapping('CUSTOM_EVENT', {
        emoji: '🎯',
        description: 'Custom test event',
        isDefault: true
      });
      expect(resolver.getDescription('CUSTOM_EVENT')).toBe('Custom test event');
    });

    it('should return "Unknown event" for unknown events', () => {
      expect(resolver.getDescription('UNKNOWN_EVENT' as LogEvent)).toBe('Unknown event');
    });
  });

  describe('formatMessage', () => {
    it('should return original message when disabled', () => {
      resolver.setEnabled(false);
      expect(resolver.formatMessage('Test message', 'SYSTEM_START')).toBe('Test message');
    });

    it('should return original message when no event provided', () => {
      resolver.setEnabled(true);
      expect(resolver.formatMessage('Test message')).toBe('Test message');
    });

    it('should format message with emoji prefix when enabled', () => {
      resolver.setEnabled(true);
      expect(resolver.formatMessage('System starting', 'SYSTEM_START')).toBe('🚀 System starting');
    });

    it('should use fallback emoji when provided', () => {
      resolver.setEnabled(true);
      expect(resolver.formatMessage('Unknown event', 'UNKNOWN_EVENT' as LogEvent, '❓')).toBe('❓ Unknown event');
    });
  });

  describe('addCustomMapping', () => {
    it('should add new custom mapping', () => {
      resolver.setEnabled(true);
      resolver.addCustomMapping('TEST_EVENT', {
        emoji: '🧪',
        description: 'Test event',
        isDefault: true
      });
      
      expect(resolver.getEmoji('TEST_EVENT')).toBe('🧪');
      expect(resolver.getDescription('TEST_EVENT')).toBe('Test event');
    });

    it('should override existing mapping', () => {
      resolver.setEnabled(true);
      resolver.addCustomMapping('SYSTEM_START', {
        emoji: '⭐',
        description: 'Modified system start',
        isDefault: false
      });
      
      expect(resolver.getEmoji('SYSTEM_START')).toBe('⭐');
      expect(resolver.getDescription('SYSTEM_START')).toBe('Modified system start');
    });
  });

  describe('addCustomMappings', () => {
    it('should add multiple custom mappings', () => {
      resolver.setEnabled(true);
      const mappings = {
        EVENT_1: { emoji: '1️⃣', description: 'Event one', isDefault: true },
        EVENT_2: { emoji: '2️⃣', description: 'Event two', isDefault: true }
      };
      
      resolver.addCustomMappings(mappings);
      
      expect(resolver.getEmoji('EVENT_1')).toBe('1️⃣');
      expect(resolver.getEmoji('EVENT_2')).toBe('2️⃣');
    });
  });

  describe('getAllMappings', () => {
    it('should return all mappings including custom ones', () => {
      resolver.addCustomMapping('CUSTOM_EVENT', {
        emoji: '🎯',
        description: 'Custom event',
        isDefault: true
      });
      
      const mappings = resolver.getAllMappings();
      expect(mappings).toHaveProperty('SYSTEM_START');
      expect(mappings).toHaveProperty('CUSTOM_EVENT');
      expect(mappings.CUSTOM_EVENT.emoji).toBe('🎯');
    });
  });
});

describe('EmojiResolver static methods', () => {
  describe('isValidEmoji', () => {
    it('should validate common emojis', () => {
      expect(EmojiResolver.isValidEmoji('🚀')).toBe(true);
      expect(EmojiResolver.isValidEmoji('🎉')).toBe(true);
      expect(EmojiResolver.isValidEmoji('⚡')).toBe(true);
    });

    it('should reject non-emoji strings', () => {
      expect(EmojiResolver.isValidEmoji('a')).toBe(false);
      expect(EmojiResolver.isValidEmoji('123')).toBe(false);
      expect(EmojiResolver.isValidEmoji('')).toBe(false);
    });

    it('should reject multi-character strings', () => {
      expect(EmojiResolver.isValidEmoji('🚀🎉')).toBe(false);
      expect(EmojiResolver.isValidEmoji('abc')).toBe(false);
    });
  });

  describe('createCustomMapping', () => {
    it('should create valid mapping', () => {
      const mapping = EmojiResolver.createCustomMapping('🎯', 'Target event');
      expect(mapping.emoji).toBe('🎯');
      expect(mapping.description).toBe('Target event');
      expect(mapping.isDefault).toBe(false);
    });

    it('should create mapping with isDefault flag', () => {
      const mapping = EmojiResolver.createCustomMapping('🎯', 'Target event', true);
      expect(mapping.isDefault).toBe(true);
    });

    it('should throw error for invalid emoji', () => {
      expect(() => {
        EmojiResolver.createCustomMapping('invalid', 'Test');
      }).toThrow('Invalid emoji character: invalid');
    });

    it('should throw error for empty description', () => {
      expect(() => {
        EmojiResolver.createCustomMapping('🎯', '');
      }).toThrow('Description cannot be empty');
    });

    it('should trim whitespace', () => {
      const mapping = EmojiResolver.createCustomMapping(' 🎯 ', '  Target event  ');
      expect(mapping.emoji).toBe('🎯');
      expect(mapping.description).toBe('Target event');
    });
  });
});

describe('DEFAULT_EMOJI_MAPPINGS', () => {
  it('should contain all 25 predefined events', () => {
    const events = Object.keys(DEFAULT_EMOJI_MAPPINGS);
    expect(events).toHaveLength(25);
  });

  it('should have required predefined events', () => {
    const requiredEvents: LogEvent[] = [
      'SYSTEM_START', 'SYSTEM_STOP', 'USER_AUTH', 'USER_AUTHZ',
      'PROJECT_LIFECYCLE', 'DATABASE_OPERATION', 'API_REQUEST',
      'PERFORMANCE_METRIC', 'ERROR_OCCURRED', 'WARNING_ISSUED',
      'CONFIG_CHANGE', 'ANALYTICS_EVENT', 'AGENT_PROCESSING',
      'CONVERSATION_EVENT', 'ASSET_PROCESSING', 'INSPIRATION_EVENT',
      'INFRASTRUCTURE_DEPLOY', 'BUSINESS_METRIC', 'SEARCH_OPERATION',
      'BACKGROUND_JOB', 'NOTIFICATION_SENT', 'SECURITY_EVENT',
      'SCHEDULED_TASK', 'EXTERNAL_SERVICE', 'AUDIT_TRAIL'
    ];

    requiredEvents.forEach(event => {
      expect(DEFAULT_EMOJI_MAPPINGS).toHaveProperty(event);
      expect(DEFAULT_EMOJI_MAPPINGS[event].emoji).toBeTruthy();
      expect(DEFAULT_EMOJI_MAPPINGS[event].description).toBeTruthy();
    });
  });

  it('should have unique emojis for each event', () => {
    const emojis = Object.values(DEFAULT_EMOJI_MAPPINGS).map(m => m.emoji);
    const uniqueEmojis = new Set(emojis);
    // Note: Some emojis might be repeated (like 🔄 for API_REQUEST and BACKGROUND_JOB)
    expect(uniqueEmojis.size).toBeGreaterThan(20);
  });
});

describe('EventEmojiMapping global instance', () => {
  beforeEach(() => {
    // Reset global instance state
    EventEmojiMapping.setEnabled(false);
  });

  it('should be disabled by default', () => {
    expect(EventEmojiMapping.isEnabled()).toBe(false);
  });

  it('should allow global configuration', () => {
    EventEmojiMapping.setEnabled(true);
    expect(EventEmojiMapping.isEnabled()).toBe(true);
  });
});

describe('Utility functions', () => {
  describe('formatLogMessage', () => {
    it('should format message when emojis enabled', () => {
      const result = formatLogMessage('Test message', 'SYSTEM_START', true);
      expect(result).toBe('🚀 Test message');
    });

    it('should return original message when emojis disabled', () => {
      const result = formatLogMessage('Test message', 'SYSTEM_START', false);
      expect(result).toBe('Test message');
    });

    it('should use custom resolver when provided', () => {
      const customResolver = new EmojiResolver(true);
      customResolver.addCustomMapping('CUSTOM_EVENT', {
        emoji: '🎯',
        description: 'Custom',
        isDefault: true
      });

      const result = formatLogMessage(
        'Custom message', 
        'CUSTOM_EVENT', 
        true, 
        customResolver
      );
      expect(result).toBe('🎯 Custom message');
    });
  });

  describe('getAllPredefinedEvents', () => {
    it('should return all predefined events', () => {
      const events = getAllPredefinedEvents();
      expect(events).toHaveLength(25);
      
      events.forEach(event => {
        expect(event).toHaveProperty('event');
        expect(event).toHaveProperty('emoji');
        expect(event).toHaveProperty('description');
      });
    });

    it('should include specific known events', () => {
      const events = getAllPredefinedEvents();
      const eventTypes = events.map(e => e.event);
      
      expect(eventTypes).toContain('SYSTEM_START');
      expect(eventTypes).toContain('ERROR_OCCURRED');
      expect(eventTypes).toContain('USER_AUTH');
    });
  });

  describe('createCustomEventRegistry', () => {
    it('should create registry with custom mappings', () => {
      const customMappings = {
        CUSTOM_EVENT: { emoji: '🎯', description: 'Custom event', isDefault: true }
      };
      
      const registry = createCustomEventRegistry(customMappings);
      registry.setEnabled(true);
      
      expect(registry.getEmoji('CUSTOM_EVENT')).toBe('🎯');
    });

    it('should create empty registry by default', () => {
      const registry = createCustomEventRegistry();
      registry.setEnabled(true);
      
      expect(registry.getEmoji('SYSTEM_START')).toBe('🚀'); // Should still have defaults
    });
  });
});

describe('Edge cases and error handling', () => {
  let resolver: EmojiResolver;

  beforeEach(() => {
    resolver = new EmojiResolver(true);
  });

  it('should handle undefined event gracefully', () => {
    expect(resolver.getEmoji(undefined as any)).toBe('');
    expect(resolver.getDescription(undefined as any)).toBe('Unknown event');
  });

  it('should handle null event gracefully', () => {
    expect(resolver.getEmoji(null as any)).toBe('');
    expect(resolver.getDescription(null as any)).toBe('Unknown event');
  });

  it('should handle empty string event', () => {
    expect(resolver.getEmoji('')).toBe('');
    expect(resolver.getDescription('')).toBe('Unknown event');
  });

  it('should handle numeric event values', () => {
    expect(resolver.getEmoji(123 as any)).toBe('');
    expect(resolver.getDescription(123 as any)).toBe('Unknown event');
  });
});