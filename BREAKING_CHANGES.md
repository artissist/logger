# Breaking Changes and Migration Guide

## Version 0.2.0 - Configuration and Emoji Unification

### Overview

This release introduces major unification improvements by extending the Smithy IDL to generate consistent configuration structures and emoji mappings across TypeScript and Python clients. While most core APIs remain backwards compatible, there are some important changes that may affect advanced usage patterns.

## 🚨 Breaking Changes

### 1. Emoji Mapping Standardization (HIGH IMPACT)

**What Changed:** Emoji mappings are now unified across all languages and generated from a single source of truth.

**Impact:** Previous emoji inconsistencies between TypeScript and Python clients have been resolved, but this means some emojis will change.

#### Emoji Changes:
```diff
TypeScript → Python Changes:
- ASSET_PROCESSING: 📸 → 📸 (no change)
- INSPIRATION_EVENT: 💡 → 🎨 (changed to match TypeScript)
- INFRASTRUCTURE_DEPLOY: 🚢 → 🏗️ (changed to match TypeScript)
- BACKGROUND_JOB: ⚙️ → ⚙️ (now consistent)
- NOTIFICATION_SENT: 📢 → 📧 (changed to match TypeScript)
- SECURITY_EVENT: 🔒 → 🔒 (now consistent)
- EXTERNAL_SERVICE: 🔌 → 🌐 (changed to match TypeScript)
```

**Migration:**
- **Automatic for most users**: Emoji changes will automatically apply if you use the default emoji resolver
- **Manual action needed**: If you hardcode emoji expectations in tests or documentation, update them to match the new standardized mappings

### 2. Configuration Structure Changes

**What Changed:** All configuration structures are now generated from Smithy IDL for type consistency.

#### TypeScript Changes:
- `LoggerConfig` interface now uses Smithy-generated types
- All adapter configuration interfaces are now Smithy-generated
- Some optional field defaults may have changed

#### Python Changes:
- **BREAKING**: Adapter configurations now use typed structures instead of `Dict[str, Any]`
- **BREAKING**: Some factory method signatures have been standardized

**Before (Python):**
```python
# OLD - Dict-based configuration
adapter_config = {
    "colors": True,
    "use_stderr": False,
    "timestamp_format": "iso"
}
```

**After (Python):**
```python
# NEW - Typed configuration structures
from artissist_logger import ConsoleAdapterConfig

adapter_config = ConsoleAdapterConfig(
    enableColors=True,
    useStderr=False,
    timestampFormat=TimestampFormat.ISO
)
```

### 3. Factory Method Standardization

**What Changed:** Factory method signatures and parameter names are now consistent between languages.

**Python Changes:**
- Added missing `create_from_environment()` method for feature parity with TypeScript
- Standardized parameter names to match Smithy-generated types
- Some optional parameters may have changed names (camelCase → snake_case conversion)

## ✅ Backwards Compatibility Maintained

The following areas maintain full backwards compatibility:

### Core Logger API
- All log methods (`info`, `debug`, `error`, etc.) remain unchanged
- `LogEntry`, `LoggingContext`, and other core types remain compatible
- Basic usage patterns are unaffected

### Basic Configuration
- Simple string-based adapter names still work: `adapters: ["console", "file"]`
- Environment variable based configuration remains the same
- Default values and behavior are preserved where possible

## 🔄 Migration Path

### Low-Risk Migration (Recommended for most users)

1. **Update Dependencies**:
   ```bash
   npm install @artissist/logger@^0.2.0
   # or
   pip install git+https://github.com/artissist/logger.git@v0.2.0
   ```

2. **No Code Changes Needed** for basic usage:
   ```typescript
   // This still works exactly the same
   const logger = LoggerFactory.create({
     service: 'my-service',
     environment: 'production',
     emojis: true
   });

   logger.info("Hello world", { event: LogEvent.SYSTEM_START });
   ```

3. **Test Emoji Changes** (if you rely on specific emojis):
   - Run your application and verify emojis display as expected
   - Update any hardcoded emoji expectations in tests

### High-Precision Migration (For advanced usage)

1. **Update Adapter Configurations** (Python only):
   ```python
   # Before
   config = {"colors": True, "use_stderr": False}

   # After
   from artissist_logger import ConsoleAdapterConfig, TimestampFormat
   config = ConsoleAdapterConfig(
       enableColors=True,
       useStderr=False,
       timestampFormat=TimestampFormat.ISO
   )
   ```

2. **Update Factory Method Calls** (if using advanced configuration):
   ```typescript
   // Check method signatures match expected parameters
   // Most basic usage will continue to work unchanged
   ```

3. **Validate Custom Emoji Mappings**:
   ```typescript
   // If you use custom emoji resolvers, verify they work with new base mappings
   const resolver = new EmojiResolver(customMappings);
   ```

## 🔧 Testing Your Migration

### Quick Compatibility Check

1. **TypeScript**:
   ```bash
   cd clients/typescript && npm run build && npm test
   ```

2. **Python**:
   ```bash
   cd clients/python && python -m pytest  # when tests are added
   ```

### Verify Emoji Consistency

Run this test to ensure emojis are now consistent:

```typescript
import { TYPED_EMOJI_MAPPINGS, LogEvent } from '@artissist/logger';

// These should all be the standardized emojis
console.log(TYPED_EMOJI_MAPPINGS[LogEvent.ASSET_PROCESSING].emoji); // 📸
console.log(TYPED_EMOJI_MAPPINGS[LogEvent.INSPIRATION_EVENT].emoji); // 🎨
console.log(TYPED_EMOJI_MAPPINGS[LogEvent.EXTERNAL_SERVICE].emoji); // 🌐
```

## 🆘 Rollback Plan

If you encounter issues, you can temporarily rollback:

```bash
# TypeScript
npm install @artissist/logger@^0.1.2

# Python
pip install git+https://github.com/artissist/logger.git@v0.1.2
```

## 📞 Support

If you encounter migration issues:

1. Check this guide for common patterns
2. Review the [examples](./examples/) directory for updated usage patterns
3. Open an issue at [GitHub Issues](https://github.com/artissist/logger/issues) with:
   - Your current configuration
   - Error messages or unexpected behavior
   - Language/platform details

## 🎯 Benefits After Migration

- **Emoji Consistency**: No more different emojis between TypeScript and Python
- **Type Safety**: Better IntelliSense and compile-time checks
- **Configuration Validation**: Catch configuration errors earlier
- **Cross-Language Compatibility**: Easier to switch between language implementations
- **Future-Proof**: Foundation for further unification improvements

## Timeline

- **v0.2.0**: Released with breaking changes documented
- **v0.2.x**: Patch releases for any migration issues
- **v0.3.0**: Next major feature release (estimated 2 months)

This migration guide will be updated based on community feedback and discovered edge cases.