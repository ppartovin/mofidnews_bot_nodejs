const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const aiClient = fs.readFileSync(path.join(root, 'ai_client.js'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const contains = (source, expression) => expression.test(source);

test('webhook authentication secret is required and documented', () => {
	assert.equal(contains(server, /process\.env\.BALE_SECRET\b/), true);
	assert.equal(contains(server, /process\.env\.BALE_SECRETE\b/), false);
	assert.equal(contains(server, /if\s*\(![^\n]*baleSecret[^\n]*\)\s*throw/), true);
	assert.equal(contains(envExample, /^BALE_SECRET=.+$/m), true);
	assert.equal(contains(server, /\/webhook\/\$\{[^}]+\}/), false);
});

test('webhook rejects missing and wrongly typed text before calling external services', () => {
	assert.equal(
		contains(server, /typeof\s+message\.text\s*===\s*['"]string['"]/),
		true,
	);
	assert.equal(contains(server, /message\.text\.length\s*<=\s*\d+/), true);
});

test('message processing has an enabled, validated default rate limit', () => {
	assert.equal(contains(server, /RATE_LIMIT\s*\|\|\s*["']0["']/), false);
	assert.equal(contains(server, /Number\.isSafeInteger\(messageLimit\)/), true);
	assert.equal(contains(server, /messageLimit\s*<=\s*0\s*\|\|/), false);
});

test('AI endpoint configuration is restricted to an approved HTTPS origin', () => {
	assert.equal(contains(aiClient, /new\s+URL\(process\.env\.AI_BASE_URL/), true);
	assert.equal(contains(aiClient, /protocol\s*!==\s*["']https:["']/), true);
});
