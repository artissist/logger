# Artissist Logger

Unified, platform-agnostic logging library with emoji-based events and rich context support for both Python and TypeScript projects.

## Features

- **25 predefined events** with configurable emoji mappings for quick visual scanning
- **Factory-based logger creation** for frontend, backend and agent services
- **Context propagation** with correlation IDs and scoped context managers
- **Multiple adapters** (console, file, and extensible for others)
- **Distributed tracing ready** with structured metadata and metrics
- **Async & sync APIs** (Python) and promise-friendly TypeScript API

## Installation

### TypeScript / JavaScript
```bash
npm install @artissist/logger
# or
pnpm add @artissist/logger
```

### Python
```bash
pip install artissist-logger
```

## Quick Start

### TypeScript
```typescript
import { LoggerFactory, LogEvent } from '@artissist/logger';

const logger = LoggerFactory.createFrontendLogger({
  service: 'my-app',
  environment: 'production',
  emojis: true
});

logger.info('Application started', { version: '1.0.0' });
logger.info('User login', {
  event: LogEvent.USER_AUTH,
  metadata: { userId: 'user123' }
});
```

### Python
```python
from artissist_logger import LoggerFactory, LogEvent

logger = LoggerFactory.create_backend_logger(
    service="my-service",
    environment="production",
    emojis=True
)

await logger.info("Service initialized", event=LogEvent.SYSTEM_START)
await logger.info(
    "User authenticated",
    event=LogEvent.USER_AUTH,
    metadata={"user_id": "user123"}
)
```

## Logger Types

Both clients expose factory helpers for common environments:

### Backend / Server Services
```typescript
const logger = LoggerFactory.createBackendLogger({
  service: 'api-service',
  environment: 'production',
  adapters: ['console', 'file'],
  emojis: false
});
```
```python
logger = LoggerFactory.create_backend_logger(
    service="api-service",
    environment="production",
    adapters=["console", "file"],
    emojis=False
)
```

### Agent Services
```typescript
const agentLogger = LoggerFactory.createAgentLogger({
  agentId: 'conv_001',
  environment: 'development',
  emojis: true
});
```
```python
agent_logger = LoggerFactory.create_agent_logger(
    agent_id="conv_001",
    agent_type="conversation",
    environment="development",
    emojis=True
)
```

## Context Management

### TypeScript
```typescript
const logger = LoggerFactory.createBackendLogger({ service: 'api' });
logger.setContext({ correlationId: 'req-123', userId: 'u-42' });
logger.info('Processing request');

const child = logger.child({ operation: 'export' });
child.info('Export complete');
```

### Python
```python
from artissist_logger import ContextManager, LoggerContext

ContextManager.set_context(LoggerContext(correlation_id="req-123", user_id="u-42"))
await logger.info("Processing request")  # Includes correlation_id and user_id

with ContextManager.context(operation="data_export"):
    await logger.info("Exporting data")
```

## Events & Emojis

Predefined events live in `LogEvent` and each maps to an emoji. Custom events can be added at runtime.

```typescript
import { LogEvent, LoggerFactory } from '@artissist/logger';

LoggerFactory.addCustomEvents({ DEPLOYMENT_SUCCESS: '🚢' });
logger.info('Ship it', { event: LogEvent.DEPLOYMENT_SUCCESS });
```
```python
from artissist_logger import LogEvent, LoggerFactory

LoggerFactory.add_custom_events({"DEPLOYMENT_SUCCESS": "🚢"})
await logger.info("Ship it", event=LogEvent.DEPLOYMENT_SUCCESS)
```

## Adapters

### Console Adapter
Enabled by default for both clients.

### File Adapter
```typescript
const logger = LoggerFactory.createBackendLogger({
  service: 'api',
  environment: 'production',
  adapters: ['file'],
  logFile: './logs/app.log'
});
```
```python
logger = LoggerFactory.create_backend_logger(
    service="api",
    environment="production",
    adapters=["file"],
    adapter_configs={"file": {"file_path": "logs/app.log"}}
)
```

Multiple adapters can be combined by listing them in the `adapters` array.

## Configuration

### Environment Variables

**TypeScript**
```bash
export NODE_ENV=production
export SERVICE_NAME=my-service
export ENABLE_EMOJIS=true
```
```typescript
const logger = LoggerFactory.createFromEnvironment();
```

**Python**
```bash
export ARTISSIST_LOG_LEVEL=INFO
export ARTISSIST_LOG_EMOJIS=true
```

### Programmatic Configuration
```typescript
const logger = LoggerFactory.create({
  service: 'my-service',
  environment: 'production',
  emojis: false,
  adapters: ['console', 'file']
});
```
```python
config = {
    "service": "my-service",
    "environment": "production",
    "adapters": ["console", "file"],
    "emojis": False,
    "adapter_configs": {"file": {"file_path": "/var/log/my.log"}}
}
logger = LoggerFactory.create_logger(**config)
```

## Synchronous Usage (Python)


Fire-and-forget helpers are available when `await` isn't possible:
```python
logger.info_sync("Service started", event=LogEvent.SYSTEM_START)
logger.error_sync("Connection failed", event=LogEvent.ERROR_OCCURRED)
```

## Development

Run linting and tests from the repository root:
```bash
pnpm run lint
pnpm test
```

## License

MIT License - see `LICENSE` for details.

