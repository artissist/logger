#!/bin/bash

# Install Python dependencies with optional virtual environment support
# Usage: ./install-python.sh [--no-venv]

set -e

cd "$(dirname "$0")/../clients/python"

USE_VENV=true

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --no-venv) USE_VENV=false ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ "$USE_VENV" = true ]; then
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        if command -v python3 &>/dev/null; then
            PYTHON=python3
        elif command -v python &>/dev/null; then
            PYTHON=python
        else
            echo "Error: Python is not installed." >&2
            exit 1
        fi
        $PYTHON -m venv venv
    fi
    
    # Activate virtual environment
    echo "Activating virtual environment..."
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    
    echo "Installing dependencies in virtual environment..."
else
    echo "Installing dependencies without virtual environment (CI/Docker mode)..."
fi

# Install the package in development mode with all dependencies
pip install -e .[dev]

echo "Python installation complete!"