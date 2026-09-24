import { access, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function findExisting(root, candidates) {
	for (const candidate of candidates) {
		const path = resolve(root, candidate)
		try {
			await access(path)
			return path
		}
		catch {
			continue
		}
	}
	throw new Error(`Expected one of:\n${candidates.join('\n')}`)
}

export async function listFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true })
	const paths = await Promise.all(entries.map((entry) => {
		const path = resolve(directory, entry.name)
		return entry.isDirectory() ? listFiles(path) : [path]
	}))
	return paths.flat()
}
