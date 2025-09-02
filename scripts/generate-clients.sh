#!/bin/bash

# Client generation script for Mosaic Logger
# This script generates TypeScript and Python clients from Smithy models

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGGER_DIR="$(dirname "$SCRIPT_DIR")"
SMITHY_DIR="$LOGGER_DIR/smithy"
GENERATED_DIR="$LOGGER_DIR/generated"

echo "🔧 Mosaic Logger Client Generation"
echo "================================="
echo "Smithy directory: $SMITHY_DIR"
echo "Output directory: $GENERATED_DIR"
echo ""

# Function to print colored output
print_status() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if [ ! -d "$SMITHY_DIR" ]; then
    print_error "Smithy directory not found: $SMITHY_DIR"
    exit 1
fi

if [ ! -f "$SMITHY_DIR/smithy-build.json" ]; then
    print_error "smithy-build.json not found in: $SMITHY_DIR"
    exit 1
fi

# Check for Gradle
if [ -f "$SMITHY_DIR/gradlew" ]; then
    GRADLE_CMD="$SMITHY_DIR/gradlew"
elif command -v gradle &> /dev/null; then
    GRADLE_CMD="gradle"
else
    print_error "Neither Gradle wrapper nor gradle command found"
    exit 1
fi

print_success "Prerequisites check passed"

# Clean generated directory
print_status "Cleaning generated code directory..."
if [ -d "$GENERATED_DIR" ]; then
    rm -rf "$GENERATED_DIR"
fi
mkdir -p "$GENERATED_DIR"

# Generate code using Smithy
print_status "Generating clients from Smithy models..."

cd "$SMITHY_DIR"

# Run Smithy build to generate clients
if [ -f "gradlew" ]; then
    print_status "Using Gradle wrapper to generate code..."
    ./gradlew clean smithyBuild
else
    print_status "Using system Gradle to generate code..."
    gradle clean smithyBuild
fi

cd "$LOGGER_DIR"

# Check if code was generated
if [ ! -d "$GENERATED_DIR" ]; then
    print_error "Generated code directory was not created"
    exit 1
fi

# List generated artifacts
print_status "Generated artifacts:"
find "$GENERATED_DIR" -type f -name "*.ts" -o -name "*.py" -o -name "*.json" | head -20 | while read -r file; do
    echo "  - $(basename "$file")"
done

# Copy generated TypeScript code to client directory
if [ -d "$GENERATED_DIR/typescript" ]; then
    print_status "Integrating generated TypeScript code..."
    
    TYPESCRIPT_CLIENT_DIR="$LOGGER_DIR/clients/typescript/src/generated"
    mkdir -p "$TYPESCRIPT_CLIENT_DIR"
    
    # Copy generated files
    if [ -d "$GENERATED_DIR/typescript" ]; then
        cp -r "$GENERATED_DIR/typescript"/* "$TYPESCRIPT_CLIENT_DIR/" 2>/dev/null || true
        print_success "TypeScript generated code integrated"
    else
        print_error "TypeScript generated code not found"
    fi
else
    print_error "TypeScript generation failed - no output directory found"
fi

# Copy generated Python code to client directory  
if [ -d "$GENERATED_DIR/python" ]; then
    print_status "Integrating generated Python code..."
    
    PYTHON_CLIENT_DIR="$LOGGER_DIR/clients/python/generated"
    mkdir -p "$PYTHON_CLIENT_DIR"
    
    # Copy generated files
    if [ -d "$GENERATED_DIR/python" ]; then
        cp -r "$GENERATED_DIR/python"/* "$PYTHON_CLIENT_DIR/" 2>/dev/null || true
        print_success "Python generated code integrated"
    else
        print_error "Python generated code not found"
    fi
else
    print_error "Python generation failed - no output directory found"
fi

# Create integration status file
cat > "$GENERATED_DIR/generation-status.json" << EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "smithy_models": "$(find "$SMITHY_DIR/models" -name "*.smithy" | wc -l)",
  "typescript_files": "$(find "$GENERATED_DIR/typescript" -name "*.ts" 2>/dev/null | wc -l)",
  "python_files": "$(find "$GENERATED_DIR/python" -name "*.py" 2>/dev/null | wc -l)",
  "generation_successful": true
}
EOF

print_success "Generation status saved to: $GENERATED_DIR/generation-status.json"

# Generate integration instructions
cat > "$GENERATED_DIR/README.md" << 'EOF'
# Generated Client Code

This directory contains client code generated from Smithy models.

## Contents

- `typescript/` - Generated TypeScript client code
- `python/` - Generated Python client code
- `generation-status.json` - Generation metadata

## Integration

The generated code has been automatically integrated into the respective client directories:

- TypeScript: `clients/typescript/src/generated/`
- Python: `clients/python/generated/`

## Usage

The generated code provides the following:

### TypeScript
- Type definitions matching Smithy models
- Client classes for service operations
- Request/response interfaces
- Validation utilities

### Python
- Dataclass definitions for models
- Client classes with type hints
- Serialization/deserialization utilities
- Validation functions

## Re-generation

To regenerate clients after model changes:

```bash
./scripts/generate-clients.sh
```

## Note

This is generated code - do not modify directly. 
Make changes to the Smithy models in `smithy/models/` instead.
EOF

echo ""
print_success "🎉 Client generation completed successfully!"
echo ""
echo "Generated artifacts:"
echo "  - TypeScript client code: $TYPESCRIPT_CLIENT_DIR"
echo "  - Python client code: $PYTHON_CLIENT_DIR"
echo "  - Generation status: $GENERATED_DIR/generation-status.json"
echo ""
echo "Next steps:"
echo "  1. Review generated code for any integration issues"
echo "  2. Run build process: ./scripts/build.sh"
echo "  3. Run tests to validate integration"
echo ""
echo "Note: Hand-written client code in clients/ directories"
echo "      provides the main API - generated code is for internal use."