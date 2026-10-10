import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

const root = await mkdtemp(join(tmpdir(), 'jst-benchmark-'))
const baselinePath = new URL('../benchmarks/baseline.json', import.meta.url)
try {
	await createFixture(root)
	const results = {
		architectureCold: await measure('architecture', root, false),
		architectureCached: await measure('architecture', root, true),
		eslintCold: await measure('eslint', root, false),
		eslintCached: await measureWarmCache('eslint', root),
	}
	if (process.argv.includes('--write-baseline')) {
		await mkdir(dirname(baselinePath.pathname), { recursive: true })
		await writeFile(baselinePath, `${JSON.stringify({ tolerance: 0.2, results }, null, 2)}\n`)
	}
	else {
		assertRegression(results, JSON.parse(await readFile(baselinePath, 'utf8')))
	}
	process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
}
finally {
	await rm(root, { force: true, recursive: true })
}

async function createFixture(root) {
	for (const layer of ['app', 'pages', 'modules', 'widgets', 'features', 'entities', 'shared']) {
		await mkdir(join(root, 'src', layer), { recursive: true })
	}
	await mkdir(join(root, 'src/app/container'), { recursive: true })
	await writeFile(join(root, 'package.json'), '{"dependencies":{"@needle-di/core":"1.2.1"}}\n')
	await writeFile(join(root, 'src/app/container/container.composition.ts'), "const providers = import.meta.glob(['../../entities/**/*.provider.ts','../../features/**/*.provider.ts','../../modules/**/*.provider.ts','../../shared/**/*.provider.ts'], { eager: true })\nexport { providers }\n")
	await writeFile(join(root, 'eslint.config.mjs'), `import jst from ${JSON.stringify(new URL('../src/index.mjs', import.meta.url).href)}\nexport default jst.createConfig()\n`)
	for (let index = 0; index < 1000; index += 1) {
		const imports = Array.from({ length: 10 }, (_, offset) => `import { value as value${offset} } from './fixture${(index + offset + 1) % 1000}.lib.ts'`).join('\n')
		await writeFile(join(root, `src/shared/fixture${index}.lib.ts`), `${imports}\nexport const value = ${index}\n`)
	}
}

function measure(mode, root, cached) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [new URL('./benchmark-worker.mjs', import.meta.url).pathname, mode, root, String(cached)], { stdio: ['ignore', 'pipe', 'inherit'] })
		let output = ''
		child.stdout.on('data', chunk => { output += chunk })
		child.once('error', reject)
		child.once('close', code => code === 0 ? resolve(JSON.parse(output)) : reject(new Error(`${mode} benchmark failed with exit code ${code}.`)))
	})
}

async function measureWarmCache(mode, root) {
	await measure(mode, root, true)
	return measure(mode, root, true)
}

function assertRegression(results, baseline) {
	const noiseFloor = { cpuMs: 50, peakMemoryBytes: 16 * 1024 * 1024, wallMs: 50 }
	for (const [name, metrics] of Object.entries(results)) {
		for (const metric of ['wallMs', 'cpuMs', 'peakMemoryBytes']) {
			const maximum = baseline.results[name][metric] * (1 + baseline.tolerance) + noiseFloor[metric]
			if (metrics[metric] > maximum) {
				throw new Error(`${name}.${metric} regressed: ${metrics[metric]} > ${maximum}.`)
			}
		}
	}
}
