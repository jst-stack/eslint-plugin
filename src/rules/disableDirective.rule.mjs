export const disableDirective = {
	meta: {
		docs: { description: 'Require reviewed policy exceptions instead of inline JST rule disables.', recommended: true },
		messages: {
			description: 'Add a -- description to this ESLint suppression.',
			jstRule: 'Do not disable JST rules inline. Add a narrow reviewed exception to jst.config.ts.',
		},
		schema: [],
		type: 'problem',
	},
	create(context) {
		return {
			Program() {
				for (const comment of context.sourceCode.getAllComments()) {
					validateComment(context, comment)
				}
			},
		}
	},
}

function validateComment(context, comment) {
	const match = comment.value.match(/eslint-disable(?:-next-line|-line)?\b(?<body>.*)/u)
	if (!match) {
		return
	}
	const [ruleText = '', reason] = match.groups?.body?.split(/\s--\s/u, 2) ?? []
	const rules = ruleText.split(',').map(rule => rule.trim()).filter(Boolean)
	if (!rules.length || rules.some(rule => rule.startsWith('jst/'))) {
		context.report({ messageId: 'jstRule', node: comment })
		return
	}
	if (!reason?.trim()) {
		context.report({ messageId: 'description', node: comment })
	}
}
