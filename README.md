# Mofid News Bale Bot (Node.js)

Express port of the original Flask webhook. The JSON data files and Bale `/webhook` and `/` endpoints retain their existing roles.

## Run

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Set `TOKEN`, `AI_API_KEY`, and `AI_MODEL` from `.env.example` in the process environment.
4. Run `npm start`.

The service listens on port 5000 by default. Set `PORT` to change it. `RATE_LIMIT` is the allowed messages per sender per 12 hours; set it to `0` to disable limiting.

## Conversation memory

The bot keeps recent conversation context in `short_memori.json` and structured, longer-term user details in `long_memori.json`, keyed by the sender's user ID. These files are created when needed and are excluded from Git. Long-term updates are limited to explicitly stated or corrected details such as name, grade, selected course, recurring schedule notes, and planning preferences. The model returns proposed changes; the application validates and merges them with existing data.
