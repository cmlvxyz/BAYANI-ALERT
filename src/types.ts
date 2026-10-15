/**
 * Bayani Alert - Shared TypeScript Interfaces & Types
 */

export type IncidentStatus = 
  | 'ACTIVE' 
  | 'RESPONDING' 
  | 'RESPONDER EN ROUTE' 
  | 'ON SCENE' 
  | 'WAIT FOR ME'
  | 'ON THE WAY'
  | 'RESOLVED' 
  | 'CANCELLED'
  | 'PENDING';

/** Where the alert originated: the app's SOS button, or a paired wearable. */
export type IncidentSource = 'APP' | 'HARDWARE';

export interface IncidentTimelineStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  timestamp: string;
}

/** Snapshot of the logged-in citizen account, carried inside the SOS payload. */
export interface CitizenAccountProfile {
  username: string;
  fullName: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  age: number | null;
  avatar: string;
}

export interface Incident {
  id: string;
  incidentCode: string;
  userName: string;
  userPhone: string;
  /** Profile of the account that was logged in when the SOS was raised. */
  userProfile?: CitizenAccountProfile;
  timeActivated: string;
  date: string;
  status: IncidentStatus;
  location: {
    address: string;
    barangay: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    accuracyRadiusMeters: number;
    /** ISO-8601 timestamp of when the exact GPS fix was captured by the device. */
    gpsTimestamp?: string;
    /** Where the coordinates came from: the device GPS, an IP approximation, or a manual override. */
    source?: 'gps' | 'ip' | 'override';
    /** Exact Street View panorama for this location, if known. */
    pano?: string;
    heading?: number;
    pitch?: number;
  };
  gpsStatus: 'LOCATION RECEIVED' | 'LIVE' | 'SEARCHING';
  audioStatus: 'RECORDING ACTIVE' | 'STORED' | 'READY';
  communicationStatus: 'SOS SENT' | 'CONFIRMED' | 'PENDING';
  trustedContactsNotified: boolean;
  authoritiesNotified: boolean;
  assignedResponder?: {
    id: string;
    name: string;
    unit: string;
    role: string;
    phone: string;
    eta: string;
    coordinates?: { lat: number; lng: number };
  };
  timeline: IncidentTimelineStep[];
  audioRecordId?: string;
  notes?: string;
  /** Where this alert was fired from (the app button, or a paired wearable). */
  source?: IncidentSource;
  /** Server-built incidents (hardware SOS) carry the reporting device's health. */
  device?: IncidentDeviceInfo;
  /** ISO-8601 timestamp when this incident was marked RESOLVED. Set by the RC. */
  resolvedAt?: string;
  /** Per-contact SMS delivery record for this incident (written by the backend). */
  smsNotifications?: SmsDispatch;
}

export type SmsNotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'SIMULATED' | 'FAILED';

export interface SmsNotificationResult {
  id: string;
  contactId: string | null;
  contactName: string;
  /** Normalized provider format (e.g. 639171234567). */
  recipient: string;
  /** Masked form safe to display/log (e.g. 6391••••4567). */
  phoneMasked: string;
  provider: string;
  status: SmsNotificationStatus;
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export interface SmsDispatch {
  incidentId: string | null;
  incidentCode: string | null;
  mode: 'simulation' | 'live' | string;
  provider: string;
  sentAt: string;
  results: SmsNotificationResult[];
  summary: { total: number; sent: number; simulated: number; failed: number; queued?: number };
}

export interface EmergencyContactItem {
  id: string;
  name: string;
  role: 'Family' | 'Friend' | 'Guardian' | 'Barangay Response Team' | 'VAWC Desk' | 'Police / Emergency Response' | 'Medical Response';
  category: 'trusted' | 'authority';
  phone: string;
  notificationStatus: 'NOTIFIED' | 'CONTACTED' | 'EN ROUTE' | 'STANDBY';
  relationship?: string;
  /** Disabled contacts are skipped by the SOS SMS fan-out. Defaults to active. */
  isActive?: boolean;
}

export interface AppNotification {
  id: string;
  type: 'sos' | 'location' | 'audio' | 'contact' | 'responder' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isEmergency?: boolean;
}

export interface AudioEvidenceItem {
  id: string;
  incidentId: string;
  incidentCode: string;
  date: string;
  time: string;
  durationSeconds: number;
  status: 'RECORDING' | 'STORED' | 'ARCHIVED';
  fileSize: string;
  sha256Hash: string;
}

export interface ResponderAgent {
  id: string;
  name: string;
  unit: string;
  type: 'Barangay' | 'Police' | 'VAWC' | 'Medical';
  status: 'Available' | 'Dispatched' | 'On Scene' | 'Off Duty';
  phone: string;
  currentSector: string;
}

export type UserNavTab = 'home' | 'map' | 'incidents' | 'contacts' | 'settings';
export type ResponderNavTab = 'dashboard' | 'incidents' | 'map' | 'responders' | 'contacts' | 'reports' | 'settings';

// ------------------------------------------------------- hardware (wearable)

/** Device-reported health, attached to a hardware incident. */
export interface IncidentDeviceInfo {
  deviceId: string;
  label?: string;
  deviceType?: string;
  /** Battery percentage (0-100). */
  battery?: number;
  /** Raw cellular signal: 0-31 (network order) or a human label. */
  gsmSignal?: number | string;
  gpsFix?: string;
  accuracy?: number;
}

/**
 * Body of `POST /device/sos` as sent by the wearable firmware over HTTPS.
 * Authenticated with the `X-Device-Key` header (server-side secret — never
 * present in this app). Documented in docs/HARDWARE_INTEGRATION.md.
 */
export interface DeviceSosRequest {
  deviceId: string;
  event: 'SOS';
  latitude: number;
  longitude: number;
  /** ISO-8601 timestamp of the GPS fix. */
  timestamp: string;
  accuracy?: number;
  battery?: number;
  gsmSignal?: number | string;
  gpsFix?: string;
  /** Stable id for one physical press; makes a retry idempotent. */
  eventId?: string;
}

/** Successful `POST /device/sos` reply. */
export interface DeviceSosResponse {
  ok: true;
  incidentId: string;
  incidentCode: string;
  /** True when a retry resolved to the incident that already exists. */
  duplicate: boolean;
}

/** Live SSE frame the backend emits for a wearable SOS. */
export interface HardwareSosEvent {
  source: 'hardware';
  type: 'hardware_sos';
  payload: Incident;
}
