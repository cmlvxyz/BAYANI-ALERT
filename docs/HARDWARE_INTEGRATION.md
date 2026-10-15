# Bayani Wearable SOS — Hardware Integration

Canonical reference for wiring the physical device (ESP32-S3 + SIMCom A7670E) into
the Bayani backend and the two existing front ends.

The device does **not** talk to either React app. It talks to the Bayani backend
over HTTPS; the backend owns the incident, and the Citizen App (Bayani App) and the
Response Center (Bayani Alert) receive it over the existing `/stream` SSE channel.
Nothing in the current UI, database schema, SMS flow, or simulation had to change.

```
  ESP32-S3 + SIMCom A7670E
            │  HTTPS  POST /device/sos        (LTE, 1 request per squeeze)
            ▼
  Bayani backend  ──▶ incidents (one row per press)
            │            ├─▶ SMS to trusted contacts
            │            ├─▶ audit log
            │            └─▶ SSE /stream
            │                   ├─▶ Bayani App   (owning citizen only)
            │                   └─▶ Bayani Alert (Response Center roles)
            ▼
     no second transmit: both apps render the stored incident as-is
```

---

## 1. Register the device on the server

Devices are declared on the **backend** (`bayani-alert/.env`). A device that is not
registered is rejected — an unknown `X-Device-Key` is a `401`, never an open door.

```bash
# bayani-alert/.env
DEVICE_BA_001_KEY=a-long-random-string-only-this-server-and-the-device-know
DEVICE_BA_001_OWNER=dela          # the citizen account that owns the band
DEVICE_BA_001_LABEL=BA-001 Thigh Band
DEVICE_BA_001_TYPE=BAYANI-WEARABLE
```

Naming rules: the device id `BA-001` maps to the prefix `DEVICE_BA_001_`.
Underscores in the id become hyphens (`BA_002` → `DEVICE_BA_002_*`). Lookup is
case-insensitive, and every variable is optional except `_KEY`:

| Variable             | Required | Meaning                                              |
| -------------------- | -------- | ---------------------------------------------------- |
| `DEVICE_<ID>_KEY`    | yes      | Shared secret sent as `X-Device-Key`                  |
| `DEVICE_<ID>_OWNER`  | no*      | Citizen `username` the incident is filed under        |
| `DEVICE_<ID>_LABEL`  | no       | Human name shown in the UI                            |
| `DEVICE_<ID>_TYPE`   | no       | Defaults to `BAYANI-WEARABLE`                         |

\* Without an owner the endpoint answers `403` — a band must be linked to a real,
active citizen account before it can raise an emergency. If the account is later
deactivated, presses are refused again with `403`.

For more than a couple of devices, or to keep the registry out of `.env`:

```bash
# JSON array; same fields, case-insensitive keys.
DEVICE_REGISTRY_JSON='[{"deviceId":"BA-001","key":"...","ownerUsername":"dela","label":"BA-001 Thigh Band"}]'
```

If both `.env` and `DEVICE_REGISTRY_JSON` define the same device, the JSON entry
wins. Keys are never logged, never returned by the API, and never sent to a browser.

Inspect what the server thinks it has (Response Center credentials required):

```bash
curl -s http://localhost:8000/devices -H "Authorization: Bearer $RC_TOKEN"
```

---

## 2. Raise an SOS from the device

One squeeze = one HTTPS request. Send it immediately; do not wait for the phone.

```bash
curl -X POST http://localhost:8000/device/sos \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: $DEVICE_BA_001_KEY" \
  -H "X-Device-Id: BA-001" \
  -d '{
        "deviceId": "BA-001",
        "event": "SOS",
        "latitude": 14.6781,
        "longitude": 120.5439,
        "timestamp": "2026-10-02T09:15:30.000Z",
        "eventId": "squeeze-000042",
        "battery": 77,
        "gsmSignal": 20,
        "gpsFix": "LOCKED",
        "accuracy": 8
      }'
```

```json
{ "ok": true, "incidentId": "inc-…", "incidentCode": "BA-2026-314", "duplicate": false }
```

### Fields

| Field         | Required | Notes                                                          |
| ------------- | -------- | -------------------------------------------------------------- |
| `deviceId`    | yes      | Must match the authenticated device, else `400`                |
| `event`       | yes      | Must be exactly `"SOS"`                                         |
| `latitude`    | yes      | `-90..90`                                                       |
| `longitude`   | yes      | `-180..180`                                                     |
| `timestamp`   | yes      | ISO-8601 from the device RTC (GPS time when available)          |
| `eventId`     | no       | Firmware-side counter; strengthens retry deduplication          |
| `accuracy`    | no       | Metres                                                          |
| `battery`     | no       | `0..100`                                                        |
| `gsmSignal`   | no       | `0..31` (CSQ) or a 0–100 percentage                            |
| `gpsFix`      | no       | e.g. `LOCKED`, `3D`, `DR`                                       |

Unknown keys are stripped, so a device cannot inject fields into the stored
incident. Coordinates are validated numerically; a body claiming a different
`deviceId` than the authenticated header is rejected rather than trusted.

### Status codes

| Code | Meaning                                                              |
| ---- | -------------------------------------------------------------------- |
| `200` | Stored (`duplicate: false`) or already known (`duplicate: true`)     |
| `400` | Invalid payload, or `deviceId` mismatch with the authenticated device |
| `401` | Unknown device id, or wrong `X-Device-Key`                            |
| `403` | No linked owner, or the owner account is missing/deactivated          |

---

## 3. Exactly one incident per press

Retries are normal: a timeout, an LTE reconnect, or a user squeezing again while
the first upload is still in flight. The server derives a `requestId` from the
device id plus the press identity (`eventId` when present, otherwise the
`timestamp`), and:

* the same press retried returns the **original** `incidentId` with
  `duplicate: true` — no second row, no second SSE frame, no second SMS;
* a genuinely new press (new `eventId`, or a later timestamp) always creates a
  new incident and a new `BA-YYYY-NNN` code;
* the check and the insert run under a per-`requestId` lock, so eight
  simultaneous uploads of one press still produce exactly one incident.

**Device guidance:** keep `eventId` stable while retrying the *same* press, and
bump it (or send a fresh timestamp) only for a new press. Do not retry more than
about five times; the backend deduplicates regardless.

---

## 4. Device status (optional)

Heartbeats keep the in-memory device status fresh. They write nothing to the
database and emit no SSE traffic.

```bash
curl -X POST http://localhost:8000/device/heartbeat \
  -H "Content-Type: application/json" -H "X-Device-Key: $DEVICE_BA_001_KEY" \
  -d '{"battery": 76, "gsmSignal": 21, "gpsFix": "LOCKED"}'
# {"ok": true, "deviceId": "BA-001", "lastSeen": "2026-10-02T09:20:11.004Z"}
```

`POST /device/telemetry` accepts the same shape for ad-hoc readings.
`GET /health` reports how many devices are registered.

---

## 5. Front-end behaviour

Both apps receive the stored incident and **display it only** — they never
re-post it, never touch the offline queue, and never ask the phone to transmit:

* `bridgeClient.onHardwareSOS()` receives the frame;
* `incidentService.receiveHardwareIncident()` (Bayani App) or
  `incidentService.ingestIncomingHardwareSOS()` (Bayani Alert) merges it;
* the citizen's live phone GPS does **not** overwrite the wearable's fix.

SSE frame delivered to the Response Center and to the owning citizen:

```json
{
  "source": "hardware",
  "type": "hardware_sos",
  "payload": { "…the stored incident, with device, timeline and smsNotifications…": "…" }
}
```

Targeting rules: the frame reaches Response Center roles and the owning citizen's
own session. It is never delivered to another citizen or to an anonymous client.

> The Citizen App connects `/stream` with its session token and reconnects when
> the session changes, so a band that presses while the app is closed is still
> shown on the next login.

### Watching the live stream by hand

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dela","password":"…"}' | jq -r .token)

curl -N "http://localhost:8000/stream?token=$TOKEN"
# then press the band, or POST /device/sos again
```

Response Center: `curl -N "http://localhost:8000/stream?token=$RC_TOKEN"`.

---

## 6. On-device checklist (ESP32-S3 + A7670E)

1. **Power and SIM:** keep the LTE modem powered and the SIM registered; a cold
   reconnect can take tens of seconds, so send the SOS on the modem that is
   already attached when possible.
2. **One request, not a stream:** open an HTTPS/TLS session, `POST /device/sos`,
   read the status line, then close. Do not hold a socket open waiting for an
   ack — the backend responds and the incident is already durable.
3. **Clock:** prefer the GPS fix time for `timestamp`. If the RTC has never been
   set, send a first `/device/heartbeat` so the server's receipt time stays
   meaningful, and expect the server to still accept the press.
4. **Retry policy:** retry the *same* payload (same `eventId`) on timeout or
   non-2xx, up to ~5 times with backoff. Never regenerate `eventId` while
   retrying one press.
5. **Minimal GPS:** request a fix, send the coordinates, then go back to low
   power. Do not keep the GNSS receiver on between presses.
6. **Key hygiene:** store `X-Device-Key` in NVS/flash, never in source, and
   never log it. The server compares keys in constant time.
7. **Battery telemetry:** include `battery` with each press so the incident
   carries the device's state at the moment of the emergency.

---

## 7. Manual test procedure

1. Start the backend and both apps; sign in as the citizen on Bayani App and as
   the Response Center on Bayani Alert.
2. `POST /device/sos` once → both UIs show the incident; Bayani App shows it as
   an active emergency and a "SOS from your wearable" notification; Bayani Alert
   shows a `WEARABLE`-badged row in **Live Incidents** and arms the board live.
3. Repeat the identical request → same `incidentId`, `duplicate: true`, and no
   new card, SSE frame, or SMS.
4. Press again with a new `eventId` → a new incident and a new code.
5. `POST /device/sos` with a wrong `X-Device-Key` → `401`, nothing stored.
6. `POST /device/sos` with no `_OWNER` configured → `403`, nothing stored.
7. `POST /device/sos` with `latitude: 999` → `400`.
8. Confirm the phone's live GPS does not move the wearable's coordinates on the
   Bayani App card.

---

## 8. Tests

```bash
cd bayani-alert
npm test        # 32 unit tests: validation, registry/auth, idempotency, code gen
```

The routes themselves (SSE targeting, dedupe, SMS dispatch, persistence) are
verified with the curl procedure in §7.

---

## 9. Related files

| File                        | Role                                              |
| --------------------------- | ------------------------------------------------- |
| `server/hardware.mjs`       | Payload validation, request id, Incident builder, request lock |
| `server/devices.mjs`        | Device registry, key auth, in-memory status        |
| `server/index.mjs`          | `/device/*` routes and owner-targeted SSE          |
| `server/db.mjs`             | `findIncidentByRequestId()`                        |
| `src/services/bridgeClient.ts` | `onHardwareSOS` stream handler                  |
| `src/services/incidentService.ts` | Front-end ingest of a stored wearable incident |

The Bayani App repo holds a short pointer at `docs/HARDWARE_INTEGRATION.md`.