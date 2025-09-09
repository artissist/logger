#!/bin/bash

# Lint Python code with pylint
echo "Running pylint on Python code..."

cd "$(dirname "$0")/.."

# Run pylint on the main package
pylint clients/python/artissist_logger/

# Run pylint on example files
find examples/ -name "*.py" -exec pylint {} \;

echo "Python linting completed."