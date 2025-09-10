"""
Console output adapter for Artissist Logger Python client
"""

import sys
from typing import Dict, Any
from .base import LogAdapter
from ..types import LogMessage, LogLevel


class ConsoleAdapter(LogAdapter):
    """Outputs log messages to console with optional color formatting"""

    # ANSI color codes
    COLORS = {
        LogLevel.DEBUG: "\033[36m",  # Cyan
        LogLevel.INFO: "\033[32m",  # Green
        LogLevel.WARN: "\033[33m",  # Yellow
        LogLevel.ERROR: "\033[31m",  # Red
    }
    RESET = "\033[0m"

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.use_colors = config.get("colors", True)
        self.output_stream = (
            sys.stderr if config.get("use_stderr", False) else sys.stdout
        )

    async def write(self, message: LogMessage, formatted_message: str):
        """Write message to console with optional color formatting"""
        output_message = formatted_message

        if self.use_colors and sys.stdout.isatty():
            color = self.COLORS.get(message.level, "")
            output_message = f"{color}{formatted_message}{self.RESET}"

        print(output_message, file=self.output_stream)

        # Add error details if present
        if message.error:
            error_output = f"  ERROR: {message.error.type}: {message.error.message}"
            if self.use_colors and sys.stdout.isatty():
                error_output = (
                    f"{self.COLORS[LogLevel.ERROR]}{error_output}{self.RESET}"
                )
            print(error_output, file=self.output_stream)

        # Add metrics if present
        if message.metrics:
            metrics_dict = message.metrics.to_dict()
            if metrics_dict:
                metrics_output = "  METRICS: " + ", ".join(
                    f"{k}={v}" for k, v in metrics_dict.items()
                )
                if self.use_colors and sys.stdout.isatty():
                    metrics_output = f"\033[35m{metrics_output}{self.RESET}"  # Magenta
                print(metrics_output, file=self.output_stream)

        # Flush output
        self.output_stream.flush()

    async def close(self):
        """Console adapter doesn't need cleanup"""
        pass
