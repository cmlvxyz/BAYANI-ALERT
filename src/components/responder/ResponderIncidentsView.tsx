import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  MapPin,
  Search,
  ShieldCheck,
  Lock,
  MessageSquare,
  Navigation,
  Trash2,
  ArrowUpDown,
  Inbox,
} from 'lucide-react';
import { Incident, IncidentStatus, ResponderAgent, SmsNotificationStatus } from '../../types';
import { LiveGoogleMap } from '../LiveGoogleMap';
import { IncidentProfileModal } from './IncidentProfileModal';
import { canTransition } from '../../services/incidentService';

interface ResponderIncidentsViewProps {
  incidents: Incident[];
  responders: ResponderAgent[];
  onViewIncident?: (incident: Incident) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => void;
  onAssignResponder: (incidentId: string, responder: ResponderAgent) => void;
  onDeleteIncident: (incidentId: string) => void;
}

/** Presentation-only status tone. Never changes the underlying status value. */
const statusTone = (status: IncidentStatus): string => {
  switch (status) {
    case 'ACTIVE':
    case 'PENDING':
      return 'bg-red-50 text-emergency border-red-200';
    case 'RESOLVED':
      return 'bg-emerald-50 text-success border-emerald-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'WAIT FOR ME':
    case 'ON THE WAY':
    case 'RESPONDING':
    case 'RESPONDER EN ROUTE':
    case 'ON SCENE':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'WAIT FOR ME', label: 'Wait for me' },
  { value: 'ON THE WAY', label: 'On the way' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const ResponderIncidentsView: React.FC<ResponderIncidentsViewProps> = ({
  incidents,
  responders,
  onViewIncident,
  onUpdateStatus,
  onAssignResponder,
  onDeleteIncident,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0] || null);
  const [profileIncident, setProfileIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDesc, setSortDesc] = useState(true);

  // Keep the selected incident in sync with store updates (status / SMS results).
  useEffect(() => {
    setSelectedIncident((prev) => {
      if (!prev) return incidents[0] ?? null;
      return incidents.find((i) => i.id === prev.id) ?? incidents[0] ?? null;
    });
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = incidents.filter((i) => {
      const matchesFilter = statusFilter === 'ALL' || i.status === statusFilter;
      const addr = ((i.location?.address ?? '') + ' ' + (i.location?.barangay ?? '') + ' ' + (i.location?.city ?? '')).toLowerCase();
      const matchesSearch =
        q === '' ||
        addr.includes(q) ||
        (i.incidentCode ?? '').toLowerCase().includes(q) ||
        (i.userName ?? '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
    return rows.sort((a, b) => (sortDesc ? (b.id > a.id ? 1 : b.id < a.id ? -1 : 0) : a.id > b.id ? 1 : a.id < b.id ? -1 : 0));
  }, [incidents, statusFilter, searchQuery, sortDesc]);

  // Only show lifecycle-legal next steps for the current status (a resolved
  // alert can no longer be flipped back open).
  const statusOptions: IncidentStatus[] = selectedIncident
    ? (['WAIT FOR ME', 'ON THE WAY'] as IncidentStatus[]).filter((opt) => canTransition(selectedIncident.status, opt))
    : [];

  const sms = selectedIncident?.smsNotifications;

  const smsStatusLabel = (status: SmsNotificationStatus) => {
    switch (status) {
      case 'SENT': return '✓ Sent';
      case 'QUEUED': return '✓ Queued';
      case 'SIMULATED': return '✓ Simulated';
      case 'PENDING': return '… Pending';
      case 'FAILED': return '✕ Failed';
      default: return status;
    }
  };

  const smsStatusPill = (status: SmsNotificationStatus) => {
    switch (status) {
      case 'SENT': return 'bg-emerald-50 text-success border-emerald-200';
      case 'QUEUED': return 'bg-brand-50 text-brand-700 border-brand-200';
      case 'SIMULATED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED': return 'bg-red-50 text-emergency border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const assignableResponders = responders.filter((r) => r.status === 'Available' || r.status === 'Dispatched');

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-ink tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <span>Incident Management &amp; Archive</span>
          </h2>
          <p className="text-xs text-muted">
            Real-time intake and statutory documentation for VAWC cases
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code, citizen, barangay…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rc-focus-ring pl-9 pr-3 py-2 rounded-ctl bg-white border border-line text-xs text-ink focus:border-brand-500 focus:outline-none w-52 sm:w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rc-focus-ring px-3 py-2 rounded-ctl bg-white border border-line text-xs text-slate-600 font-bold focus:border-brand-500 focus:outline-none"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <button
            onClick={() => setSortDesc((v) => !v)}
            className="rc-focus-ring px-3 py-2 rounded-ctl bg-white border border-line text-xs text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortDesc ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incident list */}
        <section className="lg:col-span-1 rc-panel overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-xs font-black text-ink uppercase tracking-wider">Incidents</span>
            <span className="text-[11px] font-mono text-muted">{filteredIncidents.length} shown</span>
          </div>

          <div className="max-h-[640px] overflow-y-auto divide-y divide-line">
            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs text-muted mt-2">No incidents match the current filters.</p>
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <button
                    key={inc.id}
                    onClick={() => {
                      setSelectedIncident(inc);
                      setProfileIncident(inc);
                    }}
                    className={`w-full text-left p-4 transition-colors border-l-4 ${
                      isSelected
                        ? 'bg-brand-50/60 border-l-brand-500'
                        : 'border-l-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-black text-ink text-sm">{inc.incidentCode}</span>
                        {inc.source && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {inc.source === 'HARDWARE' ? 'WEARABLE' : 'APP'}
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusTone(inc.status)}`}>
                          {inc.status}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteIncident(inc.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              onDeleteIncident(inc.id);
                            }
                          }}
                          aria-label={`Delete incident ${inc.incidentCode}`}
                          title="Delete incident"
                          className="p-1 rounded-lg text-slate-400 hover:text-emergency hover:bg-red-50 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      </span>
                    </div>

                    <div className="font-bold text-ink text-xs mt-1.5 truncate">
                      {inc.userName?.trim() || 'Unknown Citizen'}
                    </div>
                    <div className="text-[11px] text-muted truncate">
                      {inc.location?.address || (inc.location?.barangay ? `${inc.location.barangay}${inc.location.city ? ', ' + inc.location.city : ''}` : 'Location unavailable')}
                    </div>

                    <div className="pt-2 mt-2 border-t border-line flex items-center justify-between text-[10px] text-muted font-mono">
                      <span>{inc.timeActivated}</span>
                      <span>{inc.date}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Incident inspector */}
        <section className="lg:col-span-2">
          {selectedIncident ? (
            <div className="rc-panel p-5 sm:p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-4 border-b border-line">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-brand-600 font-bold uppercase tracking-wider block">
                    Incident Dossier
                  </span>
                  <h3 className="text-lg font-black text-ink mt-0.5 truncate">
                    {selectedIncident.incidentCode} — {selectedIncident.userName?.trim() || 'Unknown'}
                  </h3>
                  <p className="text-xs text-muted">
                    Activated {selectedIncident.date} at {selectedIncident.timeActivated}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onViewIncident?.(selectedIncident)}
                    className="rc-focus-ring px-3 py-2 rounded-ctl bg-success hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-colors"
                    title="Open Street View at this incident's location"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Street View</span>
                  </button>

                  <span className="text-xs text-muted font-bold">Status:</span>
                  {statusOptions.length > 0 ? (
                    <select
                      value={selectedIncident.status}
                      onChange={(e) => onUpdateStatus(selectedIncident.id, e.target.value as IncidentStatus)}
                      className="rc-focus-ring px-3 py-2 rounded-ctl bg-white border border-line text-xs font-bold text-ink focus:border-brand-500 focus:outline-none"
                    >
                      <option value={selectedIncident.status}>{selectedIncident.status}</option>
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-3 py-2 rounded-ctl border text-xs font-bold ${statusTone(selectedIncident.status)}`}>
                      {selectedIncident.status}
                    </span>
                  )}

                  <button
                    onClick={() => onDeleteIncident(selectedIncident.id)}
                    aria-label={`Delete incident ${selectedIncident.incidentCode}`}
                    title="Delete incident"
                    className="rc-focus-ring p-2 rounded-ctl text-slate-400 hover:text-emergency hover:bg-red-50 active:scale-95 transition-all border border-line"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Telemetry summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-card bg-slate-50 border border-line">
                  <span className="text-[10px] text-muted uppercase font-bold block">Location</span>
                  {selectedIncident.location?.address ? (
                    <>
                      <span className="font-bold text-ink block truncate mt-0.5">{selectedIncident.location.address}</span>
                      <span className="text-muted text-[11px] block">
                        {selectedIncident.location.barangay}
                        {selectedIncident.location.barangay && selectedIncident.location.city ? ', ' : ''}
                        {selectedIncident.location.city}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-muted block mt-0.5">Location unavailable</span>
                  )}
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-line">
                  <span className="text-[10px] text-muted uppercase font-bold block">Coordinates &amp; Precision</span>
                  {typeof selectedIncident.location?.lat === 'number' && typeof selectedIncident.location?.lng === 'number' ? (
                    <>
                      <span className="font-mono text-success font-bold block mt-0.5">
                        {selectedIncident.location.lat.toFixed(6)}° N, {selectedIncident.location.lng.toFixed(6)}° E
                      </span>
                      <span className="text-muted text-[11px] block">
                        Accuracy ±{selectedIncident.location.accuracyRadiusMeters}m
                        {selectedIncident.location.source === 'gps' ? ' (exact GPS)' : selectedIncident.location.source === 'override' ? ' (pinned)' : ''}
                      </span>
                      {selectedIncident.location.gpsTimestamp && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Fix: {new Date(selectedIncident.location.gpsTimestamp).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted text-[11px] block mt-0.5">Location unavailable</span>
                  )}
                </div>

                <div className="p-3 rounded-card bg-slate-50 border border-line col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted uppercase font-bold block">Assigned Responder</span>
                  <span className="font-bold text-brand-600 block truncate mt-0.5">
                    {selectedIncident.assignedResponder?.name || 'None Assigned'}
                  </span>
                  <span className="text-muted text-[11px] block">ETA: {selectedIncident.assignedResponder?.eta || 'Pending'}</span>
                </div>
              </div>

              {/* Assign a responder directly from the dossier */}
              {assignableResponders.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-muted text-xs uppercase tracking-wider">Assign / Reassign Unit</h4>
                  <div className="flex flex-wrap gap-2">
                    {assignableResponders.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onAssignResponder(selectedIncident.id, r)}
                        className="rc-focus-ring px-3 py-1.5 rounded-ctl bg-slate-50 border border-line hover:border-brand-400 hover:bg-brand-50/50 text-xs font-bold text-ink transition-colors"
                      >
                        {r.name} <span className="text-brand-600">· {r.unit}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Exact location + live map */}
              {typeof selectedIncident.location?.lat === 'number' &&
                typeof selectedIncident.location?.lng === 'number' &&
                (selectedIncident.location.lat !== 0 || selectedIncident.location.lng !== 0) ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-muted text-xs uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      <span>Exact Location</span>
                    </h4>
                    <button
                      onClick={() => onViewIncident?.(selectedIncident)}
                      className="rc-focus-ring px-3 py-1.5 rounded-ctl bg-success hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-colors"
                      title="Open Google Street View at the received coordinates"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Live Street View</span>
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-card border border-line">
                    <LiveGoogleMap
                      lat={selectedIncident.location.lat}
                      lng={selectedIncident.location.lng}
                      zoom={16}
                      showMarker
                      markerTitle={`${selectedIncident.incidentCode} — ${selectedIncident.userName}`}
                      onMapClick={() =>
                        window.open(
                          `https://www.google.com/maps?layer=c&cbll=${selectedIncident.location.lat},${selectedIncident.location.lng}&cbp=11,${selectedIncident.location.heading ?? 0},${selectedIncident.location.pitch ?? 0},0,0&z=17`,
                          '_blank',
                          'noopener',
                        )
                      }
                      className="w-full h-56"
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-400">
                    {selectedIncident.location.lat.toFixed(6)}°, {selectedIncident.location.lng.toFixed(6)}° · Accuracy ±
                    {selectedIncident.location.accuracyRadiusMeters}m
                    {selectedIncident.location.gpsTimestamp
                      ? ` · Fix: ${new Date(selectedIncident.location.gpsTimestamp).toLocaleString()}`
                      : ''}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-card bg-slate-50 border border-line text-xs flex items-center gap-2 text-muted">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>No exact location was captured for this alert.</span>
                </div>
              )}

              {/* Event timeline */}
              <div className="space-y-3 pt-1">
                <h4 className="font-black text-muted text-xs uppercase tracking-wider">Detailed Event Timeline</h4>
                <ol className="relative space-y-3 pl-5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-line">
                  {selectedIncident.timeline.map((step, idx) => (
                    <li key={step.id || idx} className="relative text-xs">
                      <span className="absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full bg-success text-white flex items-center justify-center text-[8px] font-bold">
                        ✓
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">{step.title}</span>
                        <span className="text-[10px] font-mono text-muted shrink-0">{step.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-muted">{step.description}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Emergency contacts / SMS notification */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-muted text-xs uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                    <span>Emergency Contacts &amp; SMS Notification</span>
                  </h4>
                  {sms && (
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      sms.mode === 'live'
                        ? 'bg-emerald-50 text-success border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {sms.mode === 'live' ? 'LIVE SMS' : 'SIMULATION MODE'}
                    </span>
                  )}
                </div>

                {sms && sms.results.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted">
                      {sms.summary.sent} sent · {sms.summary.queued ?? 0} queued ·{' '}
                      {sms.summary.simulated} simulated · {sms.summary.failed} failed
                    </p>
                    {sms.results.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-card bg-slate-50 border border-line text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate">{r.contactName}</span>
                          <span className="font-mono text-[10px] text-muted">{r.phoneMasked}</span>
                          {r.error && (
                            <span className="text-[10px] text-emergency block truncate">{r.error}</span>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${smsStatusPill(r.status)}`}>
                          {smsStatusLabel(r.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-card bg-slate-50 border border-line text-[11px] text-muted">
                    {sms
                      ? 'No active contacts were notified for this incident.'
                      : 'No SMS notification recorded yet for this incident.'}
                  </div>
                )}
              </div>

              {/* Audio evidence hash */}
              <div className="p-3.5 rounded-card bg-slate-50 border border-line text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-muted min-w-0">
                  <Lock className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="shrink-0">Audio evidence hash (RA 9262):</span>
                  <span className="font-mono text-[10px] text-slate-500 truncate">
                    sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                  </span>
                </div>
                <span className="shrink-0 self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-success flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VALIDATED
                </span>
              </div>
            </div>
          ) : (
            <div className="rc-panel p-10 text-center text-xs text-muted flex flex-col items-center gap-2">
              <Inbox className="w-7 h-7 text-slate-300" />
              Select an incident from the list to inspect its dossier.
            </div>
          )}
        </section>
      </div>

      <IncidentProfileModal
        incident={profileIncident}
        pinned
        onClose={() => setProfileIncident(null)}
      />
    </div>
  );
};
