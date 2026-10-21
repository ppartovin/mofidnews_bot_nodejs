const express = require("express");
const rateLimit = require("express-rate-limit");
const { generateReply } = require("./ai_client");
const { loadData } = require("./data_loader");

const token = process.env.TOKEN;
if (!token) throw new Error("TOKEN environment variable is required");
if (!process.env.AI_API_KEY || !process.env.AI_MODEL)
	throw new Error(
		"AI_API_KEY and AI_MODEL environment variables are required",
	);

const app = express();
app.use(express.json({ limit: "1mb" }));
const baseUrl = `https://tapi.bale.ai/bot${token}`;
const messageLimit = Number.parseInt(process.env.RATE_LIMIT || "0", 10);
const errorReply =
	"متأسفانه در پردازش پیام شما خطایی رخ داد. لطفاً دوباره تلاش کنید.";
const rateReply =
	"شما به محدودیت ارسال پیام رسیده‌اید. لطفاً بعداً دوباره تلاش کنید.";

async function bale(method, payload) {
	const response = await fetch(`${baseUrl}/${method}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok)
		throw new Error(`Bale API returned HTTP ${response.status}`);
	return (await response.json()).result || {};
}

const limiter = rateLimit({
	windowMs: 12 * 60 * 60 * 1000,
	limit: messageLimit > 0 ? messageLimit : 1,
	skip: (req) =>
		messageLimit <= 0 ||
		!req.body?.message?.text ||
		!req.body?.message?.chat?.id,
	keyGenerator: (req) =>
		String(
			req.body?.message?.from?.id ||
				req.body?.message?.chat?.id ||
				req.ip,
		),
	handler: async (req, res) => {
		const chatId = req.body?.message?.chat?.id;
		if (chatId)
			await bale("sendMessage", {
				chat_id: chatId,
				text: rateReply,
			}).catch((e) => console.error(e));
		res.json({ ok: true });
	},
	standardHeaders: "draft-8",
	legacyHeaders: false,
});

app.post("/webhook", limiter, async (req, res) => {
	const message = req.body?.message;
	if (
		message &&
		typeof message === "object" &&
		message.chat?.id &&
		message.text != null
	) {
		const chatId = message.chat.id;
		let processingId;
		try {
			processingId = (
				await bale("sendMessage", {
					chat_id: chatId,
					text: "در حال پردازش...",
				})
			).message_id;
		} catch (error) {
			console.error("Could not send processing message:", error.message);
		}
		let reply;
		try {
			reply = await generateReply(message.text, loadData());
		} catch (error) {
			console.error("Could not generate reply:", error);
			reply = errorReply;
		}
		if (processingId != null) {
			try {
				await bale("editMessageText", {
					chat_id: chatId,
					message_id: processingId,
					text: reply,
				});
			} catch (error) {
				console.error(
					"Could not edit processing message:",
					error.message,
				);
				await bale("sendMessage", {
					chat_id: chatId,
					text: reply,
				}).catch(console.error);
			}
		} else
			await bale("sendMessage", { chat_id: chatId, text: reply }).catch(
				console.error,
			);
	}
	res.status(200).send("OK");
});

app.get("/", (_req, res) => res.status(200).send("OK"));
app.use((error, req, res, _next) => {
	console.error("Request failed:", req.method, req.path, error);
	res.status(req.path === "/webhook" ? 200 : 500).send(
		req.path === "/webhook" ? "OK" : "Internal Server Error",
	);
});

const port = Number(process.env.PORT || 5000);
app.listen(port, "0.0.0.0", () =>
	console.log(`Express server listening on ${port}`),
);
