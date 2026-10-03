import { normalizePolicy } from './policy.config.mjs'

export const defaultPolicy = normalizePolicy({})

export function createPolicy(overrides = {}) {
	return normalizePolicy(overrides)
}
