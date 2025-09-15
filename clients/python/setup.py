#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Setup configuration for Artissist Logger Python client
"""

from setuptools import setup, find_packages
import pathlib

# Get the long description from the README file
here = pathlib.Path(__file__).parent
long_description = (
    (here / "README.md").read_text(encoding="utf-8")
    if (here / "README.md").exists()
    else ""
)

setup(
    name="artissist-logger",
    version="0.1.2",
    description="Platform-agnostic logging client for Artissist",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/artissist/logger",
    author="Artissist",
    author_email="dev@artissist.com",
    license="AGPL-3.0-or-later",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Logging",
        "License :: OSI Approved :: "
        "GNU Affero General Public License v3 or later (AGPLv3+)",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    keywords="logging, observability, telemetry, platform, artissist",
    packages=find_packages(exclude=["tests", "tests.*"]),
    python_requires=">=3.8",
    install_requires=[
        "typing_extensions>=4.0.0",
        "dataclasses; python_version<'3.7'",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=22.0.0",
            "mypy>=1.0.0",
            "flake8>=5.0.0",
            "pylint>=2.15.0",
            "types-aiofiles>=22.0.0",
            "aiofiles>=22.0.0",  # Include for proper type checking
        ],
        "file": [
            "aiofiles>=22.0.0",
        ],
        "cloud": [
            "boto3>=1.26.0",
            "azure-monitor-opentelemetry-exporter>=1.0.0b17",
            "google-cloud-logging>=3.4.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "artissist-logger-validate=artissist_logger.cli:validate",
        ],
    },
    project_urls={
        "Bug Reports": "https://github.com/artissist/logger/issues",
        "Source": "https://github.com/artissist/logger",
        "Documentation": "https://github.com/artissist/logger",
    },
)
