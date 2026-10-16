/**
 * Authence client — Response Center (Bayani Alert) side.
 * Talks to the shared backend (Bayani Express Sync Server, port 8000).
 * Session token is kept in localStorage under bayani_rc_session.
 */

export interface AuthUser {
  username: string;
  email: string;
  role: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const API_URL =
  import.meta.env.VITE_BRIDGE_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;
const STORAGE_KEY = 'bayani_rc_session';

export async function login(username: string, password: string): Promise<AuthSession> {
  const r = await fetch(`${API_URL}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'Login failed');
  const session: AuthSession = { token: data.token, user: data.user };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.token && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession | null) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns `true` when the stored session token still maps to a valid account
 * on the backend. Backend sessions live in memory, so ANY server restart
 * invalidates every stored RC token. Call this on sign-in so the console
 * drops a stale session and shows the login screen again (otherwise the RC
 * streams as "anonymous" and never receives SOS frames / account counts).
 */
export async function validateSession(session: AuthSession | null): Promise<boolean> {
  if (!session?.token) return false;
  try {
    const r = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function logout() {
  const session = getSession();
  if (session?.token) {
    try {
      void fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => {});
    } catch {
      // ignore — session is cleared locally regardless
    }
  }
  localStorage.removeItem(STORAGE_KEY);
}