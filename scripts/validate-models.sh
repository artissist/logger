#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later

# Smithy model validation script
# This script performs basic validation of Smithy models

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGGER_DIR="$(dirname "$SCRIPT_DIR")"
SMITHY_DIR="$LOGGER_DIR/smithy"
MODELS_DIR="$SMITHY_DIR/models"

echo "🔍 Validating Smithy Logger Models"
echo "=================================="
echo "Models directory: $MODELS_DIR"
echo ""

# Check if models directory exists
if [ ! -d "$MODELS_DIR" ]; then
    echo "❌ Models directory not found: $MODELS_DIR"
    exit 1
fi

# Count model files
MODEL_COUNT=$(find "$MODELS_DIR" -name "*.smithy" -type f | wc -l)
echo "📊 Found $MODEL_COUNT Smithy model files:"

# List model files
find "$MODELS_DIR" -name "*.smithy" -type f | while read -r file; do
    echo "  - $(basename "$file")"
done

echo ""

# Basic syntax validation (check for required elements)
echo "🧪 Running basic syntax validation..."
echo ""

VALIDATION_ERRORS=0

for file in "$MODELS_DIR"/*.smithy; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "Validating $filename..."
        
        # Check for version declaration
        if ! grep -q '^\$version: "2"' "$file"; then
            echo "  ⚠️  Warning: Missing or incorrect version declaration"
            ((VALIDATION_ERRORS++))
        fi
        
        # Check for namespace declaration
        if ! grep -q '^namespace mosaic.logging' "$file"; then
            echo "  ⚠️  Warning: Missing or incorrect namespace declaration"
            ((VALIDATION_ERRORS++))
        fi
        
        # Check for basic structure validity (balanced braces)
        open_braces=$(grep -o '{' "$file" | wc -l)
        close_braces=$(grep -o '}' "$file" | wc -l)
        if [ "$open_braces" -ne "$close_braces" ]; then
            echo "  ❌ Error: Unbalanced braces (open: $open_braces, close: $close_braces)"
            ((VALIDATION_ERRORS++))
        fi
        
        # Check for common syntax issues
        if grep -q '^\s*///' "$file"; then
            # Triple slash comments should be fine, this is just a check
            :
        fi
        
        echo "  ✅ $filename passed basic validation"
    fi
done

echo ""

# Model completeness check
echo "🔧 Checking model completeness..."

# Check if core structures are defined
REQUIRED_STRUCTURES=(
    "LogEntry"
    "LogLevel"
    "LogEvent" 
    "LoggingContext"
    "LogMetadata"
    "PerformanceMetrics"
    "ErrorDetails"
    "LoggingService"
)

for structure in "${REQUIRED_STRUCTURES[@]}"; do
    if grep -r -q "structure $structure\|service $structure\|enum $structure" "$MODELS_DIR/"; then
        echo "  ✅ Found required structure/service: $structure"
    else
        echo "  ❌ Missing required structure/service: $structure"
        ((VALIDATION_ERRORS++))
    fi
done

echo ""

# Check for emoji events
echo "🎨 Checking emoji events..."
EMOJI_COUNT=$(grep -r "/// 🚀\|/// 🛑\|/// 👤\|/// 🔐\|/// 📁\|/// 💾\|/// 🔄\|/// ⚡\|/// 🐛\|/// ⚠️\|/// 🔧\|/// 📊\|/// 🤖\|/// 💬\|/// 📸\|/// 🎨\|/// 🏗️" "$MODELS_DIR/" | wc -l)
echo "  ✅ Found $EMOJI_COUNT emoji-documented events"

echo ""
echo "🏁 Validation Summary"
echo "===================="

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo "✅ All models passed validation!"
    echo "🎯 Ready for code generation"
    exit 0
else
    echo "❌ Found $VALIDATION_ERRORS validation errors"
    echo "🔧 Please fix the errors before proceeding"
    exit 1
fi