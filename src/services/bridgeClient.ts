/**
 * Bayani Bridge client — response center (Bayani Alert) side.
 *
 * - Subscribes to SOS incidents pushed by the citizen app (SSE /stream)
 * - Subscribes to wearable SOS raised by a registered device (type: hardware_sos)
 * - Receives live SMS delivery updates from the backend (type: sms_update)
 * - Pushes responder status updates / resolve events back (POST /event)
 * - Reports bridge online/offline so the UI can show a connection pill
 */

import { Incident, SmsDispatch } from '../types';
import { getSession } from './authClient';

// Bridge base URL — overridable via VITE_BRIDGE_URL (e.g. http://192.168.1.5:8000
// when Bayani App / Alert run on a different machine on the same network).
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:8000';

/** Authorization headers for the signed-in RC operator (when present). */
function authHeaders(): Record<string, string> {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

export interface ResponseBridgeHandlers {
  onSOS?: (inc: Incident) => void;
  /** SOS raised by a registered wearable device (already normalized server-side). */
  onHardwareSOS?: (inc: Incident) => void;
  onResolve?: (incidentCode: string) => void;
  onOnlineChange?: (online: boolean) => void;
  onSmsUpdate?: (payload: { id: string; incidentCode?: string; smsNotifications: SmsDispatch }) => void;
  onDelete?: (incidentId: string) => void;
  onAccountsUpdate?: () => void;
  onAudioLive?: (payload: { incidentCode: string; audioUrl: string }) => void;
}

export function connectBridge(handlers: ResponseBridgeHandlers): () => void {
  let online = false;

  const setOnline = (v: boolean) => {
    if (v !== online) {
      online = v;
      handlers.onOnlineChange?.(v);
    }
  };

  const token = getSession()?.token || '';
  // Pass the session token so the server can resolve this client's role and
  // deliver the sensitive live-SOS frames (the stream is re-created by the app
  // whenever the operator signs in, so the token is always up to date).
  const es = new EventSource(`${BRIDGE_URL}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`);
  es.onopen = () => setOnline(true);
  es.onerror = () => setOnline(false); // EventSource auto-reconnects

  es.onmessage = (ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.source === 'citizen' && msg.type === 'sos' && handlers.onSOS) {
        handlers.onSOS(msg.payload);
      } else if (msg.source === 'hardware' && msg.type === 'hardware_sos' && handlers.onHardwareSOS) {
        // Raised by a wearable device straight on the backend. The incident is
        // already built and stored — the console only displays it.
        handlers.onHardwareSOS(msg.payload);
      } else if (msg.source === 'citizen' && msg.type === 'resolve' && handlers.onResolve) {
        handlers.onResolve(msg.payload);
      } else if (msg.source === 'server' && msg.type === 'sms_update' && handlers.onSmsUpdate) {
        handlers.onSmsUpdate(msg.payload);
      } else if (msg.source === 'server' && msg.type === 'incident_deleted' && handlers.onDelete) {
        handlers.onDelete(msg.payload?.id);
      } else if (msg.source === 'server' && msg.type === 'accounts_update' && handlers.onAccountsUpdate) {
        handlers.onAccountsUpdate();
      } else if (msg.source === 'citizen' && msg.type === 'audio_live' && handlers.onAudioLive) {
        handlers.onAudioLive({
          incidentCode: String(msg.payload?.incidentCode ?? ''),
          audioUrl: String(msg.payload?.audioUrl ?? ''),
        });
      }
    } catch {
      // ignore malformed frames
    }
  };

  const healthTimer = window.setInterval(async () => {
    try {
      const r = await fetch(`${BRIDGE_URL}/health`);
      setOnline(r.ok);
    } catch {
      setOnline(false);
    }
  }, 5000);

  return () => {
    window.clearInterval(healthTimer);
    es.close();
  };
}

/** Broadcast a status / responder update to the citizen app. */
export function emitStatusUpdate(inc: Partial<Incident>) {
  post({
    source: 'response',
    type: 'status_update',
    payload: inc,
  });
}

/** Broadcast resolution (or citizen-side cancel) so the citizen app clears. */
export function emitResolve(incidentCode: string) {
  post({
    source: 'response',
    type: 'resolve',
    payload: incidentCode,
  });
}

/**
 * Fetch incidents persisted on the backend (database) — used for the initial
 * load when Bayani Alert starts or (re)connects. Returns newest-first rows.
 */
export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${BRIDGE_URL}/incidents`, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Bayani Bridge unreachable (GET /incidents → ${res.status}). Sign in or start the backend first.`);
  }
  const data = await res.json();
  return Array.isArray(data?.incidents) ? data.incidents : [];
}

/**
 * Permanently delete a single incident from the backend store. The server
 * broadcasts `incident_deleted` so every connected Response Center removes it.
 */
export async function deleteIncident(id: string): Promise<void> {
  const res = await fetch(`${BRIDGE_URL}/incidents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete incident (DELETE /incidents/${id} → ${res.status}).`);
}

/**
 * Logged-in Bayani App accounts currently online (from citizen heartbeats).
 * Returns the count plus the list of usernames.
 */
export async function fetchOnlineAccounts(): Promise<{ count: number; accounts: string[] }> {
  const res = await fetch(`${BRIDGE_URL}/accounts`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (!res.ok) return { count: 0, accounts: [] };
  const data = await res.json();
  return {
    count: typeof data?.count === 'number' ? data.count : 0,
    accounts: Array.isArray(data?.accounts) ? data.accounts.map(String) : [],
  };
}

function post(msg: unknown) {
  try {
    fetch(`${BRIDGE_URL}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(msg),
    }).catch(() => {});
  } catch {
    // offline — ignore
  }
}