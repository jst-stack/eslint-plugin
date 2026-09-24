import { relative, sep } from 'node:path'
import process from 'node:process'

export function getProjectPath(filename, cwd = process.cwd()) {
	return relative(cwd, filename).split(sep).join('/')
}
