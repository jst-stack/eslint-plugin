# CLI diagnostics

`jst-lint` reports policy violations as stable diagnostics. A diagnostic identifies the violated contract, explains the reason, suggests an allowed repair, and links back to this reference.

Pretty output is the default:

```bash
jst-lint architecture
jst-lint styles --format pretty
```

Agents and CI integrations can request one JSON document on standard output:

```bash
jst-lint architecture --format json
```

```json
{
  "diagnostics": [{
    "code": "architecture.provider-scope",
    "message": "DI provider must declare request scope.",
    "file": "/project/src/features/cart/cart.provider.ts",
    "repair": "Export `scope = 'request' as const` from the provider module.",
    "docsUrl": "https://github.com/jst-stack/eslint-plugin/blob/main/docs/cli-diagnostics.md#architectureprovider-scope"
  }]
}
```

Exit status `0` means the check passed, `1` means policy violations were found, and `2` means invocation or execution failed.

## Architecture

- <a id="architecturelayer-directory"></a>`architecture.layer-directory`
- <a id="architecturekernel-dependency"></a>`architecture.kernel-dependency`
- <a id="architectureprovider-discovery"></a>`architecture.provider-discovery`
- <a id="architectureprovider-scope"></a>`architecture.provider-scope`
- <a id="architecturemodule-public-api"></a>`architecture.module-public-api`
- <a id="architecturemodule-public-api-budget"></a>`architecture.module-public-api-budget`

## Styles

- <a id="stylesmodule-name"></a>`styles.module-name`
- <a id="stylesowner-missing"></a>`styles.owner-missing`

## Budgets

- <a id="budgetscss-gzip"></a>`budgets.css-gzip`
- <a id="budgetsjavascript-gzip"></a>`budgets.javascript-gzip`
- <a id="budgetsunexpected-chunk"></a>`budgets.unexpected-chunk`

## Workspaces

- <a id="workspacemanifest-missing"></a>`workspace.manifest-missing`
- <a id="workspacename-missing"></a>`workspace.name-missing`
- <a id="workspacepublic-entry"></a>`workspace.public-entry`
- <a id="workspacewildcard-export"></a>`workspace.wildcard-export`
- <a id="workspacedecision-link"></a>`workspace.decision-link`
- <a id="workspacedecision-location"></a>`workspace.decision-location`
- <a id="workspacedecision-headings"></a>`workspace.decision-headings`
- <a id="workspacedeep-import"></a>`workspace.deep-import`
- <a id="workspaceundeclared-dependency"></a>`workspace.undeclared-dependency`
- <a id="workspacemicrofrontend-contract"></a>`workspace.microfrontend-contract`
- <a id="workspacemicrofrontend-script"></a>`workspace.microfrontend-script`
- <a id="workspaceroot-registration"></a>`workspace.root-registration`
- <a id="workspacedependency-cycle"></a>`workspace.dependency-cycle`
