# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Output adapters for Artissist Logger Python client
"""

from .base import LogAdapter
from .console import ConsoleAdapter
from .file import FileAdapter

__all__ = [
    "LogAdapter",
    "ConsoleAdapter",
    "FileAdapter",
]
