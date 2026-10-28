const MAX_MEMORY_CHARACTERS = 1200;

function parseAssistantOutput(content) {
	if (typeof content !== 'string' || !content.trim()) {
		throw new Error('AI returned an empty response');
	}
	const normalized = content.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/, '');
	let result;
	try {
		result = JSON.parse(normalized);
	} catch (error) {
		throw new Error('AI response was not valid JSON', { cause: error });
	}
	if (!result || typeof result !== 'object' || Array.isArray(result)) {
		throw new Error('AI response must be a JSON object');
	}
	const reply = typeof result.reply === 'string' ? result.reply.trim() : '';
	if (!reply) throw new Error('AI response did not contain a reply');
	const validMemory = typeof result.memory === 'string'
		&& Array.from(result.memory).length <= MAX_MEMORY_CHARACTERS;
	return { reply, memory: validMemory ? result.memory.trim() : null };
}

module.exports = { parseAssistantOutput, MAX_MEMORY_CHARACTERS };
