import React, { useMemo, useState } from 'react';
import { Radio, Phone, MapPin, UserCheck, Search } from 'lucide-react';
import { ResponderAgent } from '../../types';

interface ResponderPersonnelViewProps {
  responders: ResponderAgent[];
}

const statusPill = (status: ResponderAgent['status']): string => {
  switch (status) {
    case 'Dispatched':
    case 'On Scene':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Available':
      return 'bg-emerald-50 text-success border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};

export const ResponderPersonnelView: React.FC<ResponderPersonnelViewProps> = ({ responders }) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const statuses = useMemo(
    () => Array.from(new Set(responders.map((r) => r.status))),
    [responders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return responders.filter((r) => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesQuery =
        q === '' ||
        r.name.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        r.currentSector.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [responders, query, statusFilter]);

  const available = responders.filter((r) => r.status === 'Available').length;
  const engaged = responders.filter((r) => r.status === 'Dispatched' || r.status === 'On Scene').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-ink tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-brand-600" />
            <span>Active Field Responders</span>
          </h2>
          <p className="text-xs text-muted">
            On-duty PNP officers, Barangay Tanod quick reaction patrols, and VAWC case workers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, unit, sector…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rc-focus-ring pl-9 pr-3 py-2 rounded-ctl bg-white border border-line text-xs text-ink focus:border-brand-500 focus:outline-none w-52 sm:w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rc-focus-ring px-3 py-2 rounded-ctl bg-white border border-line text-xs text-slate-600 font-bold focus:border-brand-500 focus:outline-none"
          >
            <option value="ALL">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rc-panel p-4">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Registered Units</span>
          <div className="text-2xl font-black text-ink mt-1">{responders.length}</div>
        </div>
        <div className="rc-panel p-4">
          <span className="text-[10px] font-bold text-success uppercase tracking-wider block flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Available
          </span>
          <div className="text-2xl font-black text-success mt-1">{available}</div>
        </div>
        <div className="rc-panel p-4">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Engaged</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{engaged}</div>
        </div>
      </div>

      {/* Roster */}
      {filtered.length === 0 ? (
        <div className="rc-panel p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-200">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-ink text-base">
            {responders.length === 0 ? 'No Responders Registered' : 'No Matching Responders'}
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {responders.length === 0
              ? 'On-duty units will appear here once responders are registered and online.'
              : 'Adjust your search or status filter to see more units.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="rc-panel p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-brand-600 font-bold uppercase block">
                    {r.type}
                  </span>
                  <h3 className="font-extrabold text-ink text-base mt-0.5 truncate">{r.name}</h3>
                  <span className="text-xs text-muted font-medium block truncate">{r.unit}</span>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusPill(r.status)}`}>
                  {r.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted pt-2 border-t border-line">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Sector: <strong className="text-slate-700">{r.currentSector}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-600">{r.phone}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <a
                  href={`tel:${r.phone}`}
                  className="rc-focus-ring py-1.5 px-3 rounded-ctl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Direct Radio / Call</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
