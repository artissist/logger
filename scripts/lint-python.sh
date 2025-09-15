#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later

# Comprehensive Python linting script
echo "🔍 Running Python linting and type checking..."

cd "$(dirname "$0")/../clients/python"

# Use python3 directly since tools are installed system-wide
PYTHON="python3"
PIP="pip3"

LINT_ERRORS=0

# 1. Run Black formatter check
echo "📝 Checking code formatting with Black..."
if $PYTHON -c "import black" 2>/dev/null; then
    if ! $PYTHON -m black --check artissist_logger/; then
        echo "❌ Black formatting issues found"
        LINT_ERRORS=$((LINT_ERRORS + 1))
    else
        echo "✅ Black formatting check passed"
    fi
else
    echo "⚠️  Black not found, skipping formatting check"
fi

# 2. Run MyPy type checking
echo "🔬 Running type checking with MyPy..."
if $PYTHON -c "import mypy" 2>/dev/null; then
    if ! $PYTHON -m mypy artissist_logger/; then
        echo "❌ MyPy type checking found issues"
        LINT_ERRORS=$((LINT_ERRORS + 1))
    else
        echo "✅ MyPy type checking passed"
    fi
else
    echo "⚠️  MyPy not found, skipping type checking"
fi

# 3. Run Flake8 style checking
echo "📏 Running style checking with Flake8..."
if $PYTHON -c "import flake8" 2>/dev/null; then
    if ! $PYTHON -m flake8 artissist_logger/; then
        echo "❌ Flake8 style issues found"
        LINT_ERRORS=$((LINT_ERRORS + 1))
    else
        echo "✅ Flake8 style check passed"
    fi
else
    echo "⚠️  Flake8 not found, skipping style checking"
fi

# 4. Run Pylint comprehensive linting
echo "🔍 Running comprehensive linting with Pylint..."
if $PYTHON -c "import pylint" 2>/dev/null; then
    if ! $PYTHON -m pylint artissist_logger/; then
        echo "❌ Pylint found issues"
        LINT_ERRORS=$((LINT_ERRORS + 1))
    else
        echo "✅ Pylint check passed (10/10)"
    fi
else
    echo "⚠️  Pylint not found, skipping comprehensive linting"
fi

# 5. Lint example files (with relaxed rules)
if [ -d "../../examples" ]; then
    echo "📄 Linting example files..."
    find ../../examples/ -name "*.py" -exec $PYTHON -m pylint --disable=all --enable=syntax-error,undefined-variable {} \; 2>/dev/null || true
fi

# Summary
echo ""
echo "🎯 Python Linting Summary:"
if [ $LINT_ERRORS -eq 0 ]; then
    echo "✅ All linting checks passed!"
    exit 0
else
    echo "❌ Found issues in $LINT_ERRORS linting tool(s)"
    echo "💡 Run individual tools with --fix options where available"
    exit 1
fi