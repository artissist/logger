# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pytest configuration and fixtures"""

import pytest

from artissist_logger.context import ContextManager


@pytest.fixture(autouse=True)
def clear_context():
    """Clear context before and after each test"""
    ContextManager.clear_context()
    yield
    ContextManager.clear_context()
