# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Logger factory for creating specialized loggers in different contexts
"""

from typing import Any, Dict, List, Optional

from .adapters.base import LogAdapter
from .adapters.console import ConsoleAdapter
from .adapters.file import FileAdapter
from .context import LoggerContext
from .emoji import EmojiResolver
from .logger import Logger
from .types import AgentLoggerConfig, LoggerConfig


class LoggerFactory:
    """Factory for creating specialized loggers for different use cases"""

    @staticmethod
    def create_logger(
        service: str,
        environment: str,
        adapters: List[str],
        emojis: bool = False,
        context: Optional[LoggerContext] = None,
        adapter_configs: Optional[Dict[str, Dict[str, Any]]] = None,
        emoji_resolver: Optional[EmojiResolver] = None,
    ) -> Logger:
        """
        Create a logger with specified configuration

        Args:
            service: Service name
            environment: Environment (dev, staging, prod)
            adapters: List of adapter names ('console', 'file')
            emojis: Enable emoji support
            context: Base context
            adapter_configs: Configuration for each adapter
            emoji_resolver: Custom emoji resolver
        """
        adapter_configs = adapter_configs or {}
        adapter_instances: List[LogAdapter] = []

        for adapter_name in adapters:
            adapter_config = adapter_configs.get(adapter_name, {})

            if adapter_name == "console":
                adapter_instances.append(ConsoleAdapter(adapter_config))
            elif adapter_name == "file":
                if "file_path" not in adapter_config:
                    adapter_config["file_path"] = f"logs/{service}.log"
                adapter_instances.append(FileAdapter(adapter_config))
            else:
                raise ValueError(f"Unknown adapter: {adapter_name}")

        config = LoggerConfig(
            service=service,
            environment=environment,
            adapters=adapter_instances,
            emojis=emojis,
            context=context,
            emoji_resolver=emoji_resolver,
        )
        return Logger(config)

    @staticmethod
    def create_frontend_logger(
        service: str,
        environment: str,
        emojis: bool = False,
        context: Optional[LoggerContext] = None,
        adapters: Optional[List[str]] = None,
    ) -> Logger:
        """
        Create logger optimized for frontend applications

        Args:
            service: Service name (usually the frontend app name)
            environment: Environment
            emojis: Enable emojis (recommended for development)
            context: Base context
            adapters: Override default adapters
        """
        # Frontend typically uses console only
        adapters = adapters or ["console"]

        adapter_configs: Dict[str, Dict[str, Any]] = {
            "console": {"colors": True, "use_stderr": False}
        }

        return LoggerFactory.create_logger(
            service=service,
            environment=environment,
            adapters=adapters,
            emojis=emojis,
            context=context,
            adapter_configs=adapter_configs,
        )

    @staticmethod
    def create_backend_logger(
        service: str,
        environment: str,
        emojis: bool = False,
        context: Optional[LoggerContext] = None,
        adapters: Optional[List[str]] = None,
    ) -> Logger:
        """
        Create logger optimized for backend services

        Args:
            service: Service name
            environment: Environment
            emojis: Enable emojis (typically false for production)
            context: Base context with deployment info
            adapters: Override default adapters
        """
        # Backend uses both console and file
        adapters = adapters or ["console", "file"]

        adapter_configs: Dict[str, Dict[str, Any]] = {
            "console": {
                "colors": environment == "development",
                "use_stderr": True,
            },
            "file": {
                "file_path": f"logs/{service}.log",
                "format": "json" if environment == "production" else "text",
                "rotate": True,
                "max_size_mb": 50,
                "max_files": 10,
            },
        }

        return LoggerFactory.create_logger(
            service=service,
            environment=environment,
            adapters=adapters,
            emojis=emojis,
            context=context,
            adapter_configs=adapter_configs,
        )

    @staticmethod
    def create_agent_logger(config: AgentLoggerConfig) -> Logger:
        """
        Create logger optimized for agent systems

        Args:
            config: AgentLoggerConfig containing agent configuration
        """
        service = f"agent-{config.agent_type}"

        # Agent context includes agent-specific information
        agent_context = config.context or LoggerContext()
        agent_context.custom_context.update(
            {"agent_id": config.agent_id, "agent_type": config.agent_type}
        )

        # Agents typically use console and file
        adapters = config.adapters or ["console", "file"]

        adapter_configs: Dict[str, Dict[str, Any]] = {
            "console": {
                "colors": config.environment == "development",
                "use_stderr": False,
            },
            "file": {
                "file_path": (
                    f"logs/agents/{config.agent_type}-{config.agent_id}.log"
                ),
                "format": "json",
                "rotate": True,
                "max_size_mb": 25,
                "max_files": 5,
            },
        }

        return LoggerFactory.create_logger(
            service=service,
            environment=config.environment,
            adapters=adapters,
            emojis=config.emojis,
            context=agent_context,
            adapter_configs=adapter_configs,
        )

    @staticmethod
    def create_infrastructure_logger(
        component: str,
        environment: str,
        emojis: bool = False,
        context: Optional[LoggerContext] = None,
        adapters: Optional[List[str]] = None,
    ) -> Logger:
        """
        Create logger optimized for infrastructure components

        Args:
            component: Infrastructure component name
            environment: Environment
            emojis: Enable emojis (typically false)
            context: Base context with infrastructure info
            adapters: Override default adapters
        """
        service = f"infra-{component}"

        # Infrastructure typically uses structured logging
        adapters = adapters or ["console", "file"]

        adapter_configs: Dict[str, Dict[str, Any]] = {
            "console": {
                "colors": False,  # Infrastructure logs are typically plain
                "use_stderr": True,
            },
            "file": {
                "file_path": f"logs/infrastructure/{component}.log",
                "format": "json",  # Always structured for infrastructure
                "rotate": True,
                "max_size_mb": 100,
                "max_files": 20,
            },
        }

        return LoggerFactory.create_logger(
            service=service,
            environment=environment,
            adapters=adapters,
            emojis=emojis,
            context=context,
            adapter_configs=adapter_configs,
        )
