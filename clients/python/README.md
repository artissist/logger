# Artissist Logger - Python Client

Platform-agnostic logging client for the Artissist platform.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Guide](#api-guide)
- [Logger Types](#logger-types)
- [Context Management](#context-management)
- [Events and Emojis](#events-and-emojis)
- [Error Handling](#error-handling)
- [Metrics](#metrics)
- [Adapters](#adapters)
- [Synchronous Usage](#synchronous-usage)
- [Configuration](#configuration)
- [Development](#development)
- [Integration Examples](#integration-examples)
- [License](#license)

## Features

- 🎯 **Pre-defined Events**: 25 built-in event types with emoji support
- 🎨 **Emoji Integration**: Configurable emoji prefixes for visual log scanning
- 📊 **Structured Logging**: Rich metadata, metrics, and error information
- 🔄 **Context Management**: Distributed tracing with correlation IDs
- 🔌 **Adapter Pattern**: Multiple output destinations (console, file, cloud)
- 🏭 **Factory Pattern**: Specialized loggers for different components
- ⚡ **Async Support**: Non-blocking logging with async/await
- 🛡️ **Type Safety**: Full type hints and runtime validation

## Installation

```bash
pip install artissist-logger
```

### Development Installation

```bash
pip install -e .[dev]
```

## Quick Start

```python
from artissist_logger import LoggerFactory, LogEvent

# Create a backend logger
logger = LoggerFactory.create_backend_logger(
    service="my-service",
    environment="development", 
    emojis=True  # Enable emojis for development
)

# Basic logging
await logger.info("Service starting up", event=LogEvent.SYSTEM_START)
await logger.error("Database connection failed", event=LogEvent.ERROR_OCCURRED)

# With structured data
await logger.info(
    "User authenticated successfully",
    event=LogEvent.USER_AUTH,
    metadata={"user_id": "user_123", "method": "oauth"},
    metrics={"auth_duration_ms": 150}
)
```

The Logger exposes convenience methods for each level (`debug`, `info`, `warn`, `error`, etc.). Use `logger.log(level, message, **kwargs)` only when the level must be chosen dynamically.

## API Guide

### Factory Functions

`LoggerFactory.create_logger(service, environment, adapters, emojis=False, context=None, adapter_configs=None, emoji_resolver=None)`

- `service` (str): Service name.
- `environment` (str): Deployment environment.
- `adapters` (list[str]): Adapter names (`"console"`, `"file"`).
- `emojis` (bool): Enable emoji prefixes.
- `context` (`LoggerContext`): Base context values.
- `adapter_configs` (dict): Adapter options.
  - console: `colors`, `use_stderr`
  - file: `file_path`, `format`, `rotate`, `max_size_mb`, `max_files`
- `emoji_resolver` (`EmojiResolver`): Custom emoji mappings.

`LoggerFactory.create_frontend_logger(service, environment, emojis=False, context=None, adapters=None)`

`LoggerFactory.create_backend_logger(service, environment, emojis=False, context=None, adapters=None)`

`LoggerFactory.create_agent_logger(config)` where `config` includes `agent_id`, `agent_type`, `environment`, `emojis`, `context`, and `adapters`

`LoggerFactory.create_infrastructure_logger(component, environment, emojis=False, context=None, adapters=None)`

### Logger Methods

`logger.debug|info|warn|error(message, *, event=None, custom_event=None, metadata=None, metrics=None, error=None, tags=None, context=None)`

- `event` (`LogEvent`): Predefined event type.
- `custom_event` (str): Custom event key.
- `metadata` (dict): Arbitrary key/value pairs.
- `metrics` (`LogMetrics`): `duration_ms`, `count`, `bytes_processed`, `cpu_usage`, `memory_usage`, `custom_metrics`.
- `error` (`ErrorInfo`): `type`, `message`, `stack_trace`, `context`.
- `tags` (list[str]): Optional labels.
- `context` (`LoggerContext`): `correlation_id`, `user_id`, `session_id`, `request_id`, `trace_id`, `span_id`, plus custom fields.

## Logger Types

### Backend Logger
```python
logger = LoggerFactory.create_backend_logger(
    service="api-server",
    environment="production",
    emojis=False  # Disabled for production
)
```

### Agent Logger  
```python
logger = LoggerFactory.create_agent_logger(
    agent_id="conv_001",
    agent_type="conversation",
    environment="development",
    emojis=True
)
```

### Infrastructure Logger
```python
logger = LoggerFactory.create_infrastructure_logger(
    component="deployment-manager", 
    environment="production"
)
```

## Context Management

### Global Context
```python
from artissist_logger import ContextManager, LoggerContext

# Set global context
ContextManager.set_context(LoggerContext(
    correlation_id="req_123",
    user_id="user_456"
))

# All subsequent logs will include this context
await logger.info("Processing request")  # Includes correlation_id and user_id
```

### Scoped Context
```python
# Temporary context for a specific operation
with ContextManager.context(user_id="user_789", operation="data_export"):
    await logger.info("Starting export")  # Includes user_id and operation
    await logger.info("Export completed")
```

### Logger Context
```python
# Create logger with permanent context
contextual_logger = logger.with_context(
    service_version="1.2.0",
    deployment_id="deploy_abc"
)

await contextual_logger.info("Service initialized")  # Includes service_version and deployment_id
```

## Events and Emojis

### Pre-defined Events
```python
# System events
LogEvent.SYSTEM_START      # 🚀 System startup
LogEvent.ERROR_OCCURRED    # 🐛 Errors and exceptions
LogEvent.WARNING_ISSUED    # ⚠️  Warning conditions

# Business events  
LogEvent.USER_AUTH         # 👤 User authentication
LogEvent.PROJECT_LIFECYCLE # 📁 Project management
LogEvent.AI_INFERENCE      # 🧠 AI model operations

# Technical events
LogEvent.API_REQUEST       # 🔄 API calls
LogEvent.DATABASE_OPERATION # 💾 Database queries
LogEvent.PERFORMANCE_METRIC # ⚡ Performance measurements
```

### Custom Events
```python
from artissist_logger import EmojiResolver, EmojiMapping

# Create custom emoji mappings
resolver = EmojiResolver()
resolver.add_custom_mapping("payment_processed", EmojiMapping(
    emoji="💳", 
    description="Payment processing events"
))

logger = LoggerFactory.create_logger(
    service="payment-service",
    environment="development", 
    adapters=["console"],
    emojis=True,
    emoji_resolver=resolver
)

# Use custom event
await logger.info("Payment completed", custom_event="payment_processed")
# Output: 💳 Payment completed
```

## Error Handling

```python
from artissist_logger import ErrorInfo

try:
    # Some operation that might fail
    process_data()
except Exception as e:
    await logger.error(
        "Data processing failed",
        event=LogEvent.ERROR_OCCURRED,
        error=ErrorInfo(
            type=type(e).__name__,
            message=str(e),
            stack_trace=traceback.format_exc(),
            context={"batch_id": "batch_123"}
        )
    )
```

## Metrics

```python
from artissist_logger import LogMetrics

# Performance metrics
await logger.info(
    "Database query completed",
    event=LogEvent.DATABASE_OPERATION,
    metrics=LogMetrics(
        duration_ms=45.2,
        count=150,
        bytes_processed=1024000
    )
)

# Business metrics
await logger.info(
    "User signup completed", 
    event=LogEvent.BUSINESS_METRIC,
    metadata={"user_type": "premium"},
    metrics=LogMetrics(
        count=1,
        custom_metrics={"revenue_impact": 29.99}
    )
)
```

## Adapters

### Console Adapter
```python
# Development console output with colors
LoggerFactory.create_logger(
    service="my-service",
    environment="development",
    adapters=["console"],
    adapter_configs={
        "console": {"colors": True, "use_stderr": False}
    }
)
```

### File Adapter
```python
# Production file logging with rotation
LoggerFactory.create_logger(
    service="my-service", 
    environment="production",
    adapters=["file"],
    adapter_configs={
        "file": {
            "file_path": "logs/service.log",
            "format": "json",
            "rotate": True,
            "max_size_mb": 50,
            "max_files": 10
        }
    }
)
```

### Multiple Adapters
```python
# Both console and file output
LoggerFactory.create_backend_logger(
    service="api-service",
    environment="production",
    adapters=["console", "file"]
)
```

## Synchronous Usage

For non-async contexts:

```python
# Synchronous convenience methods (fire-and-forget)
logger.info_sync("Service started", event=LogEvent.SYSTEM_START)
logger.error_sync("Connection failed", event=LogEvent.ERROR_OCCURRED)
```

## Configuration

### Environment Variables
```bash
export ARTISSIST_LOG_LEVEL=INFO
export ARTISSIST_LOG_EMOJIS=true
export ARTISSIST_LOG_FORMAT=json
```

### Programmatic Configuration
```python
config = {
    "service": "my-service",
    "environment": "production",
    "adapters": ["console", "file"],
    "emojis": False,
    "adapter_configs": {
        "console": {"colors": False},
        "file": {"file_path": "/var/log/my-service.log"}
    }
}

logger = LoggerFactory.create_logger(**config)
```

## Development

### Running Tests
```bash
pytest
pytest --cov=artissist_logger  # With coverage
```

### Code Formatting
```bash
black artissist_logger/
mypy artissist_logger/
flake8 artissist_logger/
```

### Build Package
```bash
python setup.py bdist_wheel
```

## Integration Examples

See the `examples/` directory for complete integration examples:
- FastAPI backend service
- Agent processing systems  
- Infrastructure deployment logging
- Error handling patterns
- Performance monitoring

## License

GNU Affero General Public License v3.0 or later - see LICENSE file for details.
