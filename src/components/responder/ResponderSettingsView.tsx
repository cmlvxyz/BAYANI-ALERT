import React, { useState } from 'react';
import {
  Settings,
  Building2,
  BellRing,
  MapPin,
  Volume2,
  Radio,
  Lock,
  Archive,
  Download,
  ServerCog,
  Database,
  ShieldCheck,
  BadgeCheck,
  RefreshCcw,
} from 'lucide-react';

export const ResponderSettingsView: React.FC = () => {
  const [autoAssign, setAutoAssign] = useState(true);
  const [audioBroadcast, setAudioBroadcast] = useState(true);
  const [vibrateOnIncident, setVibrateOnIncident] = useState(true);
  const [autoArchive, setAutoArchive] = useState(true);
  const [evidenceRetention, setEvidenceRetention] = useState('12 months (RA 9262)');

  const settingRow = (
    title: string,
    desc: string,
    value: boolean,
    onChange: (v: boolean) => void,
    icon: React.ReactNode,
  ) => (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h5 className="font-bold text-ink text-xs">{title}</h5>
          <p className="text-[11px] text-muted">{desc}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
          aria-label={title}
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
      </label>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-ink tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-600" />
            <span>Response Center Settings</span>
          </h2>
          <p className="text-xs text-muted">
            Agency configuration, dispatch behavior, and evidence operations
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            ENV: DEMO MODE
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-success border border-emerald-200">
            API LAYER: READY
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agency / Command Profile */}
        <section className="rc-panel p-5 space-y-4">
          <h3 className="font-extrabold text-ink text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span>Agency &amp; Command Profile</span>
          </h3>

          <div className="p-4 rounded-card bg-slate-50 border border-line space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Command Center</span>
              <span className="font-bold text-ink">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Jurisdiction</span>
              <span className="font-bold text-ink">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Lead Agency</span>
              <span className="font-bold text-brand-600">-</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Desk Hotline</span>
              <span className="font-mono font-bold text-ink">-</span>
            </div>
          </div>

          <button
            onClick={() => alert('Demo only: Agency profile editing is not available in the prototype.')}
            className="rc-focus-ring w-full py-2.5 rounded-ctl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <BadgeCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>EDIT AGENCY PROFILE</span>
          </button>
        </section>

        {/* Dispatch & Alert Preferences */}
        <section className="rc-panel overflow-hidden divide-y divide-line">
          <div className="px-5 pt-5 pb-2">
            <h3 className="font-extrabold text-ink text-base flex items-center gap-2">
              <BellRing className="w-4 h-4 text-brand-600" />
              <span>Dispatch &amp; Alert Preferences</span>
            </h3>
          </div>
          {settingRow('Auto-Assign Nearest Responder', 'Route the closest available unit automatically', autoAssign, setAutoAssign, <Radio className="w-4 h-4" />)}
          {settingRow('Audio Broadcast on SOS', 'Play desk siren tone when a new SOS arrives', audioBroadcast, setAudioBroadcast, <Volume2 className="w-4 h-4" />)}
          {settingRow('Vibrate on New Incident', 'Haptic alert for dispatchers on mobile', vibrateOnIncident, setVibrateOnIncident, <RefreshCcw className="w-4 h-4" />)}
        </section>

        {/* Sector / Map Defaults */}
        <section className="rc-panel p-5 space-y-3">
          <h3 className="font-extrabold text-ink text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>Sector &amp; Map Defaults</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-muted font-bold block mb-1.5">Default Dispatch Sector</label>
              <select
                defaultValue="Sector 3"
                className="rc-focus-ring w-full px-3 py-2.5 rounded-ctl bg-slate-50 border border-line text-ink text-xs font-bold focus:border-brand-500 focus:outline-none"
              >
                <option>Sector 1</option>
                <option>Sector 2</option>
                <option>Sector 3</option>
                <option>Sector 4</option>
              </select>
            </div>
            <div>
              <label className="text-muted font-bold block mb-1.5">SOS Alert Radius (geofence)</label>
              <select
                defaultValue="500m"
                className="rc-focus-ring w-full px-3 py-2.5 rounded-ctl bg-slate-50 border border-line text-ink text-xs font-bold focus:border-brand-500 focus:outline-none"
              >
                <option>250m</option>
                <option>500m</option>
                <option>1km</option>
                <option>2km</option>
              </select>
            </div>
          </div>
        </section>

        {/* Data & Evidence Operations */}
        <section className="rc-panel overflow-hidden divide-y divide-line">
          <div className="px-5 pt-5 pb-2">
            <h3 className="font-extrabold text-ink text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-600" />
              <span>Data &amp; Evidence Operations</span>
            </h3>
          </div>
          {settingRow('Auto-Archive Evidence', 'Move completed recordings to RA 9262 archive', autoArchive, setAutoArchive, <Archive className="w-4 h-4" />)}

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h5 className="font-bold text-ink text-xs">Evidence Retention Period</h5>
                <p className="text-[11px] text-muted">Hash-stamped audio &amp; incident logs</p>
              </div>
            </div>
            <select
              value={evidenceRetention}
              onChange={(e) => setEvidenceRetention(e.target.value)}
              className="rc-focus-ring px-2.5 py-1.5 rounded-ctl bg-slate-50 border border-line text-ink text-[11px] font-bold focus:border-brand-500 focus:outline-none shrink-0 ml-3"
            >
              <option>6 months</option>
              <option>12 months (RA 9262)</option>
              <option>24 months</option>
              <option>Permanent (court order)</option>
            </select>
          </div>

          <div className="p-4 flex gap-2">
            <button
              onClick={() => alert('Demo only: Export of incident logs is simulated in the prototype.')}
              className="rc-focus-ring flex-1 py-2.5 rounded-ctl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-brand-600" />
              <span>EXPORT LOGS</span>
            </button>
            <button
              onClick={() => alert('Demo only: No backend connected yet. The service layer (apiService) is ready for future API integration.')}
              className="rc-focus-ring flex-1 py-2.5 rounded-ctl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <ServerCog className="w-3.5 h-3.5" />
              <span>API STATUS</span>
            </button>
          </div>
        </section>
      </div>

      {/* System Footprint */}
      <section className="rc-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-success flex items-center justify-center border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-ink block">BAYANI ALERT RESPONSE CENTER v2.4.1-ph</span>
            <span className="text-[11px] text-muted">
              Frontend prototype • Local mock state • Ready for real hardware/API integration
            </span>
          </div>
        </div>
        <span className="shrink-0 px-3 py-1 rounded-full bg-slate-100 border border-line text-[10px] font-mono text-muted">
          NODE: COMMAND-DESK-04
        </span>
      </section>
    </div>
  );
};
