const express = require("express");

const maxJsonStructures = 10000;

const jsonBodyParser = express.json({
	limit: "10kb",
	verify(_req, _res, buffer) {
		let structureCount = 0;
		let insideString = false;
		let escaped = false;

		for (const byte of buffer) {
			if (insideString) {
				if (escaped) escaped = false;
				else if (byte === 0x5c) escaped = true;
				else if (byte === 0x22) insideString = false;
				continue;
			}

			if (byte === 0x22) insideString = true;
			else if (byte === 0x7b || byte === 0x5b) structureCount++;

			if (structureCount > maxJsonStructures) {
				const error = new Error("JSON structure limit exceeded");
				error.status = 413;
				error.type = "entity.too.complex";
				throw error;
			}
		}
	},
});

function jsonParseErrorHandler(error, _req, res, next) {
	if (error.type === "entity.too.complex" || error.type === "entity.too.large")
		return res.status(413).send("Request body too large or complex");
	if (error.type === "entity.parse.failed")
		return res.status(400).send("Invalid JSON");
	next(error);
}

module.exports = { jsonBodyParser, jsonParseErrorHandler };
