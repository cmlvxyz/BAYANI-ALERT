import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  PhoneCall, 
  Radio, 
  Users, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  Eye, 
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Volume2,
  Pause
} from 'lucide-react';
import { Incident, IncidentStatus, ResponderAgent, ResponderNavTab } from '../../types';

interface ResponderDashboardViewProps {
  activeIncident: Incident | null;
  incidents: Incident[];
  responders: ResponderAgent[];
  onlineAccounts?: { count: number; accounts: string[] };
  liveAudio?: { incidentCode: string; audioUrl: string } | null;
  onNavigateTab: (tab: ResponderNavTab) => void;
  onViewIncident?: (incident: Incident) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => void;
  onAssignResponder: (incidentId: string, responder: ResponderAgent) => void;
  onResolveActiveEmergency: () => void;
}

export const ResponderDashboardView: React.FC<ResponderDashboardViewProps> = ({
  activeIncident,
  incidents,
  responders,
  onlineAccounts = { count: 0, accounts: [] },
  liveAudio = null,
  onNavigateTab,
  onViewIncident,
  onUpdateStatus,
  onAssignResponder,
  onResolveActiveEmergency,
}) => {
  // The command board is armed ONLY by a live SOS that arrived over the Bridge
  // in this session. Incidents pulled from the backend are history: the design
  // is that the ACTIVE EMERGENCY card appears only for a citizen broadcast,
  // never re-promoted from storage, so an open row left over from an earlier
  // run cannot raise a phantom alarm the moment the console opens.
  const liveEmergency =
    activeIncident && activeIncident.status !== 'RESOLVED' && activeIncident.status !== 'CANCELLED'
      ? activeIncident
      : null;
  const activeEmergencies = liveEmergency ? [liveEmergency] : [];
  const currentEmergency = liveEmergency;

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [liveListening, setLiveListening] = useState(false);
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
    if (!showStatusMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowStatusMenu(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showStatusMenu]);

  // Live metrics mirror the live emergency so the board can never read
  // "0 active" beside a non-zero responding count sourced from stale history.
  const respondingCount =
    liveEmergency && (liveEmergency.status === 'WAIT FOR ME' || liveEmergency.status === 'ON THE WAY') ? 1 : 0;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED').length;

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

  const statusOptions: IncidentStatus[] = [
    'WAIT FOR ME',
    'ON THE WAY',
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP METRICS CARDS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-red-200 p-4 rounded-3xl relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-red-600 mb-1">
            <span>ACTIVE EMERGENCIES</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div className="text-3xl font-black text-slate-900">{activeEmergencies.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Discreet squeeze signals</p>
        </div>

        <div className="bg-white border border-blue-200 p-4 rounded-3xl shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-blue-600 mb-1">
            <span>RESPONDING</span>
            <Navigation className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{respondingCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Patrols en route</p>
        </div>

        <div className="bg-white border border-emerald-200 p-4 rounded-3xl shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 mb-1">
            <span>RESOLVED TODAY</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{resolvedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Safe haven secured</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>ONLINE USERS</span>
            <Radio className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 flex items-center gap-2">
            {onlineAccounts.count}
            {onlineAccounts.count > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {onlineAccounts.count > 0
              ? `Logged in: ${onlineAccounts.accounts.join(', ')}`
              : 'No Bayani App account online'}
          </p>
        </div>
      </section>

      {/* 2. 🚨 ACTIVE EMERGENCY CARD (WHEN TRIGGERED) */}
      {currentEmergency && currentEmergency.status !== 'RESOLVED' && currentEmergency.status !== 'CANCELLED' ? (
        <>
        <section 
          id="responder-active-emergency-card"
          className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 border-2 border-red-500 rounded-3xl p-5 sm:p-6 shadow-2xl relative"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-red-400/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center shadow-lg shrink-0 animate-pulse">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-white bg-red-950/40 px-2 py-0.5 rounded-md border border-white/30">
                    {currentEmergency.incidentCode}
                  </span>
                  <span className="text-xs font-black uppercase text-white">
                    🚨 ACTIVE EMERGENCY
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
                  {currentEmergency.userName}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <button
                onClick={() => (onViewIncident ? onViewIncident(currentEmergency) : onNavigateTab('map'))}
                disabled={!hasLocation(currentEmergency)}
                className={`py-2.5 px-4 rounded-xl text-white flex items-center gap-1.5 transition-all active:scale-95 ${
                  hasLocation(currentEmergency)
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                    : 'bg-white/15 text-white/50 border border-white/20 cursor-not-allowed'
                }`}
                title="Open Google Street View at the received coordinates"
              >
                <Navigation className="w-4 h-4" />
                <span>LIVE VIEW STREET</span>
              </button>

              <button
                onClick={() => setShowAssignModal(true)}
                className="py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Radio className="w-4 h-4 text-blue-300" />
                <span>ASSIGN RESPONDER</span>
              </button>

              <button
                onClick={() => alert(`Dialing Citizen ${currentEmergency.userName}: ${currentEmergency.userPhone}`)}
                className="py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <PhoneCall className="w-4 h-4 text-emerald-300" />
                <span>CONTACT USER</span>
              </button>
            </div>
          </div>

          {/* Telemetry Data Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 text-xs">
            <div className="p-3 rounded-2xl bg-red-950/30 border border-red-400/30">
              <span className="text-[10px] text-red-100/90 block font-bold uppercase">Location</span>
              {hasLocation(currentEmergency) ? (
                <>
                  <span className="font-bold text-white block truncate">
                    {currentEmergency.location?.address || currentEmergency.location?.barangay || '—'}
                  </span>
                  <span className="text-[11px] text-red-100/80 truncate block">
                    {currentEmergency.location?.address
                      ? `${currentEmergency.location.barangay}${currentEmergency.location.barangay && currentEmergency.location.city ? ', ' : ''}${currentEmergency.location.city}`
                      : currentEmergency.location?.city}
                  </span>
                </>
              ) : (
                <span className="font-bold text-white block">Location unavailable</span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-red-950/30 border border-red-400/30">
              <span className="text-[10px] text-red-100/90 block font-bold uppercase">GPS Telemetry</span>
              <span className="font-bold text-emerald-300 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                LIVE
              </span>
              {hasLocation(currentEmergency) ? (
                <>
                  <span className="font-mono text-[10px] text-red-100/80 block">
                    {currentEmergency.location.lat.toFixed(6)}°, {currentEmergency.location.lng.toFixed(6)}°
                  </span>
                  <span className="text-[10px] text-red-100/80 block">
                    Accuracy: ±{currentEmergency.location.accuracyRadiusMeters}m
                    {currentEmergency.location.source === 'gps' ? ' (GPS)' : currentEmergency.location.source === 'override' ? ' (fixed)' : ''}
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-red-100/80 block">Location unavailable</span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-red-950/30 border border-red-400/30">
              <span className="text-[10px] text-red-100/90 block font-bold uppercase">Audio Feed</span>
              <span className="font-bold text-purple-300 block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
                RECORDING ACTIVE
              </span>
              <span className="text-[10px] text-red-100/80">RA 9262 Hash Stamped</span>
            </div>

            <div className="p-3 rounded-2xl bg-red-950/30 border border-red-400/30">
              <span className="text-[10px] text-red-100/90 block font-bold uppercase">Assigned Unit</span>
              <span className="font-bold text-blue-300 block truncate">
                {currentEmergency.assignedResponder?.name || 'Unassigned'}
              </span>
              <span className="text-[11px] text-red-100/80">
                ETA: {currentEmergency.assignedResponder?.eta || 'Pending'}
              </span>
            </div>
          </div>

          {/* Status + Update Status */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2 text-xs font-bold">
            <div className="relative" ref={statusMenuRef}>
              <span className="px-3 py-1 rounded-full bg-red-950/40 border border-red-300 text-white text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-200 animate-ping" />
                STATUS: {currentEmergency.status}
              </span>

              {/* Inline status options (no modal) */}
              {showStatusMenu && (
                <div className="absolute left-0 top-full mt-2 z-30 w-44 rounded-2xl bg-white border border-slate-200 shadow-2xl p-1.5 animate-fadeIn">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        onUpdateStatus(currentEmergency.id, opt);
                        setShowStatusMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs text-slate-700 font-bold transition-all flex items-center gap-2 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowStatusMenu((v) => !v)}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <span>UPDATE STATUS</span>
            </button>
          </div>
        </section>

        {/* LIVE AUDIO — hear the citizen's audio feed through the alert system */}
        <section
          id="responder-live-audio-card"
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-purple-950 border-2 border-purple-500 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shrink-0 animate-pulse">
                <Volume2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-white bg-red-500 px-2 py-0.5 rounded-md border border-red-300">
                    {currentEmergency.incidentCode}
                  </span>
                  <span className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    LIVE AUDIO FEED
                  </span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight mt-0.5">Alert system audio walkie</h3>
                <p className="text-[11px] text-purple-200/80">
                  Ambient audio streamed live from the citizen's device — plays automatically through this console.
                </p>
              </div>
            </div>

            {liveClip ? (
              <button
                onClick={toggleLiveMonitoring}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${
                  liveListening
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {liveListening ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {liveListening ? 'STOP MONITORING' : 'MONITOR LIVE AUDIO'}
              </button>
            ) : (
              <span className="py-2.5 px-4 rounded-xl bg-white/10 text-white/60 border border-white/15 text-xs font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
                WAITING FOR LIVE FEED…
              </span>
            )}
          </div>
        </section>
        </>
      ) : (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-2 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">No Active Emergencies</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All registered wearable thigh bands are operating normally in silent standby. When a user activates their hidden squeeze trigger, an emergency card will pop up immediately.
          </p>
        </section>
      )}

      {/* ASSIGN RESPONDER MODAL */}
      {showAssignModal && currentEmergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="font-extrabold text-slate-900 text-base">
              Dispatch Responder to {currentEmergency.incidentCode}
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableResponders.map((resp) => (
                <div
                  key={resp.id}
                  onClick={() => {
                    onAssignResponder(currentEmergency.id, resp);
                    setShowAssignModal(false);
                  }}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-900 block">{resp.name}</span>
                    <span className="text-[11px] text-blue-600">{resp.unit} • {resp.type}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                    {resp.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};