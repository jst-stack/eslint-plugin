# Changelog

Notable changes to `@jst-stack/eslint-plugin` are documented here.

## Unreleased

## 0.4.0

- Add bounded-context modules to the default dependency topology.
- Validate workspace public entries, extraction ADRs, declared internal dependencies, and package cycles.
- Require explicit ownership, host, fallback, build, and test contracts for microfrontend packages.
- Add configurable package roots, decision contracts, and bounded-context public API budgets.

## 0.3.3

- Keep the npm lockfile valid for clean installs with both npm 11 and npm 12 on Node 24.

## 0.3.2

- Expose generator layer and test-directory conventions through the shared normalized policy.

## 0.3.1

- Preserve the `jst-lint` executable in npm 12 package metadata.

## 0.3.0 - 2026-09-24

- Establish the Node 24 runtime, cross-platform ESLint compatibility matrix, and provenance-backed npm release workflow.
- Add typed, runtime-validated, deeply immutable project policy through `jst.config.ts`.
- Enforce slice public APIs, circular dependency detection, reviewed exceptions, CSS/SCSS ownership, and descriptive suppressions.
- Close Windows-path, shadowed-global, and package-prefix bypasses with adversarial coverage.
