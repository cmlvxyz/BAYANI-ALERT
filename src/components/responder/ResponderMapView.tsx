import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation, ExternalLink, Layers, Radar, ChevronLeft } from 'lucide-react';
import { Incident, ResponderAgent } from '../../types';
import { LiveGoogleMap, FALLBACK_COORDS } from '../LiveGoogleMap';
import { watchGeolocation, ResolvedLocation } from '../../services/geolocationService';
import { hardwareService } from '../../services/hardwareService';

interface ResponderMapViewProps {
  activeIncident: Incident | null;
  incidents: Incident[];
  responders: ResponderAgent[];
  /** Incident explicitly opened via a "VIEW LOCATION" / "VIEW LIVE MAP" action. */
  focusedIncident?: Incident | null;
}

const hasCoords = (inc: Incident | null | undefined): boolean =>
  !!inc &&
  typeof inc.location?.lat === 'number' &&
  typeof inc.location?.lng === 'number' &&
  (inc.location.lat !== 0 || inc.location.lng !== 0);

export const ResponderMapView: React.FC<ResponderMapViewProps> = ({
  activeIncident,
  incidents,
  responders,
  focusedIncident = null,
}) => {
  const [gps, setGps] = useState<ResolvedLocation | null>(null);
  const [forceMap, setForceMap] = useState(false);
  // Selected pin id — starts on the incident that opened this view.
  const [selectedId, setSelectedId] = useState<string | null>(
    focusedIncident?.id ?? activeIncident?.id ?? null,
  );

  useEffect(() => {
    const cleanup = watchGeolocation(
      (loc) => setGps(loc),
      () => {},
    );
    return cleanup;
  }, []);

  // When a new incident is opened from another screen, follow it.
  useEffect(() => {
    if (focusedIncident?.id) setSelectedId(focusedIncident.id);
  }, [focusedIncident?.id]);

  const override = hardwareService.getLocationOverride();

  // Incidents that actually carry usable coordinates — the only ones we can pin.
  const pinnedIncidents = useMemo(() => incidents.filter(hasCoords), [incidents]);

  const selectedIncident =
    incidents.find((i) => i.id === selectedId) ??
    (hasCoords(focusedIncident) ? focusedIncident : null) ??
    (hasCoords(activeIncident) ? activeIncident : null);

  const viewIncident = selectedIncident;
  const hasIncidentCoords = hasCoords(viewIncident);

  // Focus the map on the incident's own GPS coordinates (dynamic — never hardcoded).
  const mapLat = hasIncidentCoords
    ? viewIncident!.location!.lat
    : (override?.lat ?? gps?.lat ?? FALLBACK_COORDS.lat);
  const mapLng = hasIncidentCoords
    ? viewIncident!.location!.lng
    : (override?.lng ?? gps?.lng ?? FALLBACK_COORDS.lng);

  // Open directly in Street View whenever we have the incident's coordinates.
  const showStreetView = hasIncidentCoords && !forceMap;
  const pano = viewIncident?.location.pano ?? override?.pano;
  const svHeading = viewIncident?.location.heading ?? override?.heading;
  const svPitch = viewIncident?.location.pitch ?? override?.pitch;

  // Open the REAL Google Maps (new tab) zoomed into location Street View.
  const openGoogleMaps = () => {
    const heading = hasIncidentCoords ? (viewIncident?.location.heading ?? 0) : 0;
    const pitch = hasIncidentCoords ? (viewIncident?.location.pitch ?? 0) : 0;
    const url = `https://www.google.com/maps?layer=c&cbll=${mapLat},${mapLng}&cbp=11,${heading},${pitch},0,0&z=17`;
    window.open(url, '_blank', 'noopener');
  };

  // Re-open in Street View whenever a different incident is selected.
  useEffect(() => {
    setForceMap(false);
  }, [viewIncident?.id]);

  const onDutyUnits = responders.filter((r) => r.status !== 'Off Duty');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-ink tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emergency" />
            <span>Tactical Dispatch Map</span>
          </h2>
          <p className="text-xs text-muted">
            Real-time GNSS tracking of active field incidents and responding units
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-line text-slate-600 font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emergency" />
            {pinnedIncidents.length} pinned
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-line text-slate-600 font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            {onDutyUnits.length} unit(s)
          </span>
        </div>
      </div>

      {/* Map + side panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Map canvas */}
        <div className="xl:col-span-3 relative rounded-panel overflow-hidden border border-line bg-slate-100 h-[420px] sm:h-[560px] select-none">
          <LiveGoogleMap
            lat={mapLat}
            lng={mapLng}
            zoom={16}
            streetView={showStreetView}
            pano={pano}
            heading={svHeading}
            pitch={svPitch}
            showMarker={hasIncidentCoords}
            markerTitle={viewIncident ? `Incident ${viewIncident.incidentCode}` : 'Alert location'}
            onMapClick={openGoogleMaps}
            className="absolute inset-0"
          />

          {/* Open in real Google Maps */}
          <button
            onClick={openGoogleMaps}
            className="rc-focus-ring absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-ctl bg-white/95 backdrop-blur-md border border-line text-slate-700 text-[11px] font-black uppercase tracking-wide shadow-lift hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 active:scale-95 transition-all"
            title="Open the real Google Maps at this location (Street View)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Google Maps
          </button>

          {/* Top overlays */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-2 bg-navy-900/90 backdrop-blur-md px-3 py-1.5 rounded-ctl border border-navy-700/60 shadow-lift text-white text-xs">
              <Navigation className="w-3.5 h-3.5 text-brand-300" />
              <span className="font-mono text-[11px] font-bold">
                {mapLat.toFixed(4)}° N, {mapLng.toFixed(4)}° E
              </span>
              {!hasIncidentCoords && (override || gps) && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  override
                    ? 'bg-brand-500/25 text-brand-200'
                    : (gps?.source === 'ip' ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/25 text-cyan-200')
                }`}>
                  {override ? 'MANUAL — FIXED' : (gps?.source === 'ip' ? 'APPROX — IP' : 'GPS — LIVE')}
                </span>
              )}
            </div>

            {hasIncidentCoords && (
              <button
                onClick={() => setForceMap((v) => !v)}
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-ctl border text-[11px] font-black uppercase tracking-wide backdrop-blur-md transition-all active:scale-95 shadow-lift ${
                  showStreetView
                    ? 'bg-navy-900/85 border-navy-600 text-white hover:bg-navy-800'
                    : 'bg-white/95 border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
                title={showStreetView ? 'Back to the normal map' : 'Zoom into Street View (exact location)'}
              >
                <span className={`w-2 h-2 rounded-full ${showStreetView ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
                {showStreetView ? 'Map View' : 'Street View'}
              </button>
            )}
          </div>

          {/* Bottom caption */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="bg-navy-900/80 backdrop-blur-sm px-2.5 py-1 rounded-ctl text-[10px] text-slate-300 border border-navy-800">
              {viewIncident && hasIncidentCoords
                ? `Tracking ${viewIncident.incidentCode}`
                : (override?.label || gps?.label || 'Monitoring field units')}
              {showStreetView ? ' • Street View' : ''}
            </span>
          </div>
        </div>

        {/* Side panel */}
        <div className="xl:col-span-1 space-y-4">
          {/* Selected incident card */}
          <section className="rc-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-ink text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                Selected Incident
              </h3>
              {selectedIncident && (
                <button
                  onClick={() => setSelectedId(null)}
                  className="rc-focus-ring text-[11px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
                  title="Return to the full incident list"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {viewIncident ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-ink">{viewIncident.incidentCode}</span>
                  {viewIncident.source && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {viewIncident.source === 'HARDWARE' ? 'WEARABLE' : 'APP'}
                    </span>
                  )}
                </div>
                <p className="font-bold text-ink">{viewIncident.userName?.trim() || 'Unknown Citizen'}</p>
                <p className="text-muted flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="truncate">
                    {viewIncident.location?.address || viewIncident.location?.barangay || 'Location unavailable'}
                  </span>
                </p>
                {hasIncidentCoords ? (
                  <p className="font-mono text-[10px] text-success">
                    {viewIncident.location.lat.toFixed(6)}°, {viewIncident.location.lng.toFixed(6)}°
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-600 font-bold">No GPS captured — showing city overview.</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted">
                No incident selected. Choose a pinned incident below to focus the map.
              </p>
            )}
          </section>

          {/* Incident markers list */}
          <section className="rc-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-line">
              <h3 className="font-black text-ink text-sm flex items-center gap-2">
                <Radar className="w-4 h-4 text-emergency" />
                Incident Markers
              </h3>
            </div>
            {pinnedIncidents.length === 0 ? (
              <p className="p-4 text-[11px] text-muted">
                No incidents with GPS coordinates yet.
              </p>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y divide-line">
                {pinnedIncidents.map((inc) => (
                  <li key={inc.id}>
                    <button
                      onClick={() => setSelectedId(inc.id)}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        selectedIncident?.id === inc.id ? 'bg-brand-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-black text-ink">{inc.incidentCode}</span>
                        <span className="text-[10px] font-bold text-muted uppercase">{inc.status}</span>
                      </div>
                      <p className="text-[11px] text-muted truncate">{inc.userName?.trim() || 'Unknown'}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Responding units — sectors/status only; coordinates are not fabricated. */}
          <section className="rc-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-line">
              <h3 className="font-black text-ink text-sm flex items-center gap-2">
                <Radar className="w-4 h-4 text-brand-600" />
                Field Units
              </h3>
            </div>
            {onDutyUnits.length === 0 ? (
              <p className="p-4 text-[11px] text-muted">No on-duty units reported.</p>
            ) : (
              <ul className="max-h-52 overflow-y-auto divide-y divide-line">
                {onDutyUnits.map((r) => (
                  <li key={r.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-ink truncate">{r.name}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        r.status === 'Available'
                          ? 'bg-emerald-50 text-success border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted truncate">{r.unit} · Sector {r.currentSector}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
