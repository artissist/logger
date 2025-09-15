#!/bin/bash

# Master build script for Artissist Logger
# This script orchestrates the entire build process

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGGER_DIR="$(dirname "$SCRIPT_DIR")"
SMITHY_DIR="$LOGGER_DIR/smithy"
CLIENTS_DIR="$LOGGER_DIR/clients"

echo "🏗️  Artissist Logger Build Script"
echo "=============================="
echo "Logger directory: $LOGGER_DIR"
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

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# Function to check if command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed or not in PATH"
        exit 1
    fi
}

# Validate prerequisites
print_status "Checking build prerequisites..."

check_command "node"
check_command "npm"
check_command "java"

# Check if Gradle wrapper exists or gradle is in path
if [ -f "$SMITHY_DIR/gradlew" ]; then
    GRADLE_CMD="$SMITHY_DIR/gradlew"
elif command -v gradle &> /dev/null; then
    GRADLE_CMD="gradle"
else
    print_error "Neither Gradle wrapper nor gradle command found"
    exit 1
fi

print_success "Prerequisites check passed"

# Parse command line arguments
SKIP_SMITHY=false
SKIP_TYPESCRIPT=false
SKIP_PYTHON=false
BUILD_MODE="production"
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-smithy)
            SKIP_SMITHY=true
            shift
            ;;
        --skip-typescript)
            SKIP_TYPESCRIPT=true
            shift
            ;;
        --skip-python)
            SKIP_PYTHON=true
            shift
            ;;
        --dev)
            BUILD_MODE="development"
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-smithy      Skip Smithy model validation and code generation"
            echo "  --skip-typescript  Skip TypeScript client build"
            echo "  --skip-python     Skip Python client build"
            echo "  --dev             Development build mode"
            echo "  --clean           Clean build artifacts before building"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            print_warning "Unknown option: $1"
            shift
            ;;
    esac
done

echo "Build configuration:"
echo "  Mode: $BUILD_MODE"
echo "  Skip Smithy: $SKIP_SMITHY"
echo "  Skip TypeScript: $SKIP_TYPESCRIPT"
echo "  Skip Python: $SKIP_PYTHON"
echo "  Clean: $CLEAN"
echo ""

# Clean build artifacts if requested
if [ "$CLEAN" = true ]; then
    print_status "Cleaning build artifacts..."
    
    # Clean Smithy generated code
    if [ -d "$LOGGER_DIR/generated" ]; then
        rm -rf "$LOGGER_DIR/generated"
        print_success "Cleaned Smithy generated code"
    fi
    
    # Clean TypeScript build
    if [ -d "$CLIENTS_DIR/typescript/dist" ]; then
        rm -rf "$CLIENTS_DIR/typescript/dist"
        print_success "Cleaned TypeScript build artifacts"
    fi
    
    # Clean TypeScript node_modules if in dev mode
    if [ "$BUILD_MODE" = "development" ] && [ -d "$CLIENTS_DIR/typescript/node_modules" ]; then
        rm -rf "$CLIENTS_DIR/typescript/node_modules"
        print_success "Cleaned TypeScript dependencies"
    fi
    
    # Clean Python build artifacts
    find "$CLIENTS_DIR/python" -name "*.pyc" -delete 2>/dev/null || true
    find "$CLIENTS_DIR/python" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    if [ -d "$CLIENTS_DIR/python/dist" ]; then
        rm -rf "$CLIENTS_DIR/python/dist"
        print_success "Cleaned Python build artifacts"
    fi
    
    print_success "Clean completed"
    echo ""
fi

# Step 1: Validate and build Smithy models
if [ "$SKIP_SMITHY" = false ]; then
    print_status "Step 1: Building Smithy models..."
    
    cd "$SMITHY_DIR"
    
    # Set Java environment for Smithy build (only if not already set)
    if [ -z "$JAVA_HOME" ] && [ -d "/opt/homebrew/Cellar/openjdk/24.0.2/libexec/openjdk.jdk/Contents/Home" ]; then
        export JAVA_HOME=/opt/homebrew/Cellar/openjdk/24.0.2/libexec/openjdk.jdk/Contents/Home
        export PATH=$JAVA_HOME/bin:$PATH
        print_status "Using local Homebrew Java installation"
    elif [ -n "$JAVA_HOME" ]; then
        print_status "Using system Java installation: $JAVA_HOME"
    else
        print_status "Using Java from PATH"
    fi
    
    if [ -f "gradlew" ]; then
        print_status "Using Gradle wrapper"
        ./gradlew clean smithyBuild
    else
        print_status "Using system Gradle"
        gradle clean smithyBuild
    fi
    
    print_success "Smithy models built and validated"
    cd "$LOGGER_DIR"
    
    # Generate TypeScript types from Smithy models
    if [ -f "$SCRIPT_DIR/generate-typescript.js" ]; then
        print_status "Generating TypeScript types from Smithy models..."
        node "$SCRIPT_DIR/generate-typescript.js"
        print_success "TypeScript types generated"
    fi
    
else
    print_warning "Skipping Smithy model build"
fi

echo ""

# Step 2: Build TypeScript client
if [ "$SKIP_TYPESCRIPT" = false ]; then
    print_status "Step 2: Building TypeScript client..."
    
    cd "$CLIENTS_DIR/typescript"
    
    # Install dependencies
    if [ ! -d "node_modules" ] || [ "$BUILD_MODE" = "development" ]; then
        print_status "Installing TypeScript dependencies..."
        npm ci
    fi
    
    # Run linting
    print_status "Running TypeScript linter..."
    npm run lint || print_warning "Linting found issues (continuing build)"
    
    # Run type checking
    print_status "Running TypeScript type checking..."
    npm run typecheck
    
    # Run tests
    if [ "$BUILD_MODE" = "development" ]; then
        print_status "Running TypeScript tests..."
        npm test || print_warning "Some tests failed (continuing build)"
    fi
    
    # Build the package
    print_status "Building TypeScript package..."
    npm run build
    
    # Generate documentation in development mode
    if [ "$BUILD_MODE" = "development" ]; then
        print_status "Generating TypeScript documentation..."
        npm run docs || print_warning "Documentation generation failed (continuing)"
    fi
    
    print_success "TypeScript client built successfully"
    cd "$LOGGER_DIR"
else
    print_warning "Skipping TypeScript client build"
fi

echo ""

# Step 3: Build Python client (if structure exists)
if [ "$SKIP_PYTHON" = false ] && [ -d "$CLIENTS_DIR/python" ]; then
    print_status "Step 3: Building Python client..."
    
    cd "$CLIENTS_DIR/python"
    
    # Check if virtual environment should be created
    if [ ! -d "venv" ] && [ "$BUILD_MODE" = "development" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
    elif [ -f "venv/bin/activate" ]; then
        print_status "Activating Python virtual environment..."
        source venv/bin/activate
    fi
    
    # Install dependencies
    if [ -f "requirements.txt" ]; then
        print_status "Installing Python dependencies..."
        pip install -r requirements.txt
    fi
    
    if [ -f "requirements-dev.txt" ] && [ "$BUILD_MODE" = "development" ]; then
        print_status "Installing Python development dependencies..."
        pip install -r requirements-dev.txt
    fi
    
    # Run linting (if available)
    if command -v black &> /dev/null; then
        print_status "Running Python code formatting..."
        black --check . || print_warning "Python formatting issues found"
    fi
    
    if command -v mypy &> /dev/null; then
        print_status "Running Python type checking..."
        # Clean build directory to avoid duplicate module errors
        rm -rf build/
        mypy . || print_warning "Python type checking found issues"
    fi
    
    # Run tests (if available)
    if [ "$BUILD_MODE" = "development" ] && command -v pytest &> /dev/null; then
        print_status "Running Python tests..."
        pytest || print_warning "Some Python tests failed"
    fi
    
    # Build package
    if [ -f "setup.py" ]; then
        print_status "Building Python package..."
        python setup.py bdist_wheel
    fi
    
    print_success "Python client built successfully"
    cd "$LOGGER_DIR"
elif [ "$SKIP_PYTHON" = false ]; then
    print_warning "Python client directory not found - skipping Python build"
else
    print_warning "Skipping Python client build"
fi

echo ""

# Step 4: Generate build report
print_status "Generating build report..."

BUILD_REPORT="$LOGGER_DIR/build-report.md"
cat > "$BUILD_REPORT" << EOF
# Artissist Logger Build Report

**Build Date**: $(date)
**Build Mode**: $BUILD_MODE
**Build Host**: $(hostname)

## Build Configuration

- Skip Smithy: $SKIP_SMITHY
- Skip TypeScript: $SKIP_TYPESCRIPT  
- Skip Python: $SKIP_PYTHON
- Clean Build: $CLEAN

## Artifacts Generated

### Smithy Models
EOF

if [ "$SKIP_SMITHY" = false ]; then
    echo "- ✅ Smithy models validated and built" >> "$BUILD_REPORT"
    if [ -d "$LOGGER_DIR/generated" ]; then
        echo "- ✅ Generated code available in generated/" >> "$BUILD_REPORT"
    fi
else
    echo "- ⏭️ Smithy build skipped" >> "$BUILD_REPORT"
fi

cat >> "$BUILD_REPORT" << EOF

### TypeScript Client
EOF

if [ "$SKIP_TYPESCRIPT" = false ]; then
    echo "- ✅ TypeScript client built successfully" >> "$BUILD_REPORT"
    if [ -f "$CLIENTS_DIR/typescript/dist/index.js" ]; then
        echo "- ✅ Distribution files generated" >> "$BUILD_REPORT"
    fi
    if [ -f "$CLIENTS_DIR/typescript/dist/index.d.ts" ]; then
        echo "- ✅ Type declarations generated" >> "$BUILD_REPORT"
    fi
else
    echo "- ⏭️ TypeScript build skipped" >> "$BUILD_REPORT"
fi

cat >> "$BUILD_REPORT" << EOF

### Python Client
EOF

if [ "$SKIP_PYTHON" = false ] && [ -d "$CLIENTS_DIR/python" ]; then
    echo "- ✅ Python client processed" >> "$BUILD_REPORT"
    if [ -d "$CLIENTS_DIR/python/dist" ]; then
        echo "- ✅ Python wheel generated" >> "$BUILD_REPORT"
    fi
elif [ "$SKIP_PYTHON" = false ]; then
    echo "- ⚠️ Python client directory not found" >> "$BUILD_REPORT"
else
    echo "- ⏭️ Python build skipped" >> "$BUILD_REPORT"
fi

cat >> "$BUILD_REPORT" << EOF

## File Sizes

EOF

# Add file sizes for key artifacts
if [ -f "$CLIENTS_DIR/typescript/dist/index.js" ]; then
    SIZE=$(du -h "$CLIENTS_DIR/typescript/dist/index.js" | cut -f1)
    echo "- TypeScript bundle: $SIZE" >> "$BUILD_REPORT"
fi

if [ -f "$CLIENTS_DIR/python/dist"/*.whl ]; then
    for wheel in "$CLIENTS_DIR/python/dist"/*.whl; do
        if [ -f "$wheel" ]; then
            SIZE=$(du -h "$wheel" | cut -f1)
            FILENAME=$(basename "$wheel")
            echo "- Python wheel ($FILENAME): $SIZE" >> "$BUILD_REPORT"
        fi
    done
fi

echo "" >> "$BUILD_REPORT"
echo "Build completed at $(date)" >> "$BUILD_REPORT"

print_success "Build report generated: $BUILD_REPORT"

# Final summary
echo ""
echo "🎉 Build Summary"
echo "==============="

if [ "$SKIP_SMITHY" = false ]; then
    print_success "✅ Smithy models built and validated"
fi

if [ "$SKIP_TYPESCRIPT" = false ]; then
    print_success "✅ TypeScript client built successfully"
fi

if [ "$SKIP_PYTHON" = false ] && [ -d "$CLIENTS_DIR/python" ]; then
    print_success "✅ Python client processed"
fi

echo ""
print_success "🚀 Artissist Logger build completed successfully!"
echo ""
echo "Next steps:"
echo "  - Review build report: $BUILD_REPORT"
echo "  - Run integration tests with: npm test (in clients/typescript)"
echo "  - Publish packages: npm publish (in clients/typescript)"

if [ "$BUILD_MODE" = "development" ]; then
    echo "  - Run examples: node examples/complete-demo.ts"
fi