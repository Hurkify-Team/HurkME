#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it first: https://cli.github.com/"
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <owner/repo> [branch] [required-check]"
  echo "Example: $0 acme/hurkme main 'CI / test-and-build'"
  exit 1
fi

REPO="$1"
BRANCH="${2:-main}"
REQUIRED_CHECK="${3:-CI / test-and-build}"

TMP_PAYLOAD="$(mktemp)"
trap 'rm -f "$TMP_PAYLOAD"' EXIT

cat >"$TMP_PAYLOAD" <<JSON
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["$REQUIRED_CHECK"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON

echo "Applying branch protection to ${REPO}:${BRANCH} (required check: ${REQUIRED_CHECK})"
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/branches/${BRANCH}/protection" \
  --input "$TMP_PAYLOAD" >/dev/null

echo "Branch protection updated successfully."
