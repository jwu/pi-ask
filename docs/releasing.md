# Releasing

This fork publishes `@johnnywu/pi-ask` on its own `fork-v*` release line, independent of upstream `@eko24ive/pi-ask`. Versions, tags, changelog entries, and GitHub releases never touch the upstream `v*` line.

## Release tooling

Releases are cut by `semantic-release`, configured in `package.json`:

- npm package: `@johnnywu/pi-ask`
- tag format: `fork-v${version}`
- changelog: `CHANGELOG.md`
- release commit: `chore(release): ${version} [skip ci]`

Version bumps come from conventional commits since the last `fork-v*` tag:

- `fix:` → patch
- `feat:` → minor
- `BREAKING CHANGE:` → major
- `docs:`, `chore:`, `test:`, `refactor:` → no release on their own

## Who runs it

Releases run **locally**, not in CI. `.github/workflows/release.yml` only fires through a `workflow_run` hook on the upstream repository, so pushes to this fork produce no Actions run and no automatic publish.

## Prerequisites

```bash
git switch main && git pull
git status --porcelain     # must be empty
npm whoami                 # must print the npm account that owns @johnnywu/pi-ask
gh auth status             # must show a token with repo scope
```

## Release steps

1. Merge the change set to `main` with a conventional commit message (use `pnpm commit` or an equivalent conventional message).
2. Run the validation gate:

   ```bash
   pnpm format
   pnpm typecheck
   pnpm test
   ```

3. Push `main`:

   ```bash
   git push origin main
   ```

4. Cut the release from `main`:

   ```bash
   GITHUB_TOKEN="$(gh auth token)" pnpm exec semantic-release
   ```

   `GITHUB_TOKEN` is required for tagging, pushing the release commit, and creating the GitHub release; npm authentication comes from the local `~/.npmrc` token.

5. Verify the release:

   ```bash
   npm view @johnnywu/pi-ask version dist-tags
   git tag --list 'fork-v*' | tail -3
   gh release list --limit 3
   git log --oneline -2
   ```

## Expected outcome

One `semantic-release` run should leave the repo with:

- a bumped `package.json` version and a new `CHANGELOG.md` section
- a `chore(release): X.Y.Z [skip ci]` commit on `main`
- a `fork-vX.Y.Z` tag and matching GitHub release
- the new version published to npm with the `latest` dist-tag

## Rules

- do not hand-edit `package.json` versions or `CHANGELOG.md` entries for a release
- do not run `npm publish` directly; `semantic-release` owns tagging, changelog, and GitHub release creation
- do not release from a dirty tree or an unpushed branch
- `release.provenance` stays `false`; publishing from a laptop cannot attest a build
- if a publish fails after the release commit landed, fix forward with a new conventional commit instead of rewriting `main`
