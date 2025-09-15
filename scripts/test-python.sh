#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later

# Python test script
echo "🧪 Running Python tests..."

cd "$(dirname "$0")/../clients/python"

# Check for test files (excluding venv directory)
if find . -path "./venv" -prune -o \( -name "test_*.py" -o -name "*_test.py" \) -print | grep -q .; then
    echo "📋 Found test files, running pytest..."
    pytest --cov=artissist_logger --cov-report=term-missing
else
    echo "⚠️ No test files found, skipping test execution"
    echo "ℹ️ Create test files in the clients/python directory to enable testing"
fi
