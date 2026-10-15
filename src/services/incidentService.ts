/**
 * Bayani Alert - Incident Management & State Service
 * 
 * Synchronizes emergency state across:
 * - Hardware simulation event
 * - Citizen / User Mobile App
 * - Responder / Authority Command Center
 */

import { Incident, EmergencyContactItem, AppNotification, AudioEvidenceItem, ResponderAgent, IncidentStatus, SmsDispatch } from '../types';
import { hardwareService, WearableDeviceTelemetry } from './hardwareService';

const INITIAL_INCIDENT: Incident | null = null;
const INITIAL_PAST_INCIDENTS: Incident[] = [];
const INITIAL_CONTACTS: EmergencyContactItem[] = [];
const INITIAL_NOTIFICATIONS: AppNotification[] = [];
const INITIAL_AUDIO_EVIDENCE: AudioEvidenceItem[] = [];

/** On-duty responder units na laging handa para sa field response. */
const INITIAL_RESPONDERS: ResponderAgent[] = [
  {
    id: 'resp-police-1',
    name: 'PLT Marvin Dela Cruz',
    unit: 'PNP Barangay Patrol',
    type: 'Police',
    status: 'Available',
    phone: '0995 900 0001',
    currentSector: 'Sector 1',
  },
  {
    id: 'resp-police-2',
    name: 'SPO1 Jemuel Santos',
    unit: 'PNP Quick Response',
    type: 'Police',
    status: 'Available',
    phone: '0995 900 0002',
    currentSector: 'Sector 2',
  },
  {
    id: 'resp-barangay-1',
    name: 'Kagawad Rodrigo Mendoza',
    unit: 'Barangay Tanod Quick Reaction',
    type: 'Barangay',
    status: 'Available',
    phone: '0995 900 0003',
    currentSector: 'Sector 1',
  },
  {
    id: 'resp-barangay-2',
    name: 'Jayson Bautista',
    unit: 'Barangay Safety Officer',
    type: 'Barangay',
    status: 'Available',
    phone: '0995 900 0004',
    currentSector: 'Sector 3',
  },
  {
    id: 'resp-medical-1',
    name: 'Angeline Cruz',
    unit: 'Barangay Health Station',
    type: 'Medical',
    status: 'Available',
    phone: '0995 900 0005',
    currentSector: 'Sector 2',
  },
  {
    id: 'resp-medical-2',
    name: 'Jan Carlo Reyes',
    unit: 'First Responder Team',
    type: 'Medical',
    status: 'Available',
    phone: '0995 900 0006',
    currentSector: 'Sector 4',
  },
  {
    id: 'resp-vawc-1',
    name: 'PSSg. Diane Villar',
    unit: 'VAWC Case Worker',
    type: 'VAWC',
    status: 'Available',
    phone: '0995 900 0007',
    currentSector: 'Sector 3',
  },
];

/** Safe default for legacy alerts that were stored without a location. */
const EMPTY_LOCATION: Incident['location'] = {
  address: 'Location unavailable',
  barangay: '—',
  city: '—',
  country: 'Philippines',
  lat: 0,
  lng: 0,
  accuracyRadiusMeters: 0,
};

/**
 * Live incidents only ever carry the two statuses the Response Center uses:
 * "WAIT FOR ME" (alert received, responding) and "ON THE WAY" (responder in
 * transit). Any legacy open status (ACTIVE, RESPONDING, ON SCENE, …) collapses
 * into "WAIT FOR ME"; RESOLVED / CANCELLED stay as-is.
 */
function normalizeLiveStatus(status: IncidentStatus): IncidentStatus {
  if (status === 'WAIT FOR ME' || status === 'ON THE WAY') return status;
  if (status === 'RESOLVED' || status === 'CANCELLED') return status;
  return 'WAIT FOR ME';
}

/**
 * Allowed incident lifecycle transitions, enforced in the RC so statuses can
 * only move forward (NEW → acknowledged → en route → concluded) and a resolved
 * or cancelled alert can never be flipped back open by mistake.
 */
const VALID_TRANSITIONS: Record<string, IncidentStatus[]> = {
  'ACTIVE': ['WAIT FOR ME', 'ON THE WAY', 'RESOLVED', 'CANCELLED'],
  'RESPONDING': ['WAIT FOR ME', 'ON THE WAY', 'RESOLVED', 'CANCELLED'],
  'RESPONDER EN ROUTE': ['RESOLVED', 'CANCELLED'],
  'ON SCENE': ['RESOLVED', 'CANCELLED'],
  'PENDING': ['WAIT FOR ME', 'ON THE WAY', 'RESOLVED', 'CANCELLED'],
  'WAIT FOR ME': ['WAIT FOR ME', 'ON THE WAY', 'RESOLVED', 'CANCELLED'],
  'ON THE WAY': ['ON THE WAY', 'RESOLVED', 'CANCELLED'],
  'RESOLVED': [],
  'CANCELLED': [],
};

/** True when `to` is a legal life-cycle successor of `from` (same status is ok). */
export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** A RESOLVED incident is auto-archived (hidden from the list) after 24 hours. */
export const RESOLVED_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Deleted incident ids, persisted so a reload/reconnect never resurrects them. */
const DELETED_IDS_KEY = 'bayani_alert_deleted_incidents';

function loadDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveDeletedIds(ids: Set<string>) {
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // storage unavailable — in-memory set still protects the session
  }
}

/**
 * Which SOS this console actually saw arrive live, remembered for the lifetime
 * of THIS tab. Reloading the tab keeps the alert on the board (the operator
 * must not lose an ongoing emergency by refreshing), while a brand-new tab /
 * relaunched console starts empty — so an old open row in the backend can never
 * raise a phantom alarm on startup. This is the "arm only on a real press, but
 * survive a reload" rule.
 */
const LIVE_SOS_KEY = 'bayani_rc_live_sos';

function readLiveSosId(): string | null {
  try {
    return sessionStorage.getItem(LIVE_SOS_KEY);
  } catch {
    return null;
  }
}

function writeLiveSosId(id: string) {
  try {
    sessionStorage.setItem(LIVE_SOS_KEY, id);
  } catch {
    // storage unavailable — reload just won't restore, never a phantom
  }
}

function clearLiveSosId() {
  try {
    sessionStorage.removeItem(LIVE_SOS_KEY);
  } catch {
    // ignore
  }
}

/** True when the incident is RESOLVED and the 24-hour retention window passed. */
function isExpiredResolved(inc: Incident): boolean {
  if (!inc || inc.status !== 'RESOLVED' || !inc.resolvedAt) return false;
  const age = Date.now() - Date.parse(inc.resolvedAt);
  return Number.isFinite(age) && age >= RESOLVED_RETENTION_MS;
}

/** Guarantee every incident carries a usable location for all RC screens. */
function normalizeLocation(inc: Incident): Incident {
  if (inc?.location && typeof inc.location === 'object' && !Array.isArray(inc.location)) return inc;
  if (!inc) return inc;
  return { ...inc, location: { ...EMPTY_LOCATION } };
}

type IncidentServiceListener = () => void;

class IncidentService {
  private activeIncident: Incident | null = INITIAL_INCIDENT;
  private incidents: Incident[] = [...INITIAL_PAST_INCIDENTS];
  private contacts: EmergencyContactItem[] = [...INITIAL_CONTACTS];
  private notifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];
  private audioEvidence: AudioEvidenceItem[] = [...INITIAL_AUDIO_EVIDENCE];
  private responders: ResponderAgent[] = [...INITIAL_RESPONDERS];
  private listeners: IncidentServiceListener[] = [];
  /** Incidents deleted locally; never re-added by a later DB/reconnect reload. */
  private deletedIds = loadDeletedIds();

  constructor() {
    // Listen to hardware events
    hardwareService.subscribe((telemetry: WearableDeviceTelemetry) => {
      if (telemetry.event === 'SOS') {
        this.handleHardwareSOSActivation(telemetry);
      } else if (telemetry.event === 'IDLE' && this.activeIncident && this.activeIncident.status === 'RESOLVED') {
        // Safe idle
      }
    });
  }

  public subscribe(listener: IncidentServiceListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) {
      l();
    }
  }

  public getActiveIncident(): Incident | null {
    return this.activeIncident;
  }

  public getIncidents(): Incident[] {
    return [...this.incidents];
  }

  public getContacts(): EmergencyContactItem[] {
    return [...this.contacts];
  }

  public getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  public getAudioEvidence(): AudioEvidenceItem[] {
    return [...this.audioEvidence];
  }

  public getResponders(): ResponderAgent[] {
    return [...this.responders];
  }

  /**
   * Handle incoming hardware squeeze SOS activation
   */
  private handleHardwareSOSActivation(telemetry: WearableDeviceTelemetry) {
    const newCode = `BA-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newIncident: Incident = {
      id: `inc-${Date.now()}`,
      incidentCode: newCode,
      userName: 'Citizen',
      userPhone: '—',
      timeActivated: currentTime,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      status: 'WAIT FOR ME',
      location: {
        address: telemetry.locationName || 'Location pending',
        barangay: telemetry.barangay || '—',
        city: telemetry.city || '—',
        country: 'Philippines',
        lat: telemetry.latitude || 0,
        lng: telemetry.longitude || 0,
        accuracyRadiusMeters: 3.2,
      },
      gpsStatus: 'LOCATION RECEIVED',
      audioStatus: 'RECORDING ACTIVE',
      communicationStatus: 'SOS SENT',
      trustedContactsNotified: true,
      authoritiesNotified: true,
      assignedResponder: {
        id: `resp-${Date.now()}`,
        name: 'Responder Unit',
        unit: 'Unassigned',
        role: 'Dispatch',
        phone: '—',
        eta: 'Pending',
      },
      timeline: [
        { id: '1', title: 'SOS Trigger Activated', description: 'Hidden thigh trigger squeezed', status: 'completed', timestamp: currentTime },
        { id: '2', title: 'GPS Location Received', description: 'Location pinned and transmitted', status: 'completed', timestamp: currentTime },
        { id: '3', title: 'Audio Recording Started', description: 'Ambient capture in background', status: 'completed', timestamp: currentTime },
        { id: '4', title: 'Emergency Alert Sent', description: 'SOS broadcast to Bayani Alert cloud', status: 'completed', timestamp: currentTime },
        { id: '5', title: 'Trusted Contacts Notified', description: 'SMS dispatched with live link', status: 'completed', timestamp: currentTime },
        { id: '6', title: 'Authorities Notified', description: 'Authorities alerted', status: 'completed', timestamp: currentTime },
        { id: '7', title: 'Responder En Route', description: 'Unit moving to coordinates', status: 'in_progress', timestamp: currentTime },
      ],
      notes: 'Emergency activated via wearable squeeze trigger. Live audio and location broadcasting.',
    };

    this.activeIncident = newIncident;
    // Add to incidents list (uniquely)
    this.incidents = [newIncident, ...this.incidents.filter(i => i.id !== newIncident.id)];

    // Create notifications
    const newNotifications: AppNotification[] = [
      {
        id: `notif-${Date.now()}-1`,
        type: 'sos',
        title: '🚨 SOS Activated',
        message: 'Emergency signal received from your wearable.',
        timestamp: currentTime,
        isRead: false,
        isEmergency: true,
      },
      {
        id: `notif-${Date.now()}-2`,
        type: 'location',
        title: '📍 Location Received',
        message: 'Your current GPS location has been transmitted.',
        timestamp: currentTime,
        isRead: false,
        isEmergency: false,
      },
      {
        id: `notif-${Date.now()}-3`,
        type: 'audio',
        title: '🎙 Audio Recording',
        message: 'Emergency audio recording is active.',
        timestamp: currentTime,
        isRead: false,
        isEmergency: false,
      },
      {
        id: `notif-${Date.now()}-4`,
        type: 'contact',
        title: '👥 Contact Notified',
        message: 'Your trusted contact has been notified.',
        timestamp: currentTime,
        isRead: false,
        isEmergency: false,
      },
      {
        id: `notif-${Date.now()}-5`,
        type: 'responder',
        title: '🚓 Responder Assigned',
        message: 'A responder has been assigned to your incident.',
        timestamp: currentTime,
        isRead: false,
        isEmergency: true,
      },
    ];

    this.notifications = [...newNotifications, ...this.notifications];

    // Create audio evidence item
    const newAudio: AudioEvidenceItem = {
      id: `aud-${Date.now()}`,
      incidentId: newIncident.id,
      incidentCode: newIncident.incidentCode,
      date: newIncident.date,
      time: currentTime,
      durationSeconds: 45,
      status: 'RECORDING',
      fileSize: '1.8 MB',
      sha256Hash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    };
    this.audioEvidence = [newAudio, ...this.audioEvidence];

    this.notify();
  }

  /**
   * Bulk-load incidents persisted on the backend (used for the initial load
   * when Bayani Alert starts, and after a reconnect). Merges by id so live
   * SSE arrivals are never duplicated, and crucially PRESERVES the stored
   * status (a RESOLVED incident stays RESOLVED across restarts).
   */
  public loadIncidents(items: Incident[]) {
    if (!Array.isArray(items) || items.length === 0) return;

    const known = new Set(this.incidents.map(i => i.id));
    let changed = false;
    for (const inc of items) {
      if (!inc || !inc.id || known.has(inc.id) || this.deletedIds.has(inc.id)) continue;
      known.add(inc.id);
      this.incidents.push(normalizeLocation({ ...inc, status: normalizeLiveStatus(inc.status) }));
      changed = true;
    }
    if (!changed) return;

    // Newest first (server already orders newest-first; keep it stable).
    this.incidents.sort((a, b) => (a.id < b.id ? 1 : -1));

    // RESOLVED incidents beyond the 24-hour window are auto-archived.
    this.pruneExpiredResolved();

    // Restore the alert this console actually saw arrive live, but only within
    // THIS tab (see LIVE_SOS_KEY): refreshing keeps an ongoing emergency on the
    // board, while a fresh tab/console start stays quiet even if the backend
    // still holds an open row. Stored history alone never arms the board.
    if (!this.activeIncident) {
      const liveId = readLiveSosId();
      const live = liveId ? this.incidents.find((i) => i.id === liveId) : undefined;
      if (live && live.status !== 'RESOLVED' && live.status !== 'CANCELLED') {
        this.activeIncident = normalizeLocation(live);
      } else if (liveId) {
        // The alert we were showing is gone or already closed.
        clearLiveSosId();
      }
    }

    this.notify();
  }

  /**
   * Ingest an SOS incident that arrived over the Bridge from the citizen app.
   * This is the ONLY path that arms the active emergency — a live citizen press.
   */
  public ingestIncomingSOS(inc: Incident) {
    if (this.deletedIds.has(inc.id)) return;

    const alreadyActive = this.activeIncident?.id === inc.id;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const incoming: Incident = normalizeLocation({
      ...inc,
      status: normalizeLiveStatus(inc.status),
      timeline: [
        { id: 'b1', title: 'SOS Received via Bridge', description: 'Live from Bayani App (citizen)', status: 'completed', timestamp: currentTime },
        ...(inc.timeline ?? []),
      ],
    });

    // A live frame is authoritative: it must arm the board even when the same
    // incident was already pulled from the backend as history (otherwise the
    // reload-history load would swallow the live press and nothing activates).
    this.activeIncident = incoming;
    this.incidents = [incoming, ...this.incidents.filter((i) => i.id !== inc.id)];
    // Remember for this tab so a reload keeps the emergency on the board.
    writeLiveSosId(incoming.id);

    if (!alreadyActive) {
      this.notifications = [
        {
          id: `notif-b-${Date.now()}`,
          type: 'sos',
          title: '🚨 INCOMING SOS',
          message: `Live SOS received from the citizen app (${incoming.incidentCode}).`,
          timestamp: currentTime,
          isRead: false,
          isEmergency: true,
        },
        ...this.notifications,
      ];
    }

    this.notify();
  }

  /**
   * Ingest a SOS raised by a registered wearable device (backend frame
   * `hardware_sos`). The incident was already built, stored and dispatched by
   * the backend, so this ONLY displays it — the console never re-sends,
   * re-broadcasts or re-creates an emergency.
   */
  public ingestIncomingHardwareSOS(inc: Incident) {
    if (!inc || !inc.id) return;
    if (this.deletedIds.has(inc.id)) return;

    const alreadyActive = this.activeIncident?.id === inc.id;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const deviceLabel = inc.device?.label || inc.device?.deviceId || 'wearable device';
    const incoming: Incident = normalizeLocation({
      ...inc,
      source: 'HARDWARE',
      status: normalizeLiveStatus(inc.status),
      timeline: [
        { id: 'h1', title: 'SOS Received from Wearable', description: `Live from ${deviceLabel}`, status: 'completed', timestamp: currentTime },
        ...(inc.timeline ?? []),
      ],
    });

    // A live frame is authoritative: it arms the board even when the same
    // incident was already pulled from the backend as history.
    this.activeIncident = incoming;
    this.incidents = [incoming, ...this.incidents.filter((i) => i.id !== inc.id)];
    // Remember for this tab so a reload keeps the emergency on the board.
    writeLiveSosId(incoming.id);

    if (!alreadyActive) {
      this.notifications = [
        {
          id: `notif-h-${Date.now()}`,
          type: 'sos',
          title: '🚨 WEARABLE SOS',
          message: `Emergency triggered by ${deviceLabel} (${incoming.incidentCode}).`,
          timestamp: currentTime,
          isRead: false,
          isEmergency: true,
        },
        ...this.notifications,
      ];
    }

    this.notify();
  }

  /**
   * Merge an SMS delivery report that arrived over the Bridge from the backend.
   * Updates both the active incident and its archived copy (if present).
   */
  public applySmsUpdate(incidentId: string, smsNotifications: SmsDispatch | undefined) {
    if (!incidentId || !smsNotifications) return;

    if (this.activeIncident && this.activeIncident.id === incidentId) {
      this.activeIncident = { ...this.activeIncident, smsNotifications };
    }

    this.incidents = this.incidents.map((inc) =>
      inc.id === incidentId ? { ...inc, smsNotifications } : inc
    );

    this.notify();
  }

  public updateIncidentStatus(incidentId: string, status: IncidentStatus) {
    const normalized = normalizeLiveStatus(status);
    const current =
      (this.activeIncident && this.activeIncident.id === incidentId
        ? this.activeIncident.status
        : this.incidents.find((i) => i.id === incidentId)?.status) || 'WAIT FOR ME';
    if (!canTransition(current, normalized)) {
      console.warn(`[bayani-alert] Blocked invalid transition ${current} → ${normalized}`);
      return;
    }
    const stamp = new Date().toISOString();
    if (this.activeIncident && this.activeIncident.id === incidentId) {
      this.activeIncident = {
        ...this.activeIncident,
        status: normalized,
        ...(normalized === 'RESOLVED' ? { resolvedAt: this.activeIncident.resolvedAt ?? stamp } : {}),
      };
      if (normalized === 'RESOLVED' || normalized === 'CANCELLED') {
        hardwareService.resetHardware();
        clearLiveSosId();
      }
    }

    this.incidents = this.incidents.map((inc) => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: normalized,
          ...(normalized === 'RESOLVED' ? { resolvedAt: inc.resolvedAt ?? stamp } : {}),
        };
      }
      return inc;
    });

    this.notify();

    // RESOLVED incidents older than 24 hours are removed from the live list.
    this.pruneExpiredResolved();
  }

  public assignResponder(incidentId: string, responder: ResponderAgent) {
    if (this.activeIncident && this.activeIncident.id === incidentId) {
      this.activeIncident = {
        ...this.activeIncident,
        status: 'ON THE WAY',
        assignedResponder: {
          id: responder.id,
          name: responder.name,
          unit: responder.unit,
          role: responder.type,
          phone: responder.phone,
          eta: '1-3 mins',
        },
      };
    }

    this.incidents = this.incidents.map((inc) => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: 'ON THE WAY',
          assignedResponder: {
            id: responder.id,
            name: responder.name,
            unit: responder.unit,
            role: responder.type,
            phone: responder.phone,
            eta: '1-3 mins',
          },
        };
      }
      return inc;
    });

    this.responders = this.responders.map((r) => {
      if (r.id === responder.id) {
        return { ...r, status: 'Dispatched' };
      }
      return r;
    });

    this.notify();
  }

  public addContact(contact: Omit<EmergencyContactItem, 'id'>): EmergencyContactItem {
    const newC: EmergencyContactItem = {
      ...contact,
      id: `c-${Date.now()}`,
    };
    this.contacts = [...this.contacts, newC];
    this.notify();
    return newC;
  }

  public updateContact(contact: EmergencyContactItem) {
    this.contacts = this.contacts.map(c => c.id === contact.id ? contact : c);
    this.notify();
  }

  public deleteContact(contactId: string) {
    this.contacts = this.contacts.filter(c => c.id !== contactId);
    this.notify();
  }

  public markAllNotificationsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.notify();
  }

  public deleteIncident(incidentId: string) {
    this.deletedIds.add(incidentId);
    saveDeletedIds(this.deletedIds);
    const before = this.incidents.length;
    this.incidents = this.incidents.filter(inc => inc.id !== incidentId);

    if (this.activeIncident && this.activeIncident.id === incidentId) {
      this.activeIncident = null;
      hardwareService.resetHardware();
      clearLiveSosId();
    }

    if (this.incidents.length !== before) this.notify();
  }

  public clearActiveEmergency() {
    if (this.activeIncident) {
      this.updateIncidentStatus(this.activeIncident.id, 'RESOLVED');
    }
    hardwareService.resetHardware();
    this.activeIncident = null;
    clearLiveSosId();
    this.notify();
  }

  /**
   * Remove RESOLVED incidents that reached the 24-hour retention window from
   * the live list. Legacy resolved incidents without a `resolvedAt` stamp are
   * kept visible so no historical data is ever lost unexpectedly.
   */
  public pruneExpiredResolved() {
    const before = this.incidents.length;
    this.incidents = this.incidents.filter(inc => !isExpiredResolved(inc));
    if (this.incidents.length !== before) this.notify();
  }
}

export const incidentService = new IncidentService();