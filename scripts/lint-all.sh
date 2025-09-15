#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later

# Lint all code (Python and TypeScript)
echo "Running linters on all code..."

cd "$(dirname "$0")/.."

# Run Python linting
echo "=== Python Linting ==="
./scripts/lint-python.sh

echo ""
echo "=== TypeScript Linting ==="
./scripts/lint-typescript.sh

echo ""
echo "All linting completed."
