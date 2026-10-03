import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { getProjectPath } from '../src/lib/path.lib.mjs'

test('normalizes POSIX and Windows project paths', () => {
	assert.equal(getProjectPath('/repo/src/app/root.ts', '/repo'), 'src/app/root.ts')
	assert.equal(getProjectPath('C:\\repo\\src\\app\\root.ts', 'C:\\repo'), 'src/app/root.ts')
})
