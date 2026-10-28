const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const MAX_MEMORY_CHARACTERS = 1200;
const memoryFile = path.join(__dirname, 'short_memori.json');
const userQueues = new Map();
let writeQueue = Promise.resolve();

function isValidMemory(value) {
	return typeof value === 'string' && Array.from(value).length <= MAX_MEMORY_CHARACTERS;
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
		throw new Error('short_memori.json must contain a JSON object');
	}
	return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isValidMemory(value)));
}

async function getMemory(userId) {
	if (userId == null || userId === '') return '';
	const memories = await readAll();
	return memories[String(userId)] || '';
}

function withUserQueue(userId, callback) {
	const key = String(userId);
	const previous = userQueues.get(key) || Promise.resolve();
	const current = previous.catch(() => undefined).then(callback);
	const tracked = current.finally(() => {
		if (userQueues.get(key) === tracked) userQueues.delete(key);
	});
	userQueues.set(key, tracked);
	return tracked;
}

function saveMemory(userId, memory) {
	if (userId == null || userId === '') throw new Error('A user ID is required to save memory');
	if (!isValidMemory(memory)) throw new Error('Memory must be a string of at most 1200 Unicode characters');

	const operation = writeQueue.then(async () => {
		const memories = await readAll();
		memories[String(userId)] = memory;
		const tempFile = path.join(__dirname, `.short_memori.${process.pid}.${randomUUID()}.tmp`);
		try {
			await fs.writeFile(tempFile, `${JSON.stringify(memories, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
			await fs.rename(tempFile, memoryFile);
		} catch (error) {
			await fs.rm(tempFile, { force: true }).catch(() => undefined);
			throw error;
		}
	});
	writeQueue = operation.catch(() => undefined);
	return operation;
}

module.exports = { getMemory, saveMemory, withUserQueue, MAX_MEMORY_CHARACTERS };
