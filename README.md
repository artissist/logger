# Artissist Logger

Unified, platform-agnostic logging library with emoji-based events and rich context support for both Python and TypeScript projects.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Logger Types](#logger-types)
- [Context Management](#context-management)
- [Events & Emojis](#events--emojis)
- [Adapters](#adapters)
- [Configuration](#configuration)
- [API Guide](#api-guide)
- [Synchronous Usage (Python)](#synchronous-usage-python)
- [Development](#development)
- [License](#license)

## Features

- **25 predefined events** with configurable emoji mappings for quick visual scanning
- **Factory-based logger creation** for frontend, backend and agent services
- **Context propagation** with correlation IDs and scoped context managers
- **Multiple adapters** (console, file, and extensible for others)
- **Distributed tracing ready** with structured metadata and metrics
- **Flexible metadata** for arbitrary key-value context
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
  metadata: { userId: 'user123', method: 'oauth' }
});
```

The `metadata` object accepts any custom fields, making it simple to enrich logs with application-specific context.

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
    metadata={"user_id": "user123", "method": "oauth"}
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

## API Guide

### Python

#### LoggerFactory

`LoggerFactory.create_logger(service, environment, adapters, emojis=False, context=None, adapter_configs=None, emoji_resolver=None)`

- `service` (str): Service name.
- `environment` (str): Deployment environment.
- `adapters` (list[str]): Adapter names (`"console"`, `"file"`).
- `emojis` (bool): Enable emoji prefixes.
- `context` (`LoggerContext`): Base context.
- `adapter_configs` (dict): Settings per adapter.
  - console: `colors`, `use_stderr`
  - file: `file_path`, `format`, `rotate`, `max_size_mb`, `max_files`
- `emoji_resolver` (`EmojiResolver`): Custom emoji mapping.

`create_frontend_logger(service, environment, emojis=False, context=None, adapters=None)`

`create_backend_logger(service, environment, emojis=False, context=None, adapters=None)`

`create_agent_logger(config)` where `config` includes `agent_id`, `agent_type`, `environment`, `emojis`, `context`, `adapters`

`create_infrastructure_logger(component, environment, emojis=False, context=None, adapters=None)`

#### Logger Methods

`logger.debug|info|warn|error(message, *, event=None, custom_event=None, metadata=None, metrics=None, error=None, tags=None, context=None)`

- `event` (`LogEvent`): Predefined event type.
- `custom_event` (str): Custom event key.
- `metadata` (dict): Arbitrary key/value pairs.
- `metrics` (`LogMetrics`): `duration_ms`, `count`, `bytes_processed`, `cpu_usage`, `memory_usage`, `custom_metrics`.
- `error` (`ErrorInfo`): `type`, `message`, `stack_trace`, `context`.
- `tags` (list[str]): Optional labels.
- `context` (`LoggerContext`): `correlation_id`, `user_id`, `session_id`, `request_id`, `trace_id`, `span_id`, plus custom fields.

### TypeScript

#### LoggerFactory

`LoggerFactory.create({ service?, environment?, emojis?, adapters?, context?, level? })`

`LoggerFactory.createFrontendLogger({ service, environment, emojis?, context?, adapters? })`

`LoggerFactory.createBackendLogger({ service, environment, emojis?, context?, adapters?, logFile? })`

`LoggerFactory.createAgentLogger({ agentId, agentType?, environment, emojis?, context?, adapters? })`

`LoggerFactory.createInfrastructureLogger({ stackName?, deploymentId?, environment, emojis?, context?, adapters? })`

#### Logger Methods

`logger.trace|debug|info|warn|error|fatal(message, { event?, context?, metadata?, metrics?, error? })`

- `context`: `correlationId`, `traceId`, `spanId`, `userId`, `sessionId`, `requestId`, `parentCorrelationId`.
- `metadata`: Record<string, unknown>.
- `metrics`: `durationMs`, `memoryBytes`, `cpuPercent`, `counters`.
- `error`: `type`, `message`, `stackTrace`, `code`, `context` ({`file`, `line`, `function`, `data`} ).

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

GNU Affero General Public License v3.0 or later - see `LICENSE` for details.

