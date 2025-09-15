#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later

set -e

LICENSE_PATTERN="SPDX-License-Identifier: AGPL-3.0-or-later"
CHECK_EXTENSIONS="py ts js tsx jsx sh smithy"

missing_files=()

# Check each file passed as argument
for file in "$@"; do
    # Skip if file doesn't exist (might be deleted)
    if [[ ! -f "$file" ]]; then
        continue
    fi

    ext="${file##*.}"
    if [[ " $CHECK_EXTENSIONS " =~ " $ext " ]]; then
        if ! head -n 5 "$file" | grep -q "$LICENSE_PATTERN"; then
            missing_files+=("$file")
        fi
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ The following files are missing the required SPDX license header:"
    for f in "${missing_files[@]}"; do
        echo "  $f"
    done
    echo ""
    echo "💡 Please add 'SPDX-License-Identifier: AGPL-3.0-or-later' to the top of source files."
    echo "   For most files, add it as a comment in the first few lines."
    exit 1
fi

echo "✅ All checked files have proper SPDX license headers"
exit 0
