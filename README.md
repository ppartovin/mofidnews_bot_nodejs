# Mofid News Bale Bot (Node.js)

Express port of the original Flask webhook. The JSON data files and Bale `/webhook` and `/` endpoints retain their existing roles.

## Run

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Set `TOKEN`, `AI_API_KEY`, and `AI_MODEL` from `.env.example` in the process environment.
4. Run `npm start`.

The service listens on port 5000 by default. Set `PORT` to change it. `RATE_LIMIT` is the allowed messages per sender per 12 hours; set it to `0` to disable limiting.
