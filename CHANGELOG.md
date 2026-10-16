# Changelog

Notable changes to `@jst-stack/eslint-plugin` are documented here.

## 0.5.0

- Delegate reusable code-quality checks to `@jst-stack/eslint-plugin-quality`.
- Delegate architecture rules and the `jst-lint` CLI to `@jst-stack/eslint-plugin-architecture`.
- Keep the existing combined policy and preset as a compatibility path for JST applications.

## 0.4.6

- Register every CLI diagnostic code and reject unknown or duplicate contract definitions in tests.

## 0.4.5

- Add stable structured diagnostics for architecture, style, budget, and workspace checks.
- Support human-readable and JSON CLI output with distinct policy and execution exit statuses.
- Document every diagnostic code, repair, and stable reference URL.

## 0.4.4

- Reject class instances and other non-plain objects at the policy trust boundary.
- Add deterministic adversarial coverage for unknown policy keys, invalid shapes, generated limits, and deep immutability.

## 0.4.3

- Link every architecture diagnostic to its stable repair guide.
- Publish current installation, CI, and OpenSSF status in the package README.
- Complete trusted npm releases with registry verification and matching GitHub Releases.

## 0.4.2

- Read release identity from the package manifest before checking the npm registry.

## 0.4.1

- Make tag publishing idempotent when a release was already published from a maintainer workstation.

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
