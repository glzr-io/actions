# Actions &middot; [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/glzr-io/actions/pulls) [![License](https://img.shields.io/github/license/glzr-io/actions)](https://github.com/glzr-io/actions/blob/main/LICENSE.md) [![Discord invite](https://img.shields.io/discord/1041662798196908052.svg?logo=discord&colorB=7289DA)](https://discord.gg/ud6z3qjRvM)

## Semantic PRs

GitHub Actions workflow for validating PR titles.

### Example usage

```yaml
name: PR title check

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: glzr-io/actions/semantic-prs@main
        with:
          gh_token: ${{ secrets.GITHUB_TOKEN }}
```

## Semantic Release

GitHub Actions workflow for publishing to GitHub releases and/or NPM via Semantic Release.

**Note that the repository requires at least one branch other than the release branch.**

### Example usage

```yaml
name: Release

on: workflow_dispatch

permissions:
  # To be able to publish a GitHub release.
  contents: write
  # To be able to comment on released issues.
  issues: write
  # To be able to comment on released pull requests.
  pull-requests: write
  # To enable use of OIDC for npm provenance.
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Semantic release
        uses: glzr-io/actions/semantic-release@main
        with:
          is_prerelease: false
          repository_url: 'github.com:glzr-io/glazewm-js.git'
          gh_publish: true
          gh_token: ${{ secrets.GITHUB_TOKEN }}
          npm_publish: true
          npm_token: ${{ secrets.NPM_TOKEN }}
```
