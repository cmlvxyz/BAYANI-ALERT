/**
 * Bayani Alert - Response Center (Authority / Dispatcher Command Center)
 * “Safety in Every Step”
 *
 * Response Center web console for authorities: dashboard, live incidents,
 * dispatch map, responders, directory, reports and settings.
 *
 * This project is SEPARATE from the Bayani App (citizen side, port 4001).
 * Incidents arrive from the citizen app / wearable through the shared
 * local incident service.
 */

import React, { useState, useEffect } from 'react';
import bayaniLogo from './assets/images/logo (2).png';
import {
  ShieldAlert,
  LayoutDashboard,
  FileText,
  MapPin,
  Radio,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Battery,
  LogOut,
} from 'lucide-react';

// Services
import { hardwareService, WearableDeviceTelemetry } from './services/hardwareService';
import { incidentService } from './services/incidentService';
import { connectBridge, emitStatusUpdate, emitResolve, fetchIncidents, deleteIncident as deleteStoredIncident, fetchOnlineAccounts } from './services/bridgeClient';
import { login as apiLogin, logout as apiLogout, getSession, setSession, validateSession, AuthSession } from './services/authClient';
import { Incident, ResponderAgent, IncidentStatus, ResponderNavTab } from './types';

// Response Center Components
import RcLoginScreen from './components/auth/RcLoginScreen';
import { ResponderDashboardView } from './components/responder/ResponderDashboardView';
import { ResponderMapView } from './components/responder/ResponderMapView';
import { ResponderIncidentsView } from './components/responder/ResponderIncidentsView';
import { ResponderPersonnelView } from './components/responder/ResponderPersonnelView';
import { ResponderContactsView } from './components/responder/ResponderContactsView';
import { ResponderReportsView } from './components/responder/ResponderReportsView';
import { ResponderSettingsView } from './components/responder/ResponderSettingsView';

interface NavItem {
  key: ResponderNavTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'incidents', label: 'Live Incidents', icon: FileText },
  { key: 'map', label: 'Dispatch Map', icon: MapPin },
  { key: 'responders', label: 'Responders', icon: Radio },
  { key: 'contacts', label: 'Directory', icon: Users },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

const SETTINGS_ITEM: NavItem = { key: 'settings', label: 'Settings', icon: Settings };

export default function App() {
  const [navTab, setNavTab] = useState<ResponderNavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [session, setSessionState] = useState<AuthSession | null>(getSession());

  const handleLogin = async (username: string, password: string) => {
    const s = await apiLogin(username, password);
    setSession(s);
    setSessionState(s);
  };

  const handleLogout = () => {
    apiLogout();
    setSessionState(null);
    setNavTab('dashboard');
  };

  // Browser tab title — shows the current section at the top when navigating
  useEffect(() => {
    const all = [...NAV_ITEMS, SETTINGS_ITEM];
    const active = all.find((i) => i.key === navTab);
    document.title = active ? `${active.label} | Bayani Alert` : 'Bayani Alert';
  }, [navTab]);

  // Telemetry & Incident State
  const [telemetry, setTelemetry] = useState<WearableDeviceTelemetry>(hardwareService.getTelemetry());
  const [activeIncident, setActiveIncident] = useState<Incident | null>(incidentService.getActiveIncident());
  const [incidents, setIncidents] = useState<Incident[]>(incidentService.getIncidents());
  const [responders, setResponders] = useState(incidentService.getResponders());
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const [onlineAccounts, setOnlineAccounts] = useState<{ count: number; accounts: string[] }>({ count: 0, accounts: [] });
  const [liveAudio, setLiveAudio] = useState<{ incidentCode: string; audioUrl: string } | null>(null);

  // Subscribe to hardware & incident state changes
  useEffect(() => {
    const unsubHw = hardwareService.subscribe((tel) => {
      setTelemetry(tel);
    });

    const unsubInc = incidentService.subscribe(() => {
      setActiveIncident(incidentService.getActiveIncident());
      setIncidents(incidentService.getIncidents());
      setResponders(incidentService.getResponders());
    });

    return () => {
      unsubHw();
      unsubInc();
    };
  }, []);

  // Bridge stream — re-created whenever the operator signs in/out so the SSE
  // connection always carries a fresh session token (which the server uses to
  // decide which frames this client may receive).
  useEffect(() => {
    const unsubBridge = connectBridge({
      onSOS: (inc) => incidentService.ingestIncomingSOS(inc),
      onHardwareSOS: (inc) => incidentService.ingestIncomingHardwareSOS(inc),
      onResolve: (code) => {
        const active = incidentService.getActiveIncident();
        if (active && (active.id === code || active.incidentCode === code)) {
          incidentService.clearActiveEmergency();
        } else {
          const found = incidentService.getIncidents().find(i => i.id === code || i.incidentCode === code);
          if (found) incidentService.updateIncidentStatus(found.id, 'RESOLVED');
        }
      },
      onOnlineChange: setBridgeOnline,
      onSmsUpdate: ({ id, smsNotifications }) =>
        incidentService.applySmsUpdate(id, smsNotifications),
      onDelete: (id) => incidentService.deleteIncident(id),
      onAccountsUpdate: () => void refreshOnlineAccounts(),
      onAudioLive: ({ incidentCode, audioUrl }) => setLiveAudio({ incidentCode, audioUrl }),
    });

    return () => {
      unsubBridge();
    };
  }, [session?.token]);

  // When a new SOS arrives, auto-focus the map on the newest active incident.
  useEffect(() => {
    if (activeIncident) setFocusedIncident(null);
  }, [activeIncident?.id]);

  // Pull incidents persisted in the database so a restart of Bayani Alert (or of
  // the backend) never wipes the dashboard. GET /incidents is RC-roles-only, so
  // this MUST re-run once the operator signs in — keying it on the session token
  // (instead of running once on mount, where it could only ever 401) is what
  // makes a stored SOS show up as an ACTIVE EMERGENCY after login.
  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    fetchIncidents()
      .then((items) => {
        if (!cancelled) incidentService.loadIncidents(items);
      })
      .catch((err) => console.warn('[bayani-alert] Failed to load stored incidents:', err));
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  // Also re-run whenever the bridge reconnects so the UI catches up on missed
  // events (a live SOS frame is fire-and-forget over SSE, so a reconnect is the
  // only chance to pull whatever was missed while the socket was down).
  useEffect(() => {
    if (!bridgeOnline || !session?.token) return;
    fetchIncidents()
      .then((items) => incidentService.loadIncidents(items))
      .catch((err) => console.warn('[bayani-alert] Reconnect reload failed:', err));
  }, [bridgeOnline, session?.token]);

  // Validate the stored token against the backend. Backend sessions are
  // in-memory, so restarting the server invalidates every RC token; without
  // this the console would keep streaming as "anonymous" (no SOS frames, no
  // account counts) while looking fully signed in.
  const forceLogout = () => {
    setSession(null);
    setSessionState(null);
  };

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    validateSession(session).then((ok) => {
      if (!ok && !cancelled) forceLogout();
    });
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  // Refresh the online-accounts metric (called by the 5s poll and instantly
  // when the server broadcasts accounts_update).
  const refreshOnlineAccounts = async () => {
    try {
      const info = await fetchOnlineAccounts();
      setOnlineAccounts(info);
    } catch (err) {
      // 401 = the sign-in died with the backend; bounce to the login screen.
      if (err instanceof Error && err.message === 'UNAUTHORIZED') forceLogout();
    }
  };

  // Poll the logged-in Bayani App accounts for the dashboard metric.
  useEffect(() => {
    void refreshOnlineAccounts();
    const id = window.setInterval(() => void refreshOnlineAccounts(), 5000);
    return () => window.clearInterval(id);
  }, []);

  const handleResetToSafe = () => {
    const code = incidentService.getActiveIncident()?.incidentCode;
    incidentService.clearActiveEmergency();
    if (code) {
      const resolved = incidentService.getIncidents().find(i => i.incidentCode === code);
      if (resolved) emitStatusUpdate(resolved);
      emitResolve(code);
    }
  };

  const handleUpdateStatus = (id: string, status: IncidentStatus) => {
    incidentService.updateIncidentStatus(id, status);
    const inc = incidentService.getIncidents().find(i => i.id === id);
    if (inc) emitStatusUpdate(inc);
  };

  const handleAssignResponder = (id: string, resp: ResponderAgent) => {
    incidentService.assignResponder(id, resp);
    const inc = incidentService.getIncidents().find(i => i.id === id);
    if (inc) emitStatusUpdate(inc);
  };

  const handleDeleteIncident = (id: string) => {
    incidentService.deleteIncident(id);
    void deleteStoredIncident(id).catch((err) =>
      console.warn('[bayani-alert] Failed to delete incident from server:', err),
    );
  };

  const isEmergencyActive = telemetry.event === 'SOS' || (activeIncident !== null && activeIncident.status !== 'RESOLVED' && activeIncident.status !== 'CANCELLED');

  const goResponse = (tab: ResponderNavTab) => {
    setNavTab(tab);
    setIsMobileMenuOpen(false);
  };

  // "VIEW LOCATION" / "VIEW LIVE MAP" → open the Dispatch Map focused on this incident.
  const handleViewIncident = (incident: Incident) => {
    setFocusedIncident(incident);
    goResponse('map');
  };

  const renderResponseScreen = () => {
    switch (navTab) {
      case 'dashboard':
        return (
          <ResponderDashboardView
            activeIncident={activeIncident}
            incidents={incidents}
            responders={responders}
            onlineAccounts={onlineAccounts}
            liveAudio={liveAudio}
            onNavigateTab={goResponse}
            onViewIncident={handleViewIncident}
            onUpdateStatus={handleUpdateStatus}
            onAssignResponder={handleAssignResponder}
            onResolveActiveEmergency={handleResetToSafe}
          />
        );
      case 'incidents':
        return (
          <ResponderIncidentsView
            incidents={incidents}
            responders={responders}
            onViewIncident={handleViewIncident}
            onUpdateStatus={handleUpdateStatus}
            onAssignResponder={handleAssignResponder}
            onDeleteIncident={handleDeleteIncident}
          />
        );
      case 'map':
        return (
          <ResponderMapView
            activeIncident={activeIncident}
            incidents={incidents}
            responders={responders}
            focusedIncident={focusedIncident}
          />
        );
      case 'responders':
        return <ResponderPersonnelView responders={responders} />;
      case 'contacts':
        return <ResponderContactsView />;
      case 'reports':
        return <ResponderReportsView incidents={incidents} />;
      case 'settings':
        return <ResponderSettingsView />;
    }
  };

  const isActive = (key: ResponderNavTab) => navTab === key;

  // Authentication gate — the Response Center requires an admin sign-in.
  if (!session) {
    return <RcLoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-blue-200 text-slate-800 antialiased font-sans p-4 sm:p-6">
      {/* ===== RESPONSE CENTER HEADER ===== */}
      <header
        id="bayani-rc-header"
        className="sticky top-4 z-40 rounded-4xl border border-slate-200 bg-white/70 backdrop-blur-md shadow-sm px-4 sm:px-6 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src={bayaniLogo}
              alt="Bayani Alert logo"
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-black text-slate-900 text-lg sm:text-xl tracking-wider uppercase leading-tight">
                Bayani-Alert
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-tight">
                Response Center • Safety in Every Step
              </p>
            </div>
          </div>

          {/* Global status & access */}
          <div className="flex items-center gap-2">
            {/* System/emergency status */}
            {isEmergencyActive ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 border border-red-500 text-white text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                SOS ACTIVE
              </span>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                SYSTEM NORMAL
              </span>
            )}

            {/* Wearable battery (global, always visible) */}
            <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-bold">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              {telemetry.battery}%
            </span>

            {/* Response center authority badge */}
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              AUTHORITY
            </span>

            {/* Bridge connection status */}
            <span
              title={bridgeOnline ? 'Connected to Bayani App (port 4001)' : 'Bridge offline — start bridge-server.mjs'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold ${
                bridgeOnline
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${bridgeOnline ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`} />
              {bridgeOnline ? 'BRIDGE LINK' : 'BRIDGE OFF'}
            </span>

            {/* Signed-in operator */}
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
              {session.user.username.toUpperCase()}
            </span>

            {/* Log out */}
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile menu button */}
            <button
              id="bayani-rc-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== DESKTOP LAYOUT: SIDEBAR + MAIN ===== */}
      <div className="flex items-start gap-4 w-full mt-4">
        {/* Left Sidebar (desktop only) */}
        <aside
          id="bayani-rc-sidebar"
          className="hidden lg:flex w-60 shrink-0 flex-col px-4 pt-4 pb-6 sticky top-[104px] h-[calc(100vh-160px)] self-start overflow-y-auto bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 shadow-sm"
        >
          <nav className="flex flex-col flex-1 gap-8 select-none">
            {/* Top group */}
            <div className="shrink-0">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-500 px-3 block mb-2 font-bold">
                Response Center
              </span>
              <div className="flex flex-col gap-1.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.key);
                  return (
                    <button
                      key={item.key}
                      onClick={() => setNavTab(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] ${
                        active
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings pinned at the bottom */}
            <div className="flex-1 flex flex-col min-h-0 justify-between">
              <div />
              <div className="shrink-0">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500 px-3 block mb-2 font-bold">
                  System
                </span>
                <div className="flex flex-col gap-1.5">
                  <button
                    key={SETTINGS_ITEM.key}
                    onClick={() => setNavTab(SETTINGS_ITEM.key)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] ${
                      isActive(SETTINGS_ITEM.key)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Settings className="w-6 h-6" />
                    <span>{SETTINGS_ITEM.label}</span>
                  </button>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-0" id="bayani-rc-main-content">
          <div className="bg-white/70 backdrop-blur-md h-[calc(100vh-160px)] overflow-y-auto p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
            {renderResponseScreen()}
          </div>
        </main>
      </div>

      {/* ===== MOBILE FULL MENU SHEET ===== */}
      {isMobileMenuOpen && (
        <div
          id="bayani-rc-mobile-menu"
          className="lg:hidden fixed inset-0 z-50 bg-white/95 backdrop-blur-md p-4 flex flex-col animate-fadeIn"
        >
          <div className="flex justify-between items-center pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <img
                src={bayaniLogo}
                alt="Bayani Alert logo"
                className="w-9 h-9 object-contain shrink-0"
              />
              <span className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Bayani-Alert Response Center
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-1.5">
            {[...NAV_ITEMS, SETTINGS_ITEM].map((item) => {
              const Icon = item.icon;
              const active = isActive(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setNavTab(item.key);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-bold ${
                    active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Emergency indicator fallback for color-blind accessibility */}
      {isEmergencyActive && (
        <div
          aria-live="assertive"
          className="sr-only"
        >
          Emergency alert active. A response is being coordinated.
        </div>
      )}
    </div>
  );
}