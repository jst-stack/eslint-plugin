export function matchesPackage(name, patterns) {
	return patterns.some(pattern => name === pattern || (pattern.endsWith('/') && name.startsWith(pattern)))
}
