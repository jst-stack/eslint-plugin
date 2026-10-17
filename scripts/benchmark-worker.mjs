import process from 'node:process'
import { performance } from 'node:perf_hooks'
import { ESLint } from 'eslint'
import { checkArchitecture } from '../src/checks/architecture.check.mjs'
import { defaultPolicy } from '../src/configs/defaultPolicy.config.mjs'

const [mode, root, cached] = process.argv.slice(2)
const cpuBefore = process.cpuUsage()
const startedAt = performance.now()

if (mode === 'eslint') {
	const eslint = new ESLint({ cache: cached === 'true', cwd: root, overrideConfigFile: `${root}/eslint.config.mjs` })
	await eslint.lintFiles(['src/**/*.ts'])
}
else if (mode === 'architecture') {
	await checkArchitecture(root, defaultPolicy)
}
else if (mode === 'corpus') {
	const { corpus } = await import('../scripts/conformance/corpus.mjs')
	const { runCorpus } = await import('../scripts/conformance/runner.mjs')
	await runCorpus(corpus)
}
else {
	throw new Error(`Unknown benchmark mode: ${mode}`)
}

if (mode === 'corpus') {
	process.stdout.write(JSON.stringify({ wallMs: performance.now() - startedAt }))
}
else {
	const cpu = process.cpuUsage(cpuBefore)
	process.stdout.write(JSON.stringify({
		cpuMs: (cpu.user + cpu.system) / 1000,
		peakMemoryBytes: process.resourceUsage().maxRSS * 1024,
		wallMs: performance.now() - startedAt,
	}))
}
