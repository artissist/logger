# Artissist Logger - TypeScript Client

TypeScript implementation of the Artissist Logger for browser and Node.js
applications.

## Features

- 🚀 **Factory helpers** for frontend, backend, and agent environments
- 🔌 **Adapter pattern** with console and file adapters out of the box
- 🐛 **Structured events** with emoji mapping for rapid scanning
- 🧠 **Context propagation** with `child()` loggers

## Installation

```bash
pnpm add @artissist/logger
# or
npm install @artissist/logger
```

## Quick Start

```typescript
import { LoggerFactory, LogEvent } from '@artissist/logger';

const logger = LoggerFactory.createBackendLogger({
  service: 'api-service',
  environment: 'development',
  emojis: true
});

logger.info('Service booting', { event: LogEvent.SYSTEM_START });
logger.error('Database unavailable', {
  event: LogEvent.ERROR_OCCURRED,
  metadata: { retry: true, host: 'db-primary' }
});
```

The `metadata` field is a simple record of key-value pairs, so you can attach any custom context needed for your application.

The `Logger` exposes convenience methods for each level (`debug`, `info`, `warn`, `error`, etc.). Use `logger.log(level, message, data)` only when the level must be chosen dynamically.


## Context Management

```typescript
const requestLogger = logger.child({ correlationId: 'req-123' });
requestLogger.info('Handling request');
```

## Custom Events

```typescript
LoggerFactory.addCustomEvents({ DEPLOYMENT_SUCCESS: '🚢' });
logger.info('Ship it', { event: LogEvent.DEPLOYMENT_SUCCESS });
```

## Adapters

Console adapter is enabled by default. To log to a file:

```typescript
const fileLogger = LoggerFactory.createBackendLogger({
  service: 'api',
  environment: 'production',
  adapters: ['file'],
  logFile: './logs/app.log'
});
```

## Development

Run tests and linting from the package root:

```bash
pnpm test
pnpm lint
```

## License

MIT License - see LICENSE file for details.

