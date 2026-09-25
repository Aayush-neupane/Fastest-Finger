# Fastest Fingers

Type race in English and Nepali. Race 24 words against your own best-pace ghost — finish ahead to set a new record.

## Live Demo

TBD (deploy to Netlify, then put the URL here)

## Play

Solo, party, and online.

**Solo** — pick a language (English / नेपाली), race 24 words against
your best-pace ghost. Bests persist in `localStorage`.

**Party** — same device, 2–4 players, one shared passage. Pass the
keyboard; highest WPM takes the crown.

**Online** — create a room, share the 5-letter code, race live:

1. Start the room server (see below) and point the app at it with
   `VITE_RACE_SERVER` (defaults to `ws://localhost:4001` for local play).
2. Player 1: name → **Create room**. Player 2+: name + code → **Join**.
3. Host hits **Start race**. Same passage, synced countdown, live lanes.

## Room server (`server/`)

Node + `ws`, no database. Rooms live in memory and vanish when empty.

```bash
cd server && npm install && npm run build && PORT=4001 npm start
```

Host it anywhere Node runs (VPS, Render, Railway, Fly). Put it behind
TLS and set the frontend env before building the app:

```bash
VITE_RACE_SERVER=wss://race.example.com npm run build
```

Minimal nginx reverse-proxy for the VPS route:

```nginx
location / {
  proxy_pass http://127.0.0.1:4001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

Protocol (JSON over WS): `create` / `join` / `start` / `progress` /
`finish` / `leave` from clients; `joined` / `room` / `countdown` /
`positions` / `results` / `error` from the server. See
`server/src/index.ts` for the exact shapes.

## Stack

React 18 + TypeScript + Vite + Tailwind CSS. No backend, no accounts.

## Roadmap

- ~~Online multiplayer rooms (WebSocket lobby, live opponent cursors)~~ ✅ done — see above
- Daily race passage (same text for everyone, one leaderboard)
- PWA install + offline passages
- Sound effects + finish-line confetti
