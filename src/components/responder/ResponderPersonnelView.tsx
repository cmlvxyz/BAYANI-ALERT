import React from 'react';
import { Radio, Shield, Phone, MapPin, UserCheck, Clock } from 'lucide-react';
import { ResponderAgent } from '../../types';

interface ResponderPersonnelViewProps {
  responders: ResponderAgent[];
}

export const ResponderPersonnelView: React.FC<ResponderPersonnelViewProps> = ({ responders }) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Radio className="w-5 h-5 text-blue-600" />
          <span>ACTIVE FIELD RESPONDERS</span>
        </h2>
        <p className="text-xs text-slate-500">
          On-duty PNP officers, Barangay Tanod quick reaction patrols, and VAWC case workers
        </p>
      </div>

      {responders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">No Responders Registered</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            On-duty units will appear here once responders are registered and online.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {responders.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-600 font-bold uppercase block">
                  {r.type}
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                  {r.name}
                </h3>
                <span className="text-xs text-slate-500 font-medium block">
                  {r.unit}
                </span>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                r.status === 'Dispatched' || r.status === 'On Scene'
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}>
                {r.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Sector: <strong className="text-slate-700">{r.currentSector}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-slate-600">{r.phone}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <a
                href={`tel:${r.phone}`}
                className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
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