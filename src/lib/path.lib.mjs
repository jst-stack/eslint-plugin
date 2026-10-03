import { relative, sep, win32 } from 'node:path'
import process from 'node:process'

export function getProjectPath(filename, cwd = process.cwd()) {
	if (/^[A-Za-z]:[\\/]/u.test(filename)) {
		return win32.relative(cwd, filename).replaceAll('\\', '/')
	}
	return relative(cwd, filename).split(sep).join('/')
}
