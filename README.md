# Actions &middot; [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/glzr-io/actions/pulls) [![License](https://img.shields.io/github/license/glzr-io/actions)](https://github.com/glzr-io/actions/blob/main/LICENSE.md) [![Discord invite](https://img.shields.io/discord/1041662798196908052.svg?logo=discord&colorB=7289DA)](https://discord.gg/ud6z3qjRvM)

## Setup PNPM

Workflow for common setup steps of NodeJS + pnpm projects, with configurable checkout.

### Example usage

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: glzr-io/actions/setup-pnpm@main
        with:
          checkout: true
          fetch-depth: 0
          node-version: 20
```


## Semantic PRs

Workflow for validating PR titles.

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
          gh-token: ${{ secrets.GITHUB_TOKEN }}
```

## Semantic Release

Workflow for publishing to GitHub releases and/or NPM via Semantic Release.

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
          is-prerelease: false
          repository-url: github.com:glzr-io/glazewm-js.git
          gh-publish: true
          gh-token: ${{ secrets.GITHUB-TOKEN }}
          npm-publish: true
          npm-token: ${{ secrets.NPM_TOKEN }}
```
