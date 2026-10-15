# Bayani Alert — Response Center

**"Safety in Every Step"**

Discreet wearable emergency alert and public safety monitoring system for
women and children protection (RA 9262 / VAWC) in the Philippines.

This project is the **Response Center (Authority / Dispatcher)** web console:
dashboard, live incidents, dispatch map with Street View, responders, directory,
reports and settings. It is **separate** from the **Bayani App** (citizen side,
`bayani-app` project, port 4001).

## Two projects

| Project      | Role                           | Port |
| ------------ | ------------------------------ | ---- |
| `bayani-alert` | Response Center (authority)    | 4000 |
| `bayani-app`   | Citizen safety mobile app      | 4001 |
| Express backend + SSE bridge   | shared source of truth | 8000 |

Incidents triggered on the citizen app (or via the simulated wearable trigger)
are broadcast over the SSE bridge and appear live in the Response Center.

## Run everything (one click)

Double-click **`Bayani start.bat`** on the Desktop. It:

1. Kills leftover servers on ports 8000 / 4000 / 4001
2. Runs `npm install` in both projects
3. Starts the Express backend (8000), the Response Center (4000) and the
   Citizen App (4001)
4. Opens Chrome for both apps

Check that both apps show the blue **BRIDGE LINK** pill in the header.

## Run manually

```bash
# Backend (shared sync server, SQLite/Turso) — from bayani-alert
npm run server            # http://localhost:8000

# Response Center
npm run dev               # http://localhost:4000

# Citizen app (separate terminal, from bayani-app)
cd ../bayani-app
npm run dev               # http://localhost:4001
```

## Demo flow (no hardware required)

1. Open the Bayani App (4001) and press the red **SOS** button — it simulates
   the physical thigh-band squeeze trigger.
2. The incident appears instantly in the Bayani Alert Response Center (4000)
   with live GPS, audio-status and a dispatch map.
3. Assign a responder / update the status in the Response Center — the citizen
   app reflects it live.

## Environment

Copy `.env.example` to `.env` and fill in what you need:

- `DATABASE_URL` / `TURSO_AUTH_TOKEN` — Turso hosted DB. **Leave empty to use
  the local file DB** (`server/data/incidents.db`, works offline).
- `SMS_MODE=simulation` (default, never sends real texts) or `live` with a
  Semaphore key for real emergency SMS.
- `VITE_GOOGLE_MAPS_API_KEY` — Google Maps JS API key. Without it the app
  falls back to keyless Google embed iframes (maps + Street View still render).

## Scripts

| Script       | Description                        |
| ------------ | ---------------------------------- |
| `npm run dev`  | Vite dev server (port 4000)        |
| `npm run server` | Express backend + SSE bridge (port 8000) |
| `npm run build` | Production build                  |
| `npm run lint`  | TypeScript type-check (`tsc --noEmit`) |

## Hardware roadmap

The wearable is currently **simulated in software** (GPS, GSM, BLE, battery,
stealth mode, squeeze-trigger SOS). For the finals, a physical discreet
thigh-band module will feed real telemetry into the same services through a
BLE / GSM / MQTT gateway — no front-end changes required.