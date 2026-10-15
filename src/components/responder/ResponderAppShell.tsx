import React, { useState } from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  MapPin, 
  FileText, 
  Radio, 
  Users, 
  BarChart3, 
  Settings, 
  Bell, 
  CheckCircle2, 
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';
import { Incident, ResponderNavTab, IncidentStatus, ResponderAgent } from '../../types';
import { ResponderDashboardView } from './ResponderDashboardView';
import { ResponderMapView } from './ResponderMapView';
import { ResponderIncidentsView } from './ResponderIncidentsView';
import { ResponderPersonnelView } from './ResponderPersonnelView';
import { ResponderContactsView } from './ResponderContactsView';
import { ResponderReportsView } from './ResponderReportsView';
import { ResponderSettingsView } from './ResponderSettingsView';

interface ResponderAppShellProps {
  activeIncident: Incident | null;
  incidents: Incident[];
  responders: ResponderAgent[];
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => void;
  onAssignResponder: (incidentId: string, responder: ResponderAgent) => void;
  onResolveActiveEmergency: () => void;
}

export const ResponderAppShell: React.FC<ResponderAppShellProps> = ({
  activeIncident,
  incidents,
  responders,
  onUpdateStatus,
  onAssignResponder,
  onResolveActiveEmergency,
}) => {
  const [currentTab, setCurrentTab] = useState<ResponderNavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Armed only by a live SOS received in this session — never by incidents
  // loaded from the backend as history (see ingestIncomingSOS).
  const activeEmergenciesCount =
    activeIncident && activeIncident.status !== 'RESOLVED' && activeIncident.status !== 'CANCELLED' ? 1 : 0;

  const navItems: { id: ResponderNavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'incidents', label: 'Live Incidents', icon: FileText },
    { id: 'map', label: 'Tactical Map', icon: MapPin },
    { id: 'responders', label: 'Responders', icon: Radio },
    { id: 'contacts', label: 'Directory', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div id="responder-command-center" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Authority Command Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="w-9 h-9 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-wider uppercase text-white">
                  BAYANI ALERT RESPONSE CENTER
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  LGU / PNP COMMAND
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Public Safety &amp; VAWC Emergency Desk
              </p>
            </div>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-3">
            {activeEmergenciesCount > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950 border border-red-700 text-red-300 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{activeEmergenciesCount} ACTIVE SOS</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>SECTORS NORMAL</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar on Desktop + Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 p-4 border-r border-slate-800 bg-slate-900/50 shrink-0 select-none">
          <nav className="space-y-1.5 sticky top-20">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 block mb-2 font-bold">
              OPERATIONS NAVIGATION
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'incidents' && activeEmergenciesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-mono font-black">
                      {activeEmergenciesCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <span className="text-sm font-black text-white">RESPONDER MENU</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2 pt-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-bold ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900'
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

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <ResponderDashboardView
              activeIncident={activeIncident}
              incidents={incidents}
              responders={responders}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onUpdateStatus={onUpdateStatus}
              onAssignResponder={onAssignResponder}
              onResolveActiveEmergency={onResolveActiveEmergency}
            />
          )}

          {currentTab === 'incidents' && (
            <ResponderIncidentsView
              incidents={incidents}
              responders={responders}
              onUpdateStatus={onUpdateStatus}
              onAssignResponder={onAssignResponder}
            />
          )}

          {currentTab === 'map' && (
            <ResponderMapView
              activeIncident={activeIncident}
              incidents={incidents}
              responders={responders}
            />
          )}

          {currentTab === 'responders' && (
            <ResponderPersonnelView responders={responders} />
          )}

          {currentTab === 'contacts' && (
            <ResponderContactsView />
          )}

          {currentTab === 'reports' && (
            <ResponderReportsView incidents={incidents} />
          )}

          {currentTab === 'settings' && (
            <ResponderSettingsView />
          )}
        </main>
      </div>
    </div>
  );
};
