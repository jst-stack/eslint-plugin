import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { corpus } from '../scripts/conformance/corpus.mjs'
import { runCorpus, validateCorpus } from '../scripts/conformance/runner.mjs'

test('conformance corpus registers every diagnostic code and rule exactly once', () => {
	assert.deepEqual(validateCorpus(corpus), [])
})

test('every corpus case reproduces its diagnostic and its repair passes', async () => {
	const result = await runCorpus(corpus)
	assert.equal(result.cases, corpus.length)
})
