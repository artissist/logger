#!/bin/bash

# Lint Python code with pylint
echo "Running pylint on Python code..."

cd "$(dirname "$0")/../clients/python"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Check if pylint is available
if ! command -v pylint &> /dev/null; then
    echo "Warning: pylint not found, skipping Python linting"
    exit 0
fi

# Run pylint on the main package
pylint artissist_logger/

# Run pylint on example files if they exist
if [ -d "../../examples" ]; then
    find ../../examples/ -name "*.py" -exec pylint {} \; 2>/dev/null || true
fi

echo "Python linting completed."