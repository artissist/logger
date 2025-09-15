# Contributing to Artissist Logger

Thank you for your interest in contributing to the Artissist Logger! This guide will help you get started with contributing to this unified logging library.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Getting Started

The Artissist Logger is a monorepo containing TypeScript and Python client libraries with shared Smithy IDL type definitions. Before contributing, please:

1. **Read the README** - Understand the project structure and goals
2. **Check existing issues** - See if your contribution aligns with planned work
3. **Open an issue** - Discuss new features or major changes before implementation

## Development Setup

### Prerequisites

- **Node.js** (≥16.0.0) and **pnpm** (≥10.0.0)
- **Python** (≥3.8) with **pip**
- **Java** (≥11) for Smithy code generation
- **Git** for version control

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/artissist/logger.git
cd logger

# Install dependencies
pnpm install
./scripts/install-python.sh

# Install pre-commit hooks (required for all contributors)
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg

# Generate types from Smithy schemas
./scripts/generate-clients.sh

# Run tests to verify setup
pnpm run test
```

## Pre-commit Hooks

**⚠️ Pre-commit hooks are mandatory for all contributors.** They ensure code quality and consistency across the project.

### What Pre-commit Does

Our pre-commit configuration automatically:

- **Formats code** - TypeScript (ESLint + Prettier), Python (Black)
- **Validates syntax** - YAML, JSON, TOML files
- **Checks licensing** - Ensures SPDX license headers are present
- **Type checking** - TypeScript and Python (MyPy)
- **Linting** - Comprehensive code quality checks
- **Validates models** - Smithy IDL schema validation

### Working with Pre-commit

```bash
# Install pre-commit (one-time setup)
pip install pre-commit
pre-commit install
pre-commit install --hook-type commit-msg

# Run hooks manually on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files
pre-commit run eslint --all-files

# Skip hooks (use sparingly, for emergencies only)
git commit --no-verify -m "emergency commit"
```

### Common Pre-commit Issues

1. **License headers missing**: Add `# SPDX-License-Identifier: AGPL-3.0-or-later` to new files
2. **Formatting issues**: Pre-commit will auto-fix most formatting issues
3. **Type errors**: Fix TypeScript/Python type issues before committing
4. **Test failures**: Ensure all tests pass before committing

## Code Style and Standards

### TypeScript

- **ESLint + Prettier** for formatting and style
- **Strict TypeScript** configuration
- **Export interfaces** from `types.ts` files
- **Use generated types** from Smithy (never hand-write duplicates)

### Python

- **Black** for code formatting (line length: 88)
- **Type hints** required for all public APIs
- **Docstrings** for all public functions and classes
- **Use generated types** from Smithy (import from `generated_types.py`)

### Smithy IDL

- **Required fields** marked with `@required`
- **Documentation** for all structures and fields
- **Validation constraints** using Smithy traits (`@pattern`, `@range`, etc.)
- **Consistent naming** across TypeScript and Python

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(typescript): add new emoji mapping system
fix(python): resolve import cycle in factory module
docs: update API documentation for v0.2.0
refactor: migrate to Smithy-generated types
test: add comprehensive adapter tests
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Testing

### Running Tests

```bash
# Run all tests
pnpm run test

# TypeScript tests only
pnpm run test:ts

# Python tests only
pnpm run test:py

# Run tests with coverage
cd clients/typescript && pnpm test -- --coverage
```

### Writing Tests

- **Unit tests** for all public APIs
- **Integration tests** for adapters and complex flows
- **Type tests** to verify generated type correctness
- **Error handling** test cases for edge conditions

### Test Requirements

- All new features **must have tests**
- Bug fixes **must include regression tests**
- Tests must **pass on all platforms** (macOS, Linux, Windows)
- **No flaky tests** - ensure deterministic behavior

## Submitting Changes

### Pull Request Process

1. **Fork the repository** and create a feature branch
2. **Make your changes** following our code standards
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run pre-commit** hooks and fix any issues
6. **Create pull request** with clear description

### Pull Request Requirements

- [ ] **Pre-commit hooks pass** (enforced automatically)
- [ ] **All tests pass** on CI
- [ ] **Documentation updated** for user-facing changes
- [ ] **Breaking changes documented** in BREAKING_CHANGES.md
- [ ] **Conventional commit messages** used

### Review Process

- **Maintainer review** required for all PRs
- **CI checks** must pass (tests, linting, type checking)
- **Breaking changes** require special approval
- **Documentation review** for user-facing changes

## Release Process

### Version Management

- **Semantic versioning** (major.minor.patch)
- **Breaking changes** increment major version
- **New features** increment minor version
- **Bug fixes** increment patch version

### Release Steps (Maintainers Only)

```bash
# Update version across all packages
pnpm version patch|minor|major

# Update BREAKING_CHANGES.md if needed
# Update README.md and documentation
# Create release PR

# After merge, tag and publish
git tag v0.2.0
git push --tags
pnpm run build
npm publish  # TypeScript
python -m build && twine upload dist/*  # Python
```

## Development Scripts

```bash
# Code generation
./scripts/generate-clients.sh     # Generate all client code
node scripts/generate-typescript.js  # TypeScript only
python scripts/generate-python.py    # Python only

# Building
pnpm run build                    # Build all packages
pnpm run build:ts                 # TypeScript only
pnpm run build:py                 # Python only

# Linting and formatting
pnpm run lint                     # Lint all code
pnpm run lint:fix                 # Auto-fix linting issues
pre-commit run --all-files        # Run all pre-commit hooks

# Validation
./scripts/validate-models.sh      # Validate Smithy models
pnpm run validate                 # Full validation (lint + test)
```

## Getting Help

- **Documentation**: Check README.md and inline code documentation
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community Discord server (link in README)

## License

By contributing to Artissist Logger, you agree that your contributions will be licensed under the AGPL-3.0-or-later license. All source files must include the SPDX license identifier:

```
// SPDX-License-Identifier: AGPL-3.0-or-later
```

Thank you for contributing to Artissist Logger! 🚀