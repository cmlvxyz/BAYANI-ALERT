import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  PhoneCall,
  Radio,
  CheckCircle2,
  Navigation,
  ShieldCheck,
  Volume2,
  Pause,
  Activity,
  Battery,
  Wifi,
  WifiOff,
  ArrowRight,
  MapPinned,
  Clock,
  Gauge,
} from 'lucide-react';
import { Incident, IncidentStatus, ResponderAgent, ResponderNavTab } from '../../types';
import { LiveGoogleMap, FALLBACK_COORDS } from '../LiveGoogleMap';
import { hardwareService, WearableDeviceTelemetry } from '../../services/hardwareService';

interface ResponderDashboardViewProps {
  activeIncident: Incident | null;
  incidents: Incident[];
  responders: ResponderAgent[];
  onlineAccounts?: { count: number; accounts: string[] };
  liveAudio?: { incidentCode: string; audioUrl: string } | null;
  /** Live SSE bridge connectivity, surfaced in the system-health panel. */
  bridgeOnline?: boolean;
  onNavigateTab: (tab: ResponderNavTab) => void;
  onViewIncident?: (incident: Incident) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => void;
  onAssignResponder: (incidentId: string, responder: ResponderAgent) => void;
  onResolveActiveEmergency: () => void;
}

/** Coarse severity bucket used only for presentation (never to alter data). */
const statusTone = (status: IncidentStatus): { dot: string; pill: string } => {
  switch (status) {
    case 'WAIT FOR ME':
    case 'ON THE WAY':
    case 'RESPONDING':
    case 'RESPONDER EN ROUTE':
    case 'ON SCENE':
      return { dot: 'bg-warn', pill: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'RESOLVED':
      return { dot: 'bg-success', pill: 'bg-emerald-50 text-success border-emerald-200' };
    case 'CANCELLED':
      return { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { dot: 'bg-emergency', pill: 'bg-red-50 text-emergency border-red-200' };
  }
};

export const ResponderDashboardView: React.FC<ResponderDashboardViewProps> = ({
  activeIncident,
  incidents,
  responders,
  onlineAccounts = { count: 0, accounts: [] },
  liveAudio = null,
  bridgeOnline = false,
  onNavigateTab,
  onViewIncident,
  onUpdateStatus,
  onAssignResponder,
  onResolveActiveEmergency,
}) => {
  // Every unresolved SOS is an active emergency. When several citizens press
  // their squeeze trigger at the same time, each press keeps its own card —
  // the newest arrival must never overwrite the others.
  const activeEmergencies = incidents.filter(
    (inc) => inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED',
  );
  // The live-audio walkie follows the most recent press.
  const currentEmergency = activeEmergencies[0] ?? activeIncident ?? null;

  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [assignIncidentId, setAssignIncidentId] = useState<string | null>(null);
  const [liveListening, setLiveListening] = useState(false);

  // Wearable telemetry is owned by the hardware service singleton; subscribe so
  // the system-health panel mirrors real device state.
  const [telemetry, setTelemetry] = useState<WearableDeviceTelemetry>(() => hardwareService.getTelemetry());
  useEffect(() => hardwareService.subscribe(setTelemetry), []);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const liveAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveStateCodeRef = useRef<string | null>(null);
  const userToggledRef = useRef(false);

  const stopLiveAudio = () => {
    if (liveAudioRef.current) {
      liveAudioRef.current.pause();
      liveAudioRef.current = null;
    }
  };

  const toggleLiveMonitoring = () => {
    userToggledRef.current = true; // explicit choice — never auto-re-enable
    setLiveListening((v) => !v);
  };

  // Live audio player: auto-monitors the citizen's audio feed while the
  // emergency is active. Auto-enables only the FIRST time a clip arrives for a
  // NEW incident; if the responder taps STOP it stays stopped.
  useEffect(() => {
    const currentCode = currentEmergency?.incidentCode ?? null;
    const emergencyChanged = liveStateCodeRef.current !== null && liveStateCodeRef.current !== currentCode;
    liveStateCodeRef.current = currentCode;
    if (emergencyChanged) userToggledRef.current = false; // fresh emergency → auto-hear again

    if (!liveAudio || !currentEmergency || liveAudio.incidentCode !== currentCode) {
      stopLiveAudio();
      setLiveListening(false);
      return;
    }
    const url = liveAudio.audioUrl;
    if (!url) return;
    if (!liveListening) {
      stopLiveAudio();
      if (!userToggledRef.current) setLiveListening(true);
      return;
    }
    if (liveAudioRef.current) return;
    try {
      const el = new Audio(url);
      el.loop = true;
      el.preload = 'auto';
      void el.play().catch(() => {});
      liveAudioRef.current = el;
    } catch {
      liveAudioRef.current = null;
    }
    return () => stopLiveAudio();
  }, [liveAudio?.audioUrl, liveListening, currentEmergency?.incidentCode, currentEmergency?.id]);

  // Close the status dropdown on outside click / Escape
  useEffect(() => {
    if (!statusMenuId) return;
    const onDocClick = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStatusMenuId(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [statusMenuId]);

  // Live metrics count every unresolved emergency so multiple simultaneous
  // presses are all reflected on the board.
  const respondingCount = activeEmergencies.filter(
    (i) => i.status === 'WAIT FOR ME' || i.status === 'ON THE WAY',
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;
  const availableUnits = responders.filter((r) => r.status === 'Available').length;

  // Live audio clip sent by the citizen app, but only if it belongs to the
  // emergency currently shown on the dashboard.
  const liveClip =
    liveAudio && currentEmergency && liveAudio.incidentCode === currentEmergency.incidentCode
      ? liveAudio.audioUrl
      : null;

  // True when the incident carries usable, non-zero GPS coordinates.
  const hasLocation = (inc: Incident | null): boolean =>
    !!inc &&
    typeof inc.location?.lat === 'number' &&
    typeof inc.location?.lng === 'number' &&
    (inc.location.lat !== 0 || inc.location.lng !== 0);

  const availableResponders = responders.filter(r => r.status === 'Available' || r.status === 'Dispatched');

  const statusOptions: IncidentStatus[] = ['WAIT FOR ME', 'ON THE WAY'];

  // Newest-first operations feed (bounded so the panel stays scannable).
  const recentIncidents = [...incidents]
    .sort((a, b) => (b.id > a.id ? 1 : b.id < a.id ? -1 : 0))
    .slice(0, 6);

  // Dispatch snapshot coordinates: newest active emergency, else neutral fallback.
  const snapIncident = activeEmergencies.find(hasLocation) ?? null;
  const snapLat = snapIncident?.location?.lat ?? FALLBACK_COORDS.lat;
  const snapLng = snapIncident?.location?.lng ?? FALLBACK_COORDS.lng;

  const kpis = [
    { label: 'Active SOS', value: activeEmergencies.length, sub: 'Discreet squeeze signals', icon: AlertTriangle, accent: 'text-emergency', ring: 'bg-red-50 border-red-200', live: activeEmergencies.length > 0 },
    { label: 'Responding', value: respondingCount, sub: 'Patrols en route', icon: Navigation, accent: 'text-warn', ring: 'bg-amber-50 border-amber-200', live: false },
    { label: 'Resolved', value: resolvedCount, sub: 'Safe haven secured', icon: CheckCircle2, accent: 'text-success', ring: 'bg-emerald-50 border-emerald-200', live: false },
    { label: 'Online Users', value: onlineAccounts.count, sub: onlineAccounts.count > 0 ? 'Citizen app active' : 'No app account online', icon: Radio, accent: 'text-info', ring: 'bg-cyan-50 border-cyan-200', live: onlineAccounts.count > 0 },
  ];

  return (
    <div className="space-y-5">
      {/* 1. SUMMARY METRICS */}
      <section aria-label="Operational summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rc-panel p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{k.label}</span>
                <span className={`w-8 h-8 rounded-ctl border flex items-center justify-center ${k.ring}`}>
                  <Icon className={`w-4 h-4 ${k.accent}`} />
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-ink tabular-nums leading-none">{k.value}</span>
                {k.live && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emergency opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emergency" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1.5 truncate">{k.sub}</p>
            </div>
          );
        })}
      </section>

      {/* 2. ACTIVE EMERGENCY CARDS (one per simultaneous SOS press) */}
      {activeEmergencies.length > 0 ? (
        <>
          {activeEmergencies.map((emergency, index) => (
            <section
              key={emergency.id}
              id={index === 0 ? 'responder-active-emergency-card' : undefined}
              aria-label={`Active emergency ${emergency.incidentCode}`}
              className="rc-panel overflow-hidden border-l-4 border-l-emergency animate-rise"
            >
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 bg-red-50/60 border-b border-red-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-panel bg-emergency text-white flex items-center justify-center shadow-emergency shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-black text-ink bg-white px-2 py-0.5 rounded-md border border-red-200">
                        {emergency.incidentCode}
                      </span>
                      <span className="text-xs font-black uppercase tracking-wide text-emergency">
                        Active Emergency
                      </span>
                      {emergency.source && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {emergency.source === 'HARDWARE' ? 'WEARABLE' : 'APP'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black text-ink mt-1 truncate">
                      {emergency.userName?.trim() || 'Unknown Citizen'}
                    </p>
                    <p className="text-[11px] font-medium text-muted">
                      {emergency.date} • {emergency.timeActivated}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <button
                    onClick={() => (onViewIncident ? onViewIncident(emergency) : onNavigateTab('map'))}
                    disabled={!hasLocation(emergency)}
                    className={`rc-focus-ring py-2 px-3.5 rounded-ctl text-white flex items-center gap-1.5 transition-colors active:scale-95 ${
                      hasLocation(emergency)
                        ? 'bg-success hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title="Open Google Street View at the received coordinates"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Street View</span>
                  </button>

                  <button
                    onClick={() => setAssignIncidentId(emergency.id)}
                    className="rc-focus-ring py-2 px-3.5 rounded-ctl bg-white hover:bg-slate-50 text-ink border border-line flex items-center gap-1.5 transition-colors active:scale-95"
                  >
                    <Radio className="w-4 h-4 text-brand-600" />
                    <span>Assign</span>
                  </button>

                  <button
                    onClick={() => alert(`Dialing Citizen: ${emergency.userPhone}`)}
                    className="rc-focus-ring py-2 px-3.5 rounded-ctl bg-white hover:bg-slate-50 text-ink border border-line flex items-center gap-1.5 transition-colors active:scale-95"
                  >
                    <PhoneCall className="w-4 h-4 text-success" />
                    <span>Contact</span>
                  </button>
                </div>
              </div>

              {/* Telemetry grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 text-xs">
                <div className="p-3 rounded-card bg-slate-50 border border-line">
                  <span className="text-[10px] text-muted block font-bold uppercase">Location</span>
                  {hasLocation(emergency) ? (
                    <>
                      <span className="font-bold text-ink block truncate mt-0.5">
                        {emergency.location?.address || emergency.location?.barangay || '—'}
                      </span>
                      <span className="text-[11px] text-muted truncate block">
                        {emergency.location?.address
                          ? `${emergency.location.barangay}${emergency.location.barangay && emergency.location.city ? ', ' : ''}${emergency.location.city}`
                          : emergency.location?.city}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-muted block mt-0.5">Location unavailable</span>
                  )}
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-line">
                  <span className="text-[10px] text-muted block font-bold uppercase">GPS Telemetry</span>
                  <span className="font-bold text-success flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    LIVE
                  </span>
                  {hasLocation(emergency) ? (
                    <>
                      <span className="font-mono text-[10px] text-muted block mt-0.5">
                        {emergency.location.lat.toFixed(6)}°, {emergency.location.lng.toFixed(6)}°
                      </span>
                      <span className="text-[10px] text-muted block">
                        Accuracy ±{emergency.location.accuracyRadiusMeters}m
                        {emergency.location.source === 'gps' ? ' (GPS)' : emergency.location.source === 'override' ? ' (fixed)' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted block mt-0.5">Location unavailable</span>
                  )}
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-line">
                  <span className="text-[10px] text-muted block font-bold uppercase">Audio Feed</span>
                  <span className="font-bold text-brand-600 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    RECORDING ACTIVE
                  </span>
                  <span className="text-[10px] text-muted">RA 9262 hash stamped</span>
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-line">
                  <span className="text-[10px] text-muted block font-bold uppercase">Assigned Unit</span>
                  <span className="font-bold text-ink block truncate mt-0.5">
                    {emergency.assignedResponder?.name || 'Unassigned'}
                  </span>
                  <span className="text-[11px] text-muted">
                    ETA: {emergency.assignedResponder?.eta || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Status + actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-5 pt-0 text-xs font-bold">
                <span className={`px-3 py-1 rounded-full border inline-flex items-center gap-1.5 ${statusTone(emergency.status).pill}`}>
                  <span className={`w-2 h-2 rounded-full ${statusTone(emergency.status).dot} animate-pulse`} />
                  STATUS: {emergency.status}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onResolveActiveEmergency}
                    className="rc-focus-ring py-2 px-3.5 rounded-ctl bg-success hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Mark Resolved</span>
                  </button>

                  <div className="relative" ref={statusMenuId === emergency.id ? statusMenuRef : undefined}>
                    <button
                      onClick={() => setStatusMenuId((v) => (v === emergency.id ? null : emergency.id))}
                      aria-expanded={statusMenuId === emergency.id}
                      className="rc-focus-ring py-2 px-3.5 rounded-ctl bg-warn hover:bg-amber-700 text-white flex items-center gap-1.5 transition-colors active:scale-95"
                    >
                      <span>Update Status</span>
                    </button>

                    {statusMenuId === emergency.id && (
                      <div className="absolute right-0 top-full mt-2 z-30 w-48 rounded-card bg-white border border-line shadow-lift p-1.5 animate-fadeIn">
                        {statusOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              onUpdateStatus(emergency.id, opt);
                              setStatusMenuId(null);
                            }}
                            className="w-full px-3 py-2 rounded-ctl text-left text-xs text-slate-700 font-bold transition-colors flex items-center gap-2 hover:bg-slate-100 hover:text-ink"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0" />
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ))}

          {/* LIVE AUDIO — citizen ambient feed */}
          <section
            id="responder-live-audio-card"
            aria-label="Live audio monitoring"
            className="rc-panel overflow-hidden bg-navy-900 border-navy-800 text-white"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-panel bg-brand-600 text-white flex items-center justify-center shrink-0">
                  <Volume2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-white bg-emergency px-2 py-0.5 rounded-md">
                      {currentEmergency?.incidentCode}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wide text-white flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emergency" />
                      </span>
                      Live Audio Feed
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight mt-1">Alert system audio walkie</h3>
                  <p className="text-[11px] text-slate-400">
                    Ambient audio streamed live from the citizen's device — plays through this console.
                  </p>
                </div>
              </div>

              {liveClip ? (
                <button
                  onClick={toggleLiveMonitoring}
                  className={`rc-focus-ring py-2.5 px-4 rounded-ctl font-bold text-xs flex items-center gap-1.5 transition-colors active:scale-95 ${
                    liveListening
                      ? 'bg-emergency hover:bg-red-700 text-white'
                      : 'bg-brand-600 hover:bg-brand-500 text-white'
                  }`}
                >
                  {liveListening ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {liveListening ? 'Stop Monitoring' : 'Monitor Live Audio'}
                </button>
              ) : (
                <span className="py-2.5 px-4 rounded-ctl bg-white/10 text-slate-300 border border-white/10 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                  Waiting for live feed…
                </span>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="rc-panel p-8 text-center">
          <div className="w-12 h-12 rounded-panel bg-emerald-50 text-success flex items-center justify-center mx-auto border border-emerald-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-black text-ink text-base mt-3">All Sectors Normal</h3>
          <p className="text-xs text-muted max-w-md mx-auto mt-1">
            No active emergencies. Registered wearable devices are in silent standby — an emergency card
            appears here the moment a hidden squeeze trigger is activated.
          </p>
        </section>
      )}

      {/* 3. OPERATIONS FEED + SYSTEM HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live incident feed */}
        <section className="lg:col-span-2 rc-panel overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h3 className="font-black text-ink text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-600" />
              Recent Incident Activity
            </h3>
            <button
              onClick={() => onNavigateTab('incidents')}
              className="rc-focus-ring text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentIncidents.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No incidents recorded yet. Incoming SOS alerts will stream here.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recentIncidents.map((inc) => {
                const tone = statusTone(inc.status);
                return (
                  <li key={inc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-ink">{inc.incidentCode}</span>
                        {inc.source && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {inc.source === 'HARDWARE' ? 'WEARABLE' : 'APP'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted truncate">
                        {inc.userName?.trim() || 'Unknown'} · {inc.location?.address || inc.location?.barangay || 'Location unavailable'}
                      </p>
                    </div>
                    <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted font-mono shrink-0">
                      <Clock className="w-3 h-3" />
                      {inc.timeActivated}
                    </span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${tone.pill}`}>
                      {inc.status}
                    </span>
                    <button
                      onClick={() => onViewIncident?.(inc)}
                      aria-label={`Open ${inc.incidentCode}`}
                      className="rc-focus-ring p-1.5 rounded-ctl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors shrink-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Right rail: dispatch snapshot + system health */}
        <div className="space-y-4">
          <section className="rc-panel overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <h3 className="font-black text-ink text-sm flex items-center gap-2">
                <MapPinned className="w-4 h-4 text-brand-600" />
                Dispatch Snapshot
              </h3>
              <button
                onClick={() => onNavigateTab('map')}
                className="rc-focus-ring text-[11px] font-bold text-brand-600 hover:text-brand-700"
              >
                Open map
              </button>
            </div>
            <div className="relative h-40 bg-slate-100">
              <LiveGoogleMap
                lat={snapLat}
                lng={snapLng}
                zoom={14}
                showMarker={!!snapIncident}
                markerTitle={snapIncident ? `Incident ${snapIncident.incidentCode}` : 'Alert location'}
                className="absolute inset-0"
              />
              <span className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-navy-900/85 text-white text-[10px] font-bold">
                {snapIncident ? `Tracking ${snapIncident.incidentCode}` : 'No active location — city overview'}
              </span>
            </div>
          </section>

          <section className="rc-panel p-4">
            <h3 className="font-black text-ink text-sm flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-brand-600" />
              System Health
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-2">
                  {bridgeOnline ? <Wifi className="w-3.5 h-3.5 text-info" /> : <WifiOff className="w-3.5 h-3.5 text-emergency" />}
                  Bridge link
                </span>
                <span className={`font-bold ${bridgeOnline ? 'text-info' : 'text-emergency'}`}>
                  {bridgeOnline ? 'Connected' : 'Offline'}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-2">
                  <Battery className="w-3.5 h-3.5 text-success" />
                  Wearable battery
                </span>
                <span className="font-bold text-ink">{telemetry.battery}%</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-brand-600" />
                  GPS / GSM
                </span>
                <span className="font-bold text-ink">{telemetry.gpsFix} · {telemetry.gsmSignal}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-brand-600" />
                  Responders online
                </span>
                <span className="font-bold text-ink">{availableUnits} / {responders.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-info" />
                  Citizen accounts
                </span>
                <span className="font-bold text-ink">{onlineAccounts.count} online</span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* ASSIGN RESPONDER MODAL */}
      {(() => {
        const assignTarget = activeEmergencies.find((e) => e.id === assignIncidentId);
        if (!assignTarget) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setAssignIncidentId(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white border border-line rounded-panel max-w-md w-full p-5 space-y-4 shadow-lift"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <span className="text-[10px] font-mono font-black text-brand-600 uppercase tracking-wider">Dispatch</span>
                <h4 className="font-black text-ink text-base">
                  Assign responder to {assignTarget.incidentCode}
                </h4>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableResponders.length === 0 && (
                  <p className="text-xs text-muted p-3 rounded-card bg-slate-50 border border-line">
                    No available units right now.
                  </p>
                )}
                {availableResponders.map((resp) => (
                  <button
                    key={resp.id}
                    onClick={() => {
                      onAssignResponder(assignTarget.id, resp);
                      setAssignIncidentId(null);
                    }}
                    className="rc-focus-ring w-full text-left p-3 rounded-card bg-slate-50 border border-line hover:border-brand-400 hover:bg-brand-50/50 cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-extrabold text-ink block truncate">{resp.name}</span>
                      <span className="text-[11px] text-brand-600 truncate block">{resp.unit} • {resp.type}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-success text-[10px] font-bold shrink-0">
                      {resp.status}
                    </span>
                  </button>
                ))}
              </div>
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => setAssignIncidentId(null)}
                  className="rc-focus-ring px-4 py-2 rounded-ctl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
