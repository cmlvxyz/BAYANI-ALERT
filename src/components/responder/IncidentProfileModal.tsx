import React from 'react';
import { X, MapPin, Clock, Calendar, Radio, PhoneCall, User, AtSign, Mail } from 'lucide-react';
import { Incident } from '../../types';

interface IncidentProfileModalProps {
  incident: Incident | null;
  onClose: () => void;
  /** Render as a pinned right-side drawer instead of a centered modal. */
  pinned?: boolean;
}

const statusPill = (status: string) => {
  switch (status) {
    case 'ACTIVE':
    case 'PENDING':
      return 'bg-red-50 text-emergency border-red-200';
    case 'RESPONDING':
    case 'RESPONDER EN ROUTE':
    case 'ON SCENE':
    case 'WAIT FOR ME':
    case 'ON THE WAY':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'RESOLVED':
      return 'bg-emerald-50 text-success border-emerald-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const IncidentProfileModal: React.FC<IncidentProfileModalProps> = ({ incident, onClose, pinned = false }) => {
  if (!incident) return null;

  const account = incident.userProfile;
  const fullName = account?.fullName?.trim() || incident.userName?.trim() || 'Unknown Citizen';
  const username = account?.username?.trim() || '';
  const hasAccount = Boolean(username || account?.email);

  const loc = incident.location;
  const hasLocation =
    typeof loc?.lat === 'number' &&
    typeof loc?.lng === 'number' &&
    (loc.lat !== 0 || loc.lng !== 0);
  const locationLine =
    loc?.address ||
    (loc?.barangay ? `${loc.barangay}${loc.city ? ', ' + loc.city : ''}` : 'Location unavailable');

  const field = (icon: React.ReactNode, label: string, value: React.ReactNode, extra?: React.ReactNode) => (
    <div className="p-2.5 rounded-card bg-slate-50 border border-line">
      <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="font-bold text-ink block truncate">{value}</span>
      {extra}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-50 ${pinned ? '' : 'flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-sm animate-fadeIn'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Citizen profile for ${incident.incidentCode}`}
    >
      <div
        className={`bg-white shadow-2xl overflow-y-auto space-y-3 ${
          pinned
            ? 'absolute right-3 top-[104px] h-[calc(100vh-160px)] w-full max-w-md border border-line rounded-panel p-5 animate-slideInRight'
            : 'w-full max-w-sm max-h-[70vh] border border-line rounded-panel p-4 animate-rise'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {account?.avatar ? (
              <img
                src={account.avatar}
                alt={fullName}
                className="w-11 h-11 rounded-full object-cover border border-line shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                {initials(fullName)}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-black text-brand-600 uppercase tracking-wider block">
                {incident.incidentCode}
              </span>
              <h3 className="text-base font-black text-ink leading-tight truncate">{fullName}</h3>
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                  hasAccount ? 'text-success' : 'text-muted'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${hasAccount ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                {hasAccount ? 'Logged-in account' : 'No account linked'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rc-focus-ring p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status + contact */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusPill(incident.status)}`}>
            {incident.status}
          </span>
          {incident.userPhone && incident.userPhone !== '—' && (
            <span className="text-[11px] text-muted font-mono flex items-center gap-1">
              <PhoneCall className="w-3 h-3" />
              {incident.userPhone}
            </span>
          )}
        </div>

        {/* Account profile */}
        <div className="space-y-2">
          <span className="text-[9px] text-muted uppercase font-black tracking-wider block">
            Citizen Profile
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {field(<User className="w-3 h-3" />, 'Full Name', fullName)}
            {field(<AtSign className="w-3 h-3" />, 'Username', username || '—')}
            {field(<User className="w-3 h-3" />, 'Gender', account?.gender || '—')}
            {field(<Mail className="w-3 h-3" />, 'Email', account?.email || '—')}
            {field(
              <Calendar className="w-3 h-3" />,
              'Birthday / Age',
              `${account?.dateOfBirth || '—'}${typeof account?.age === 'number' ? ` · ${account.age} yrs old` : ''}`,
            )}
          </div>
        </div>

        {/* Incident details */}
        <div className="space-y-2">
          <span className="text-[9px] text-muted uppercase font-black tracking-wider block">
            Incident Details
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {field(<Clock className="w-3 h-3" />, 'Time', incident.timeActivated || '—')}
            {field(<Calendar className="w-3 h-3" />, 'Date', incident.date || '—')}
            <div className="col-span-2 p-2.5 rounded-card bg-slate-50 border border-line">
              <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </span>
              <span className="font-bold text-ink block truncate">{locationLine}</span>
              {hasLocation && (
                <span className="font-mono text-[10px] text-success block">
                  {loc.lat.toFixed(6)}°, {loc.lng.toFixed(6)}° · ±{loc.accuracyRadiusMeters}m
                  {loc.source === 'gps' ? ' (GPS)' : loc.source === 'override' ? ' (pinned)' : ''}
                </span>
              )}
            </div>

            <div className="col-span-2 p-2.5 rounded-card bg-slate-50 border border-line">
              <span className="text-[9px] text-muted uppercase font-bold flex items-center gap-1">
                <Radio className="w-3 h-3" /> Assigned Responder
              </span>
              <span className="font-bold text-ink block truncate">
                {incident.assignedResponder?.name || 'Unassigned'}
              </span>
              <span className="text-[10px] text-muted block">
                {incident.assignedResponder?.unit || '—'} · ETA: {incident.assignedResponder?.eta || 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
