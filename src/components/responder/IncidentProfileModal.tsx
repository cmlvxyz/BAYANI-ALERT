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
      return 'bg-red-50 text-red-600 border-red-200';
    case 'RESPONDING':
    case 'RESPONDER EN ROUTE':
    case 'ON SCENE':
    case 'WAIT FOR ME':
    case 'ON THE WAY':
      return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'RESOLVED':
      return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-amber-50 text-amber-600 border-amber-200';
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

  return (
    <div
      className={`fixed inset-0 z-50 ${pinned ? '' : 'flex items-center justify-center p-4'}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Citizen profile for ${incident.incidentCode}`}
    >
      <div
        className={`bg-white shadow-2xl overflow-y-auto space-y-3 ${
          pinned
            ? 'absolute right-3 top-[104px] h-[calc(100vh-160px)] w-full max-w-md border border-slate-200 rounded-2xl p-5 animate-slideInRight shadow-2xl bg-white'
            : 'w-full max-w-sm max-h-[70vh] border border-slate-200 rounded-2xl p-4'
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
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                {initials(fullName)}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-black text-blue-600 uppercase tracking-wider block">
                {incident.incidentCode}
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight truncate">{fullName}</h3>
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${
                  hasAccount ? 'text-emerald-600' : 'text-slate-400'
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
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
            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
              <PhoneCall className="w-3 h-3" />
              {incident.userPhone}
            </span>
          )}
        </div>

        {/* Account profile */}
        <div className="space-y-2">
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">
            Citizen Profile
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <User className="w-3 h-3" /> Full Name
              </span>
              <span className="font-bold text-slate-900 block truncate">{fullName}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <AtSign className="w-3 h-3" /> Username
              </span>
              <span className="font-bold text-slate-900 block truncate">{username || '—'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <User className="w-3 h-3" /> Gender
              </span>
              <span className="font-bold text-slate-900 block truncate">{account?.gender || '—'}</span>
            </div>

            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </span>
              <span className="font-bold text-slate-900 block truncate">{account?.email || '—'}</span>
            </div>

            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Birthday / Age
              </span>
              <span className="font-bold text-slate-900 block truncate">
                {account?.dateOfBirth || '—'}
                {typeof account?.age === 'number' ? ` · ${account.age} yrs old` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Incident details */}
        <div className="space-y-2">
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block">
            Incident Details
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time
              </span>
              <span className="font-bold text-slate-900 block">{incident.timeActivated || '—'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </span>
              <span className="font-bold text-slate-900 block">{incident.date || '—'}</span>
            </div>

            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location
              </span>
              <span className="font-bold text-slate-900 block truncate">{locationLine}</span>
              {hasLocation && (
                <span className="font-mono text-[10px] text-emerald-600 block">
                  {loc.lat.toFixed(6)}°, {loc.lng.toFixed(6)}° · ±{loc.accuracyRadiusMeters}m
                  {loc.source === 'gps' ? ' (GPS)' : loc.source === 'override' ? ' (pinned)' : ''}
                </span>
              )}
            </div>

            <div className="col-span-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-1">
                <Radio className="w-3 h-3" /> Assigned Responder
              </span>
              <span className="font-bold text-slate-900 block truncate">
                {incident.assignedResponder?.name || 'Unassigned'}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {incident.assignedResponder?.unit || '—'} · ETA: {incident.assignedResponder?.eta || 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
