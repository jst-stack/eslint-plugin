import architecture from '@jst-stack/eslint-plugin-architecture'
import quality from '@jst-stack/eslint-plugin-quality'
import tsParser from '@typescript-eslint/parser'

const typeScriptFiles = ['**/*.{ts,tsx}']
const reactJavaScriptFiles = ['**/*.jsx']

export function createRecommendedConfig(policy) {
	return [
		{ files: reactJavaScriptFiles, languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
		{ files: typeScriptFiles, languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } } },
		...quality.createRulesConfig(toQualityPolicy(policy)),
		...architecture.createConfig(toArchitecturePolicy(policy)),
	]
}

function toQualityPolicy(policy) {
	return {
		limits: {
			complexity: policy.limits.complexity,
			maxDepth: policy.limits.maxDepth,
			maxLines: policy.limits.maxLines,
			maxLinesPerFunction: policy.limits.maxLinesPerFunction,
			maxParams: policy.limits.maxParams,
		},
		react: {
			booleanVariantNames: policy.ui.booleanVariantNames,
			calculationMethods: policy.ui.calculationMethods,
		},
	}
}

function toArchitecturePolicy(policy) {
	return {
		...policy,
		exceptions: policy.exceptions.map(exception => ({
			...exception,
			rules: exception.rules.includes('jst/ui-contract')
				? [...exception.rules, 'quality/no-flag-prop-combinations', 'quality/no-heavy-render-work']
				: exception.rules,
		})),
		limits: { maxPublicApiExports: policy.limits.maxPublicApiExports },
		ui: {
			forbiddenImportPatterns: policy.ui.forbiddenImportPatterns,
			statePackages: policy.ui.statePackages,
		},
	}
}
