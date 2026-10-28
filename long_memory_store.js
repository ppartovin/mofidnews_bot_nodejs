const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const memoryFile = path.join(__dirname, 'long_memori.json');
const listFields = ['schedule_notes', 'planning_preferences', 'important_notes'];
const scalarFields = ['name', 'grade', 'selected_course'];
const allFields = [...scalarFields, ...listFields];
let writeQueue = Promise.resolve();

function emptyMemory() {
	return {
		name: '',
		grade: '',
		selected_course: '',
		schedule_notes: [],
		planning_preferences: [],
		important_notes: [],
		updated_at: null,
	};
}

function normalizeMemory(value) {
	const memory = emptyMemory();
	if (!value || typeof value !== 'object' || Array.isArray(value)) return memory;
	for (const field of scalarFields) {
		if (typeof value[field] === 'string' && Array.from(value[field]).length <= 100) memory[field] = value[field];
	}
	for (const field of listFields) {
		if (Array.isArray(value[field])) {
			memory[field] = [...new Set(value[field].filter((item) => typeof item === 'string' && Array.from(item).length <= 300))].slice(0, 20);
		}
	}
	if (typeof value.updated_at === 'string') memory.updated_at = value.updated_at;
	return memory;
}

async function readAll() {
	let text;
	try {
		text = await fs.readFile(memoryFile, 'utf8');
	} catch (error) {
		if (error.code === 'ENOENT') return {};
		throw error;
	}
	const parsed = JSON.parse(text);
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('long_memori.json must contain a JSON object');
	}
	return Object.fromEntries(Object.entries(parsed).map(([id, value]) => [id, normalizeMemory(value)]));
}

async function getLongMemory(userId) {
	if (userId == null || userId === '') return emptyMemory();
	const all = await readAll();
	return all[String(userId)] || emptyMemory();
}

function applyUpdates(currentValue, updates) {
	const current = normalizeMemory(currentValue);
	if (!updates || typeof updates !== 'object') return current;
	for (const field of updates.clear || []) {
		if (scalarFields.includes(field)) current[field] = '';
		else if (listFields.includes(field)) current[field] = [];
	}
	for (const field of scalarFields) {
		if (typeof updates.set?.[field] === 'string' && updates.set[field].trim()) current[field] = updates.set[field].trim();
	}
	for (const field of listFields) {
		if (Array.isArray(updates.set?.[field])) current[field] = updates.set[field].filter((item) => typeof item === 'string').slice(0, 20);
		if (Array.isArray(updates.add?.[field])) {
			current[field] = [...new Set([...current[field], ...updates.add[field].filter((item) => typeof item === 'string')])].slice(-20);
		}
	}
	current.updated_at = new Date().toISOString();
	return current;
}

async function saveLongMemoryUpdates(userId, updates) {
	if (userId == null || userId === '') throw new Error('A user ID is required to save long-term memory');
	if (!updates || typeof updates !== 'object') return;
	const hasChanges = Object.keys(updates.set || {}).length > 0
		|| Object.keys(updates.add || {}).some((key) => updates.add[key]?.length)
		|| updates.clear?.length > 0;
	if (!hasChanges) return;

	const operation = writeQueue.then(async () => {
		const all = await readAll();
		const key = String(userId);
		Object.defineProperty(all, key, {
			value: applyUpdates(all[key], updates),
			enumerable: true,
			writable: true,
			configurable: true,
		});
		const tempFile = path.join(__dirname, `.long_memori.${process.pid}.${randomUUID()}.tmp`);
		try {
			await fs.writeFile(tempFile, `${JSON.stringify(all, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
			await fs.rename(tempFile, memoryFile);
		} catch (error) {
			await fs.rm(tempFile, { force: true }).catch(() => undefined);
			throw error;
		}
	});
	writeQueue = operation.catch(() => undefined);
	return operation;
}

module.exports = { getLongMemory, saveLongMemoryUpdates, emptyMemory, applyUpdates, allFields };
