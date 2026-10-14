import { gzipSync } from 'node:zlib'
import { readFile, readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import process from 'node:process'
import { defaultPolicy } from '../configs/defaultPolicy.config.mjs'
import { DiagnosticError, diagnostic } from '../diagnostics/diagnostic.model.mjs'

export async function checkBuildBudgets(root = process.cwd(), policy = defaultPolicy) {
	const assetsRoot = resolve(root, 'build/client/assets')
	const files = await readdir(assetsRoot)
	const totals = { css: 0, js: 0 }
	for (const file of files) {
		const extension = extname(file).slice(1)
		if (extension in totals) {
			totals[extension] += gzipSync(await readFile(resolve(assetsRoot, file))).byteLength
		}
	}
	const { gzipCssBytes, gzipJavaScriptBytes, unexpectedChunks } = policy.performance.budgets
	const failures = []
	if (totals.css > gzipCssBytes) {
		failures.push(diagnostic(
			'budgets.css-gzip',
			`CSS gzip budget exceeded: ${totals.css} > ${gzipCssBytes} bytes.`,
			'Remove or split CSS, or deliberately revise performance.budgets.gzipCssBytes in jst.config.ts.',
		))
	}
	if (totals.js > gzipJavaScriptBytes) {
		failures.push(diagnostic(
			'budgets.javascript-gzip',
			`JavaScript gzip budget exceeded: ${totals.js} > ${gzipJavaScriptBytes} bytes.`,
			'Remove or split JavaScript, or deliberately revise performance.budgets.gzipJavaScriptBytes in jst.config.ts.',
		))
	}
	const unexpected = files.filter(file => unexpectedChunks.some(pattern => file.includes(pattern)))
	if (unexpected.length) {
		failures.push(diagnostic(
			'budgets.unexpected-chunk',
			`Unexpected build chunks: ${unexpected.join(', ')}`,
			'Remove the unexpected dependency or revise performance.budgets.unexpectedChunks in jst.config.ts.',
		))
	}
	if (failures.length) {
		throw new DiagnosticError(failures)
	}
	return Object.freeze({ gzipCssBytes: totals.css, gzipJavaScriptBytes: totals.js })
}
