# Versioning

This project uses a manual GitHub Actions workflow to bump and tag new releases.

## How it works

1. Navigate to the **Actions** tab and choose **Version Package**.
2. Provide the desired semantic version (e.g., `1.2.3`).
3. The workflow verifies that the user triggering it has admin permissions.
4. Node.js and pnpm are installed on the runner.
5. `pnpm version <input>` runs, updating `package.json`, creating a git commit and tag.
6. The commit and tag are pushed back to `main`.
7. Existing CI publishes the package when it detects the new tag.

## Setup requirements

- Admin permissions on the repository to trigger the workflow.
- A valid `package.json` managed by pnpm.
- The workflow file `.github/workflows/version.yml` with `contents: write` permissions (already configured).
- When running locally, ensure Node.js and pnpm are installed and push commits with `git push --follow-tags`.

