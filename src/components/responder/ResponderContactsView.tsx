import React from 'react';
import { Users, Phone, Shield, HeartPulse, Scale, ExternalLink } from 'lucide-react';

export const ResponderContactsView: React.FC = () => {
  const directory = [
    {
      category: 'Barangay Response Teams',
      icon: Shield,
      items: [
        { name: 'Barangay Hall / Disaster Council', desc: 'Office of the Barangay Captain', contact: '0917 123 4567' },
        { name: 'Barangay Tanod Quick Reaction', desc: '24/7 patrol hotline', contact: '0917 123 4568' },
        { name: 'Barangay Health Station', desc: 'Primary health care', contact: '0917 123 4569' },
      ],
    },
    {
      category: 'Law Enforcement & PNP',
      icon: Scale,
      items: [
        { name: 'Balanga PNP Station', desc: 'City police station', contact: '0920 111 2233' },
        { name: 'PNP Human Rights Desk', desc: 'Rights-based response concerns', contact: '0920 111 2234' },
        { name: 'Women & Children Protection Desk', desc: 'VAWC / child abuse cases', contact: '0920 111 2235' },
      ],
    },
    {
      category: 'Medical & Crisis Support',
      icon: HeartPulse,
      items: [
        { name: 'Bataan General Hospital', desc: 'Emergency room', contact: '0935 555 0101' },
        { name: 'Philippine Red Cross', desc: 'Ambulance / blood services', contact: '0935 555 0102' },
        { name: 'DSWD Crisis Intervention', desc: 'Social welfare assistance', contact: '0935 555 0103' },
        { name: 'City Health Office', desc: 'Medical first response', contact: '0935 555 0104' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>PUBLIC SAFETY RESPONSE DIRECTORY</span>
        </h2>
        <p className="text-xs text-slate-500">
          Official liaison channels for inter-agency coordination (LGU, PNP, DSWD, Red Cross)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {directory.map((group, idx) => {
          const Icon = group.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-md">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Icon className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
                  {group.category}
                </h3>
              </div>

              <div className="space-y-2.5">
                {group.items.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                    <p className="text-[11px] text-slate-400 font-bold">
                      No entries yet — directory data will appear here when connected.
                    </p>
                  </div>
                ) : group.items.map((item, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <div className="font-bold text-slate-700">{item.name}</div>
                    <div className="text-[11px] text-slate-500">{item.desc}</div>
                    <div className="pt-1 flex items-center justify-between font-mono text-[11px]">
                      <span className="text-blue-600 font-bold">{item.contact}</span>
                      <a
                        href={`tel:${item.contact}`}
                        className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        title="Call"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};