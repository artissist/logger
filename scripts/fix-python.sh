#!/bin/bash

# Auto-fix Python code issues
echo "🔧 Auto-fixing Python code issues..."

cd "$(dirname "$0")/../clients/python"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    PYTHON="venv/bin/python"
else
    PYTHON="python3"
fi

# 1. Auto-format with Black (fixes most formatting issues)
echo "📝 Auto-formatting with Black..."
if [ -f "venv/bin/black" ] || command -v black &> /dev/null; then
    $PYTHON -m black artissist_logger/
    echo "✅ Black formatting completed"
else
    echo "⚠️  Black not found"
fi

# 2. Auto-fix imports with isort
echo "📦 Organizing imports with isort..."
if [ -f "venv/bin/isort" ] || command -v isort &> /dev/null; then
    $PYTHON -m isort artissist_logger/
    echo "✅ Import organization completed"
else
    echo "⚠️  isort not found, installing..."
    pip install isort
    $PYTHON -m isort artissist_logger/
fi

# 3. Auto-fix some flake8 issues with autopep8
echo "🔧 Auto-fixing PEP8 issues with autopep8..."
if [ -f "venv/bin/autopep8" ] || command -v autopep8 &> /dev/null; then
    $PYTHON -m autopep8 --in-place --aggressive --aggressive artissist_logger/
    echo "✅ PEP8 auto-fixes completed"
else
    echo "⚠️  autopep8 not found, installing..."
    pip install autopep8
    $PYTHON -m autopep8 --in-place --aggressive --aggressive artissist_logger/
fi

# 4. Fix line length issues specifically
echo "📏 Fixing long lines..."
if command -v sed &> /dev/null; then
    # This is a basic approach - for complex cases, manual fixing is better
    find artissist_logger/ -name "*.py" -exec sed -i.bak 's/\(.\{79\}\).*/\1\\/' {} \;
    # Clean up backup files
    find artissist_logger/ -name "*.bak" -delete
fi

echo ""
echo "🎯 Auto-fix completed! Running linter to check results..."
echo ""

# Run the linter again to see improvements
../../../scripts/lint-python.sh