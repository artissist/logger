# Mosaic Logger

A unified, platform-agnostic logging system built with Smithy IDL for the Mosaic Artist's Personal Assistant platform.

## Features

- **25 predefined events** with emoji mappings (🚀🤖📁💾🔄⚡🐛⚠️🔧📊💬🎨🏗️ etc.)
- **Configurable emoji support** (`emojis: true/false` in initialization)
- **Platform-agnostic design** (TypeScript + Python clients)
- **Extensible event system** with custom event registration
- **Distributed tracing support** (correlation IDs, OpenTelemetry)
- **Multiple output adapters** (console, file, future cloud services)

## Project Structure

```
logger/
├── smithy/                          # Smithy model definitions
│   ├── models/                      # Model files
│   ├── smithy-build.json           # Build configuration
│   └── gradle/                     # Gradle build scripts
├── generated/                      # Generated client code (gitignored)
├── clients/                        # Hand-written client implementations
│   ├── typescript/                 # TypeScript/JavaScript clients
│   └── python/                     # Python clients
├── adapters/                       # Output adapter implementations
├── examples/                       # Usage examples
├── docs/                          # Documentation
├── tests/                         # Test suite
└── scripts/                       # Build and deployment scripts
```

## Development Status

This project is currently in active development. See `SMITHY_LOGGER_PROPOSAL.md` and `LOGGER_DEVELOPMENT_TODO.md` for detailed implementation plans and progress tracking.

## Quick Start

### Build Everything
```bash
# One command builds all components
./scripts/build.sh

# Clean build (recommended)
./scripts/build.sh --clean
```

### Install Packages
```bash
# TypeScript/JavaScript
npm install @mosaic/logger

# Python
pip install mosaic-logger
```

### Basic Usage

**TypeScript:**
```typescript
import { LoggerFactory, LogLevel, LogEvent } from '@mosaic/logger';

const logger = LoggerFactory.createFrontendLogger({
  service: 'my-app',
  environment: 'production',
  emojis: true
});

logger.info('Application started', { version: '1.0.0' });
logger.logEvent(LogEvent.USER_AUTH, 'User login successful', { userId: 'user123' });
```

**Python:**
```python
from mosaic_logger import LoggerFactory, LogLevel, LogEvent

logger = LoggerFactory.create_backend_logger(
    service='my-service',
    environment='production',
    emojis=True
)

logger.info('Service initialized', {'version': '1.0.0'})
logger.log_event(LogEvent.USER_AUTH, 'User authenticated', {'user_id': 'user123'})
```

## Documentation

- 📋 **[Build Instructions](BUILD_INSTRUCTIONS.md)** - Complete build, test, and publish guide
- 📊 **[Build Report](BUILD_REPORT.md)** - Current build status and pipeline details
- 🔧 **[Smithy Models](smithy/models/)** - IDL source of truth for all types

## License

MIT License - See LICENSE file for details.