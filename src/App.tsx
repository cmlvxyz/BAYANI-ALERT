/**
 * Bayani Alert - Response Center (Authority / Dispatcher Command Center)
 * “Safety in Every Step”
 *
 * Response Center web console for authorities: command center overview, live
 * incidents, dispatch map, responders, directory, reports and settings.
 *
 * This project is SEPARATE from the Bayani App (citizen side, port 4001).
 * Incidents arrive from the citizen app / wearable through the shared
 * local incident service and the real-time SSE bridge.
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Activity,
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
  description: string;
}

/** Navigation organized into logical console groups. */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { key: 'dashboard', label: 'Command Center', icon: LayoutDashboard, description: 'Live operational overview' },
      { key: 'incidents', label: 'Live Incidents', icon: FileText, description: 'Incoming SOS intake & case archive' },
      { key: 'map', label: 'Dispatch Map', icon: MapPin, description: 'GNSS tracking & Street View' },
    ],
  },
  {
    title: 'Field & Data',
    items: [
      { key: 'responders', label: 'Responders', icon: Radio, description: 'On-duty field units' },
      { key: 'contacts', label: 'Citizen Directory', icon: Users, description: 'Inter-agency liaison directory' },
      { key: 'reports', label: 'Reports & Analytics', icon: BarChart3, description: 'Case metrics, trends & audit' },
    ],
  },
  {
    title: 'System',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings, description: 'Agency configuration & evidence ops' },
    ],
  },
];

const FLAT_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export default function App() {
  const [navTab, setNavTab] = useState<ResponderNavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [session, setSessionState] = useState<AuthSession | null>(getSession());
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const handleLogin = async (username: string, password: string) => {
    const s = await apiLogin(username, password);
    setSession(s);
    setSessionState(s);
  };

  const handleLogout = () => {
    apiLogout();
    setSessionState(null);
    setNavTab('dashboard');
    setIsUserMenuOpen(false);
  };

  // Browser tab title — shows the current section at the top when navigating
  useEffect(() => {
    const active = FLAT_NAV.find((i) => i.key === navTab);
    document.title = active ? `${active.label} | Bayani Alert` : 'Bayani Alert';
  }, [navTab]);

  // Close the operator menu on outside click / Escape.
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isUserMenuOpen]);

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
      onLocationUpdate: ({ id, location, gpsStatus }) =>
        incidentService.applyLocationUpdate(id, location, gpsStatus),
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

  // Every unresolved SOS counts — several citizens can press at once.
  const activeEmergencies = incidents.filter(
    (inc) => inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED',
  );
  const activeCount = activeEmergencies.length;
  const isEmergencyActive = telemetry.event === 'SOS' || activeCount > 0;

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
            bridgeOnline={bridgeOnline}
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
  const currentNav = FLAT_NAV.find((i) => i.key === navTab);
  const operatorName = session?.user.username?.toUpperCase() || 'OPERATOR';

  // Authentication gate — the Response Center requires an admin sign-in.
  if (!session) {
    return <RcLoginScreen onLogin={handleLogin} />;
  }

  /** Shared navigation list markup for the desktop rail. */
  const navList = (variant: 'desktop' | 'mobile') => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Console navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => goResponse(item.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`rc-focus-ring group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-ctl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-navy-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-navy-800/60'
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full transition-all ${
                      active ? 'bg-brand-500' : 'bg-transparent'
                    }`}
                  />
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.key === 'incidents' && activeCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-emergency text-white text-[10px] font-black tabular-nums">
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        id="bayani-rc-sidebar"
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-navy-900 border-r border-navy-800"
      >
        <div className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-navy-800">
          <img src={bayaniLogo} alt="Bayani Alert logo" className="w-9 h-9 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="font-black text-white text-sm tracking-wider uppercase leading-none">
              Bayani-Alert
            </h1>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">RESPONSE CENTER</p>
          </div>
        </div>

        {navList('desktop')}

        <div className="shrink-0 border-t border-navy-800 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-ctl bg-navy-850">
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-black text-xs shrink-0">
              {operatorName.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{operatorName}</p>
              <p className="text-[10px] text-slate-500 truncate">{session.user.email || 'Authority'}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="rc-focus-ring p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-navy-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== CONTENT COLUMN ===== */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* ===== TOP BAR ===== */}
        <header
          id="bayani-rc-header"
          className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-line"
        >
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            {/* Mobile menu */}
            <button
              id="bayani-rc-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden rc-focus-ring p-2 rounded-ctl text-slate-500 hover:text-ink hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Page title */}
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-ink tracking-tight truncate">
                {currentNav?.label ?? 'Command Center'}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted truncate">
                {currentNav?.description ?? 'Live operational overview'}
              </p>
            </div>

            {/* Status cluster */}
            <div className="flex items-center gap-2">
              {/* Emergency / normal */}
              {isEmergencyActive ? (
                <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emergency text-white text-xs font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse" />
                  <span className="hidden sm:inline">{activeCount || 1}</span> SOS ACTIVE
                </span>
              ) : (
                <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-success text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  SYSTEM NORMAL
                </span>
              )}

              {/* Bridge connection */}
              <span
                title={bridgeOnline ? 'Connected to Bayani App (port 4001)' : 'Bridge offline — start bridge-server.mjs'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold ${
                  bridgeOnline
                    ? 'bg-cyan-50 border-cyan-200 text-info'
                    : 'bg-red-50 border-red-200 text-emergency'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${bridgeOnline ? 'bg-info' : 'bg-emergency'} animate-pulse`} />
                <span className="hidden md:inline">{bridgeOnline ? 'BRIDGE LINK' : 'BRIDGE OFF'}</span>
              </span>

              {/* Wearable battery */}
              <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 border border-line text-[11px] text-slate-600 font-bold">
                <Battery className="w-3.5 h-3.5 text-success" />
                {telemetry.battery}%
              </span>

              {/* Operator menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  className="rc-focus-ring flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full border border-line hover:bg-slate-50 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-navy-900 text-white flex items-center justify-center font-black text-[10px]">
                    {operatorName.slice(0, 2)}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-60 rounded-panel bg-white border border-line shadow-lift p-2 animate-fadeIn"
                  >
                    <div className="px-3 py-2 border-b border-line mb-1">
                      <p className="text-xs font-black text-ink truncate">{operatorName}</p>
                      <p className="text-[11px] text-muted truncate">{session.user.email || 'Authority account'}</p>
                      <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-900 text-white text-[9px] font-black uppercase tracking-wide">
                        <ShieldAlert className="w-3 h-3 text-brand-300" /> Response Center Authority
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-ctl text-xs font-bold text-slate-600 hover:text-emergency hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emergency banner — high-visibility, non-color-only cue */}
          {isEmergencyActive && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-emergency text-white text-xs font-bold"
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>
                {activeCount} active emergency{activeCount === 1 ? '' : 'ies'} awaiting response — review the Command Center.
              </span>
              <button
                onClick={() => goResponse('dashboard')}
                className="ml-auto px-3 py-1 rounded-ctl bg-white/15 hover:bg-white/25 border border-white/30 transition-colors"
              >
                Open
              </button>
            </div>
          )}
        </header>

        {/* ===== MAIN CONTENT ===== */}
        <main id="bayani-rc-main-content" className="flex-1 px-4 sm:px-6 py-5 sm:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{renderResponseScreen()}</div>
        </main>
      </div>

      {/* ===== MOBILE NAVIGATION DRAWER ===== */}
      {isMobileMenuOpen && (
        <div
          id="bayani-rc-mobile-menu"
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80%] h-full flex flex-col bg-navy-900 border-r border-navy-800 animate-slideInRight">
            <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-navy-800">
              <div className="flex items-center gap-2.5">
                <img src={bayaniLogo} alt="Bayani Alert logo" className="w-8 h-8 object-contain" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Response Center
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-2 rounded-ctl text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {navList('mobile')}
            <div className="shrink-0 border-t border-navy-800 p-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-ctl text-xs font-bold text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out ({operatorName})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
