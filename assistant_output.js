const MAX_MEMORY_CHARACTERS = 1200;
const LONG_MEMORY_FIELDS = new Set([
	'name', 'grade', 'selected_course', 'schedule_notes',
	'planning_preferences', 'important_notes',
]);

function parseLongMemoryUpdates(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const set = {};
	const add = {};
	const clear = [];
	if (value.set && typeof value.set === 'object' && !Array.isArray(value.set)) {
		for (const [key, item] of Object.entries(value.set)) {
			if (!LONG_MEMORY_FIELDS.has(key)) continue;
			if (key === 'name' || key === 'grade' || key === 'selected_course') {
				if (typeof item === 'string' && item.trim() && Array.from(item).length <= 100) set[key] = item.trim();
			} else if (Array.isArray(item)) {
				set[key] = item.filter((entry) => typeof entry === 'string' && entry.trim() && Array.from(entry).length <= 300).slice(0, 20).map((entry) => entry.trim());
			}
		}
	}
	if (value.add && typeof value.add === 'object' && !Array.isArray(value.add)) {
		for (const key of ['schedule_notes', 'planning_preferences', 'important_notes']) {
			const items = value.add[key];
			if (Array.isArray(items)) {
				add[key] = items.filter((entry) => typeof entry === 'string' && entry.trim() && Array.from(entry).length <= 300).slice(0, 20).map((entry) => entry.trim());
			}
		}
	}
	if (Array.isArray(value.clear)) {
		for (const key of value.clear) if (LONG_MEMORY_FIELDS.has(key)) clear.push(key);
	}
	return { set, add, clear };
}

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
	return {
		reply,
		memory: validMemory ? result.memory.trim() : null,
		longMemoryUpdates: parseLongMemoryUpdates(result.long_memory_updates),
	};
}

module.exports = { parseAssistantOutput, MAX_MEMORY_CHARACTERS };
