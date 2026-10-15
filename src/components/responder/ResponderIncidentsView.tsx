import React, { useEffect, useState } from 'react';
import { FileText, Clock, MapPin, Search, Filter, ShieldCheck, CheckCircle2, ChevronRight, PhoneCall, Mic, Lock, MessageSquare, Navigation, Trash2 } from 'lucide-react';
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

  // Keep the selected incident in sync with store updates (status / SMS results).
  useEffect(() => {
    setSelectedIncident((prev) => {
      if (!prev) return incidents[0] ?? null;
      return incidents.find((i) => i.id === prev.id) ?? incidents[0] ?? null;
    });
  }, [incidents]);

  const filteredIncidents = incidents.filter((i) => {
    const matchesFilter = statusFilter === 'ALL' || i.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const addr = ((i.location?.address ?? '') + ' ' + (i.location?.barangay ?? '') + ' ' + (i.location?.city ?? '')).toLowerCase();
    const matchesSearch =
      addr.includes(q) ||
      (i.incidentCode ?? '').toLowerCase().includes(q) ||
      (i.userName ?? '').toLowerCase().includes(q) ||
      (i.location?.barangay ?? '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

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
      case 'SENT': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'QUEUED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SIMULATED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>INCIDENT MANAGEMENT &amp; ARCHIVE</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time intake and statutory legal documentation for VAWC cases
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code, citizen, barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-600 font-bold focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="WAIT FOR ME">WAIT FOR ME</option>
            <option value="ON THE WAY">ON THE WAY</option>
          </select>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incident List */}
        <div className="space-y-2 lg:col-span-1 max-h-[600px] overflow-y-auto pr-1">
          {filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => {
                  setSelectedIncident(inc);
                  setProfileIncident(inc);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-black text-slate-900">{inc.incidentCode}</span>
                    {inc.source && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {inc.source === 'HARDWARE' ? 'WEARABLE' : 'APP'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      inc.status === 'ACTIVE'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : inc.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : inc.status === 'WAIT FOR ME' || inc.status === 'ON THE WAY'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {inc.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteIncident(inc.id);
                      }}
                      aria-label={`Delete incident ${inc.incidentCode}`}
                      title="Delete incident"
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="font-medium text-slate-700">{inc.userName?.trim() || 'Unknown'}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {inc.location?.address || (inc.location?.barangay ? `${inc.location.barangay}${inc.location.city ? ', ' + inc.location.city : ''}` : 'Location unavailable')}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{inc.timeActivated}</span>
                  <span>{inc.date}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Incident Inspector Panel */}
        <div className="lg:col-span-2">
          {selectedIncident ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-md">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono text-blue-600 font-bold uppercase block">
                    INCIDENT DOSSIER
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedIncident.incidentCode} — {selectedIncident.userName?.trim() || 'Unknown'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Activated {selectedIncident.date} at {selectedIncident.timeActivated}
                  </p>
                </div>

                {/* Quick Status Selector */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewIncident?.(selectedIncident)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    title="Open Street View at this incident's location"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>VIEW LOCATION</span>
                  </button>

                  <span className="text-xs text-slate-500 font-bold">Status:</span>
                  {statusOptions.length > 0 ? (
                    <select
                      value={selectedIncident.status}
                      onChange={(e) => onUpdateStatus(selectedIncident.id, e.target.value as IncidentStatus)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-400">
                      {selectedIncident.status}
                    </span>
                  )}

                  <button
                    onClick={() => onDeleteIncident(selectedIncident.id)}
                    aria-label={`Delete incident ${selectedIncident.incidentCode}`}
                    title="Delete incident"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all border border-slate-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Telemetry Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Location</span>
                  {selectedIncident.location?.address ? (
                    <>
                      <span className="font-bold text-slate-900 block truncate">{selectedIncident.location.address}</span>
                      <span className="text-slate-500 text-[11px] block">
                        {selectedIncident.location.barangay}
                        {selectedIncident.location.barangay && selectedIncident.location.city ? ', ' : ''}
                        {selectedIncident.location.city}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-slate-900 block">Location unavailable</span>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Coordinates &amp; Precision</span>
                  {typeof selectedIncident.location?.lat === 'number' && typeof selectedIncident.location?.lng === 'number' ? (
                    <>
                      <span className="font-mono text-emerald-600 font-bold block">
                        {selectedIncident.location.lat.toFixed(6)}° N, {selectedIncident.location.lng.toFixed(6)}° E
                      </span>
                      <span className="text-slate-500 text-[11px] block">
                        Accuracy: ±{selectedIncident.location.accuracyRadiusMeters}m
                        {selectedIncident.location.source === 'gps' ? ' (exact GPS)' : selectedIncident.location.source === 'override' ? ' (pinned)' : ''}
                      </span>
                      {selectedIncident.location.gpsTimestamp && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Fix: {new Date(selectedIncident.location.gpsTimestamp).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500 text-[11px] block">Location unavailable</span>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Responder</span>
                  <span className="font-bold text-blue-600 block truncate">
                    {selectedIncident.assignedResponder?.name || 'None Assigned'}
                  </span>
                  <span className="text-slate-500 text-[11px] block">ETA: {selectedIncident.assignedResponder?.eta || 'Pending'}</span>
                </div>
              </div>

              {/* Exact Location + Live Map */}
              {typeof selectedIncident.location?.lat === 'number' &&
                typeof selectedIncident.location?.lng === 'number' &&
                (selectedIncident.location.lat !== 0 || selectedIncident.location.lng !== 0) ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Exact Location</span>
                    </h4>
                    <button
                      onClick={() => onViewIncident?.(selectedIncident)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                      title="Open Google Street View at the received coordinates"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>LIVE VIEW STREET</span>
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
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
                    {selectedIncident.location.lat.toFixed(6)}°, {selectedIncident.location.lng.toFixed(6)}° · Accuracy: ±
                    {selectedIncident.location.accuracyRadiusMeters}m
                    {selectedIncident.location.gpsTimestamp
                      ? ` · Fix: ${new Date(selectedIncident.location.gpsTimestamp).toLocaleString()}`
                      : ''}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2 text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>No exact location was captured for this alert.</span>
                </div>
              )}

              {/* Event Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider">
                  Detailed Event Timeline
                </h4>
                <div className="space-y-2 pl-1">
                  {selectedIncident.timeline.map((step, idx) => (
                    <div key={step.id || idx} className="flex items-start gap-3 text-xs">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        ✓
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">{step.title}</span>
                          <span className="text-[10px] font-mono text-slate-500">{step.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contacts / SMS Notification */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Emergency Contacts &amp; SMS Notification</span>
                  </h4>
                  {sms && (
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      sms.mode === 'live'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {sms.mode === 'live' ? 'LIVE SMS' : 'SIMULATION MODE'}
                    </span>
                  )}
                </div>

                {sms && sms.results.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500">
                      {sms.summary.sent} sent · {sms.summary.queued ?? 0} queued ·{' '}
                      {sms.summary.simulated} simulated · {sms.summary.failed} failed
                    </p>
                    {sms.results.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block truncate">{r.contactName}</span>
                          <span className="font-mono text-[10px] text-slate-500">{r.phoneMasked}</span>
                          {r.error && (
                            <span className="text-[10px] text-red-500 block truncate">{r.error}</span>
                          )}
                        </div>
                        <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${smsStatusPill(r.status)}`}>
                          {smsStatusLabel(r.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                    {sms
                      ? 'No active contacts were notified for this incident.'
                      : 'No SMS notification recorded yet for this incident.'}
                  </div>
                )}
              </div>

              {/* Audio Hash Security Section */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Audio Evidence Hash (RA 9262):</span>
                  <span className="font-mono text-[10px] text-slate-600">
                    sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                  VALIDATED
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-xs text-slate-500 shadow-md">
              Select an incident from the left to inspect logs.
            </div>
          )}
        </div>
      </div>

      <IncidentProfileModal
        incident={profileIncident}
        pinned
        onClose={() => setProfileIncident(null)}
      />
    </div>
  );
};