#!/bin/bash

# Lint TypeScript code with eslint
echo "Running eslint on TypeScript code..."

cd "$(dirname "$0")/.."

# Run eslint on the TypeScript client
cd clients/typescript
pnpm run lint

echo "TypeScript linting completed."