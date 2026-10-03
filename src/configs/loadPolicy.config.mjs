import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { normalizePolicy } from './policy.config.mjs'

const configFiles = ['jst.config.ts', 'jst.config.mjs', 'jst.config.js']

export async function loadPolicy(root) {
	for (const file of configFiles) {
		const path = resolve(root, file)
		try {
			await access(path)
		}
		catch {
			continue
		}
		const module = await import(pathToFileURL(path).href)
		return normalizePolicy(module.default ?? {})
	}
	return normalizePolicy({})
}
