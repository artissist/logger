#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later

# Sync client package versions with root package.json version
# This script ensures all client packages use the same version as the root

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGGER_DIR="$(dirname "$SCRIPT_DIR")"

# Read version from root package.json
ROOT_VERSION=$(jq -r '.version' "$LOGGER_DIR/package.json")

echo "🔄 Syncing client versions to root version: $ROOT_VERSION"

# Update TypeScript client version
echo "📦 Updating TypeScript client version..."
cd "$LOGGER_DIR/clients/typescript"
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"${ROOT_VERSION}\"/" package.json
rm -f package.json.bak
echo "✅ TypeScript client updated to version: $(jq -r '.version' package.json)"

# Update Python client version in setup.py
echo "🐍 Updating Python client version..."
cd "$LOGGER_DIR/clients/python"
sed -i.bak "s/version=\"[^\"]*\"/version=\"${ROOT_VERSION}\"/" setup.py
rm -f setup.py.bak
echo "✅ Python client updated to version: $(grep 'version=' setup.py | cut -d'"' -f2)"

echo "🎉 All client versions synced to: $ROOT_VERSION"
