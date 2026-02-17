# Branch Protection (Recommended)

Use this policy for `main` so merges are gated by CI and review quality.

## Policy
- Require pull request before merging
- Require at least 1 approval
- Dismiss stale approvals on new commits
- Require conversation resolution before merge
- Require status checks to pass before merge
- Require linear history
- Block force pushes
- Block branch deletion
- Apply rules to admins too

## Required CI check
- `CI / test-and-build`

Note: In some repos, GitHub may show only `test-and-build`. Use the exact check name shown in Branch Protection after one successful CI run.

## Apply via script
From repo root:

```bash
./scripts/set-branch-protection.sh <owner/repo> main "CI / test-and-build"
```

Example:

```bash
./scripts/set-branch-protection.sh hurkme/hurkme-monorepo main "CI / test-and-build"
```

## Apply via GitHub UI
1. Open `Settings` -> `Branches`
2. Under `Branch protection rules`, click `Add rule`
3. Branch name pattern: `main`
4. Enable:
- `Require a pull request before merging`
- `Require approvals` and set `1`
- `Dismiss stale pull request approvals when new commits are pushed`
- `Require status checks to pass before merging`
- Select `CI / test-and-build` (or exact equivalent)
- `Require conversation resolution before merging`
- `Require linear history`
- `Do not allow bypassing the above settings`
- Disable `Allow force pushes`
- Disable `Allow deletions`
5. Save changes
