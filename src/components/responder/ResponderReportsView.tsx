import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Incident } from '../../types';

interface ResponderReportsViewProps {
  incidents: Incident[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Epoch timestamp ng incident — mula sa id (`inc-<epoch>`), o fallback sa ngayon. */
function incidentTime(inc: Incident): number {
  const m = /^inc-(\d+)$/.exec(inc.id);
  return m ? Number(m[1]) : Date.now();
}

export const ResponderReportsView: React.FC<ResponderReportsViewProps> = ({ incidents }) => {
  const total = incidents.length;
  const resolved = incidents.filter(i => i.status === 'RESOLVED').length;

  // Weekly Activation — galing sa totoong incidents ng system (kapareho ng
  // lumalabas sa Dashboard / Live Incidents), nahahati sa 7 linggong balon.
  const now = Date.now();
  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const weekEnd = now - (6 - i) * WEEK_MS;
    const weekStart = weekEnd - WEEK_MS;
    const count = incidents.filter(
      (inc) => {
        const t = incidentTime(inc);
        return t >= weekStart && t < weekEnd;
      },
    ).length;
    return { label: `Week ${i + 1}`, count };
  });

  const totalRecorded = weeklyTrend.reduce((s, d) => s + d.count, 0);
  const peakWeek = Math.max(1, ...weeklyTrend.map((d) => d.count));
  const delta = (weeklyTrend[6]?.count ?? 0) - (weeklyTrend[5]?.count ?? 0);

  // RA 9262 category breakdown derived from the REAL incidents the RC holds.
  // Categories are inferred from the alert's own text (notes); anything that
  // does not match is honestly grouped as "unclassified" instead of inventing
  // a VAWC statistic.
  const classify = (inc: Incident): string => {
    const text = `${inc.notes ?? ''} ${(inc.timeline ?? []).map((s) => `${s.title} ${s.description}`).join(' ')}`.toLowerCase();
    if (/(physic|assault|bater|abuse|threat|violen)/.test(text)) return 'Physical Abuse / Imminent Threat';
    if (/(psych|stalk|harass|intimidat|threaten)/.test(text)) return 'Psychological Harassment / Stalking';
    if (/(economic|money|financial|deprivation)/.test(text)) return 'Economic Deprivation / Threat';
    return 'Awaiting Classification';
  };
  const categoryCounts = incidents.reduce<Record<string, number>>((acc, inc) => {
    const key = classify(inc);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const vawcTypes = [
    { type: 'Physical Abuse / Imminent Threat', color: 'bg-emergency' },
    { type: 'Psychological Harassment / Stalking', color: 'bg-amber-500' },
    { type: 'Economic Deprivation / Threat', color: 'bg-brand-500' },
    { type: 'Awaiting Classification', color: 'bg-slate-400' },
  ].map((cat) => {
    const count = categoryCounts[cat.type] ?? 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { ...cat, count, pct: `${pct}%`, widthPct: pct };
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-ink tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-600" />
          <span>Statistical Reports &amp; Audit</span>
        </h2>
        <p className="text-xs text-muted">
          Emergency response efficacy and RA 9262 case resolution metrics
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rc-panel p-4">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total Recorded</span>
          <div className="text-2xl font-black text-ink mt-1">{total}</div>
          <span className="text-[11px] text-muted">Past 30 days</span>
        </div>

        <div className="rc-panel p-4">
          <span className="text-[10px] font-bold text-info uppercase tracking-wider block">Avg Response Time</span>
          <div className="text-2xl font-black text-ink mt-1">—</div>
          <span className="text-[11px] text-muted">Not tracked yet</span>
        </div>

        <div className="rc-panel p-4">
          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">Resolution Rate</span>
          <div className="text-2xl font-black text-brand-600 mt-1">
            {total > 0 ? `${Math.round((resolved / total) * 100)}%` : '—'}
          </div>
          <span className="text-[11px] text-muted">{resolved} of {total} resolved</span>
        </div>

        <div className="rc-panel p-4">
          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider block">Evidence Preserved</span>
          <div className="text-2xl font-black text-brand-600 mt-1">-</div>
          <span className="text-[11px] text-muted">Cryptographically stamped</span>
        </div>
      </div>

      {/* Incident Category & Weekly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <section className="rc-panel p-5 space-y-4">
          <h3 className="font-extrabold text-ink text-base">Incidents by RA 9262 Category</h3>
          <div className="space-y-3">
            {vawcTypes.map((t, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">{t.type}</span>
                  <span className="font-mono font-bold text-ink">{t.count} ({t.pct})</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className={`${t.color} h-full rounded-full transition-all`} style={{ width: t.pct }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weekly Activation Trends — labeled bar chart */}
        <section className="rc-panel p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-ink text-base">Weekly Activation Trends</h3>
              <p className="text-[11px] text-muted">BAYANI emergency activations</p>
            </div>
            <span className="text-[10px] bg-brand-50 text-brand-700 font-mono px-2.5 py-1 rounded-full font-bold shrink-0 border border-brand-100">
              WEEKLY
            </span>
          </div>

          {/* Chart area — gridlines + labeled bars (proportional to peak) */}
          <div className="relative pt-5 pb-1 px-1">
            <div className="absolute inset-x-0 top-0 bottom-6 pointer-events-none">
              {[0, 25, 50, 75, 100].map((p) => (
                <div
                  key={p}
                  className="absolute left-0 right-0 border-t border-dashed border-slate-100"
                  style={{ top: `${p}%` }}
                />
              ))}
            </div>

            <div className="relative h-44 flex items-end justify-between gap-2.5">
              {weeklyTrend.map((d) => {
                const isPeak = d.count > 0 && d.count === peakWeek;
                return (
                  <div
                    key={d.label}
                    className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                  >
                    <div className="relative flex-1 w-full flex flex-col items-center justify-end gap-1">
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-navy-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap text-center">
                          {d.label} — {d.count} activations
                        </div>
                        <div className="w-2 h-2 rotate-45 bg-navy-900 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                      </div>
                      <span className="text-[10px] font-mono text-muted font-bold">{d.count}</span>
                      <div
                        className="w-full rounded-t-lg transition-all group-hover:opacity-80"
                        style={{
                          height: `${Math.max((d.count / peakWeek) * 100, 4)}%`,
                          background: isPeak
                            ? 'linear-gradient(180deg, #8b5cf6, #5b21b6)'
                            : 'linear-gradient(180deg, #c4b5fd, #7c3aed)',
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-muted font-bold">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer — trend summary */}
          <div className="flex flex-col items-start gap-1.5 pt-2 border-t border-line text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              {delta > 0
                ? `Trending up by ${delta} activation${delta === 1 ? '' : 's'} this week`
                : delta < 0
                  ? `Trending down by ${Math.abs(delta)} this week`
                  : totalRecorded > 0
                    ? 'Steady this week'
                    : 'No activations yet'}
              {delta > 0 && <TrendingUp className="h-3.5 w-3.5 text-success" />}
            </div>
            <p className="text-[11px] text-muted leading-tight">
              {totalRecorded > 0
                ? `Showing ${totalRecorded} emergency activation${totalRecorded === 1 ? '' : 's'} over the last 7 weeks`
                : 'Waiting for the next emergency alert — counts populate live from actual activations'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
