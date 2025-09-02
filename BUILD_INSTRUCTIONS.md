# Mosaic Logger - Build & Publish Instructions

## 🚀 Quick Start

### Prerequisites
- **Node.js** 14+ (for TypeScript client)
- **Python** 3.8+ (for Python client)
- **Java** 8+ (for Smithy builds)
- **Gradle** (installed automatically via wrapper)

### One-Command Build
```bash
# Build everything (Smithy models, TypeScript client, Python client)
./scripts/build.sh

# Clean build (removes all artifacts first)
./scripts/build.sh --clean

# Development build (runs tests, generates docs)
./scripts/build.sh --dev
```

## 🔧 Step-by-Step Build Process

### 1. Smithy Models (Source of Truth)
```bash
# Navigate to smithy directory
cd smithy

# Generate types from Smithy IDL models
./gradlew clean smithyBuild

# Generate TypeScript interfaces from Smithy model
cd ..
node scripts/generate-typescript.js
```

**Output**: 
- `/generated/source/model/model.json` (67KB Smithy model)
- `/generated/typescript/types.ts` (489 lines of TypeScript interfaces)

### 2. TypeScript Client Build
```bash
cd clients/typescript

# Install dependencies
npm ci

# Run tests and type checking
npm run lint
npm run typecheck
npm test

# Build production bundles
npm run build
```

**Output**:
- `dist/index.js` (52KB CommonJS bundle)
- `dist/index.esm.js` (48KB ES module bundle)
- `dist/*.d.ts` (TypeScript declarations)

### 3. Python Client Build
```bash
cd clients/python

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install build dependencies
pip install wheel setuptools

# Build wheel package
python setup.py bdist_wheel
```

**Output**:
- `dist/mosaic_logger-1.0.0-py3-none-any.whl` (16KB universal wheel)

## 📦 Publishing

### NPM (TypeScript Package)
```bash
cd clients/typescript

# Dry run to check package contents
npm pack
npm publish --dry-run

# Publish to NPM registry
npm publish

# Or publish to private registry
npm publish --registry https://your-private-registry.com
```

### PyPI (Python Package)
```bash
cd clients/python

# Install publishing tools
pip install twine

# Upload to Test PyPI first (recommended)
twine upload --repository testpypi dist/*

# Upload to production PyPI
twine upload dist/*
```

### GitHub Packages (Alternative)
```bash
# Configure npm for GitHub Packages
npm config set @mosaic:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken ${GITHUB_TOKEN}

# Publish
npm publish
```

## 🧪 Testing

### TypeScript Tests
```bash
cd clients/typescript

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Python Tests
```bash
cd clients/python
source venv/bin/activate

# Install test dependencies
pip install -r requirements-dev.txt

# Run tests with pytest
pytest

# Run with coverage
pytest --cov=mosaic_logger
```

### Integration Tests
```bash
# Test TypeScript client installation
npm install ./clients/typescript/dist/@mosaic-logger-1.0.0.tgz

# Test Python client installation
pip install ./clients/python/dist/mosaic_logger-1.0.0-py3-none-any.whl

# Run example usage
node examples/typescript-example.js
python examples/python-example.py
```

## 🚀 Deployment Options

### Docker Container
```dockerfile
# Multi-stage build example
FROM node:18-alpine as typescript-builder
COPY clients/typescript ./
RUN npm ci && npm run build

FROM python:3.11-alpine as python-builder  
COPY clients/python ./
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels .

FROM alpine:latest
RUN apk add --no-cache nodejs npm python3
COPY --from=typescript-builder /dist ./typescript
COPY --from=python-builder /wheels ./python
```

### CI/CD Pipeline (GitHub Actions Example)
```yaml
name: Build and Publish
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          
      # Build everything
      - run: ./scripts/build.sh --clean
      
      # Publish TypeScript
      - run: npm publish
        working-directory: clients/typescript
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          
      # Publish Python
      - run: twine upload dist/*
        working-directory: clients/python
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }}
```

## 📋 Version Management

### Updating Versions
```bash
# Update TypeScript package version
cd clients/typescript
npm version patch  # or minor, major

# Update Python package version (edit setup.py)
cd clients/python
# Manually edit version in setup.py

# Update Smithy model version (edit smithy-build.json)
cd smithy
# Edit packageVersion in smithy-build.json

# Rebuild with new versions
./scripts/build.sh --clean
```

### Release Process
1. **Update versions** in all packages
2. **Run full build** with `./scripts/build.sh --clean --dev`
3. **Run all tests** to ensure quality
4. **Create git tag**: `git tag v1.0.1`
5. **Push tag**: `git push origin v1.0.1`
6. **Publish packages** to registries
7. **Create GitHub release** with changelog

## 🛠️ Development Workflow

### Making Changes to Models
```bash
# 1. Edit Smithy models in smithy/models/
# 2. Rebuild and regenerate types
cd smithy && ./gradlew clean smithyBuild
cd .. && node scripts/generate-typescript.js

# 3. Update client implementations if needed
# 4. Test everything
./scripts/build.sh --dev

# 5. Commit changes
git add .
git commit -m "feat: update logging models with new event types"
```

### Adding New Features
1. **Update Smithy models first** (single source of truth)
2. **Regenerate TypeScript types** automatically  
3. **Update client implementations** to use new types
4. **Add tests** for new functionality
5. **Update documentation** and examples
6. **Build and test** everything

## 📊 Build Artifacts Summary

| Component | Output | Size | Purpose |
|-----------|--------|------|---------|
| Smithy Models | `/generated/source/model/model.json` | 67KB | Service definition |
| TypeScript Types | `/generated/typescript/types.ts` | 13KB | Generated interfaces |
| TS CommonJS | `/clients/typescript/dist/index.js` | 52KB | Node.js compatible |
| TS ESM | `/clients/typescript/dist/index.esm.js` | 48KB | Modern bundlers |
| Python Wheel | `/clients/python/dist/*.whl` | 16KB | Universal Python package |

## 🔍 Troubleshooting

### Common Build Issues

**Java/Gradle Issues:**
```bash
# Set JAVA_HOME if needed
export JAVA_HOME=/opt/homebrew/Cellar/openjdk/24.0.2/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# Regenerate Gradle wrapper
cd smithy && gradle wrapper --gradle-version 8.5
```

**Node.js Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Python Issues:**
```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
```

### Validation
```bash
# Validate Smithy models only
cd smithy && ./gradlew smithyValidate

# Check TypeScript types
cd clients/typescript && npm run typecheck

# Check Python package
cd clients/python && python -c "import mosaic_logger; print('OK')"
```

## 🎯 Success Criteria

A successful build produces:
- ✅ Validated Smithy models (467 shapes)
- ✅ Generated TypeScript types (489 lines)
- ✅ TypeScript bundles (CommonJS + ESM)
- ✅ Python wheel package
- ✅ All tests passing
- ✅ No linting errors
- ✅ Documentation generated

**You're ready to integrate when you see:**
```
🚀 Mosaic Logger build completed successfully!
📦 Generated 54+ types from Smithy models  
✅ TypeScript client built successfully
✅ Python client processed
```