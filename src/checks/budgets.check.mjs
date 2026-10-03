import { gzipSync } from 'node:zlib'
import { readFile, readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import process from 'node:process'
import { defaultPolicy } from '../configs/defaultPolicy.config.mjs'

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
		failures.push(`CSS gzip budget exceeded: ${totals.css} > ${gzipCssBytes} bytes.`)
	}
	if (totals.js > gzipJavaScriptBytes) {
		failures.push(`JavaScript gzip budget exceeded: ${totals.js} > ${gzipJavaScriptBytes} bytes.`)
	}
	const unexpected = files.filter(file => unexpectedChunks.some(pattern => file.includes(pattern)))
	if (unexpected.length) {
		failures.push(`Unexpected build chunks:\n${unexpected.join('\n')}`)
	}
	if (failures.length) {
		throw new Error(failures.join('\n'))
	}
	return Object.freeze({ gzipCssBytes: totals.css, gzipJavaScriptBytes: totals.js })
}
