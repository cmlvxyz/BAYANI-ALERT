import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
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

export const ResponderMapView: React.FC<ResponderMapViewProps> = ({
  activeIncident,
  incidents,
  responders,
  focusedIncident = null,
}) => {
  const [selectedPin, setSelectedPin] = useState<string | null>(activeIncident?.id || null);
  const [gps, setGps] = useState<ResolvedLocation | null>(null);
  const [forceMap, setForceMap] = useState(false);

  useEffect(() => {
    const cleanup = watchGeolocation(
      (loc) => setGps(loc),
      () => {},
    );
    return cleanup;
  }, []);

  const override = hardwareService.getLocationOverride();

  // The incident to inspect: explicitly opened incident, else the live one.
  const viewIncident = focusedIncident ?? activeIncident;
  const hasIncidentCoords =
    !!viewIncident &&
    typeof viewIncident.location?.lat === 'number' &&
    typeof viewIncident.location?.lng === 'number' &&
    (viewIncident.location.lat !== 0 || viewIncident.location.lng !== 0);

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            <span>TACTICAL DISPATCH MAP</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time GNSS tracking of active field units
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {viewIncident && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {viewIncident.incidentCode}
            </span>
          )}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {responders.length} Patrol Unit(s)
          </span>
        </div>
      </div>

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Google Map Canvas */}
        <div className="lg:col-span-3 relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 h-[480px] select-none">
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

          {/* Open in real Google Maps — overlay works in BOTH JS API and iframe modes */}
          <button
            onClick={openGoogleMaps}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wide shadow-lg hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 active:scale-95 transition-all"
            title="Open the real Google Maps at this location (Street View)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            OPEN IN GOOGLE MAPS
          </button>

          {/* Top overlays */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/60 shadow-lg text-white text-xs">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-[11px] font-bold">
                {mapLat.toFixed(4)}° N, {mapLng.toFixed(4)}° E
              </span>
              {!hasIncidentCoords && (override || gps) && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  override
                    ? 'bg-violet-500/30 text-violet-200'
                    : (gps?.source === 'ip' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/40 text-blue-200')
                }`}>
                  {override ? 'MANUAL — FIXED' : (gps?.source === 'ip' ? 'APPROX — IP' : 'GPS — LIVE')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {hasIncidentCoords && (
                <button
                  onClick={() => setForceMap((v) => !v)}
                  className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[11px] font-black uppercase tracking-wide backdrop-blur-md transition-all active:scale-95 shadow-lg ${
                    showStreetView
                      ? 'bg-slate-900/85 border-slate-600 text-white hover:bg-slate-800'
                      : 'bg-white/95 border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                  title={showStreetView ? 'Back to the normal map' : 'Zoom into Street View (exact location)'}
                >
                  <span className={`w-2 h-2 rounded-full ${showStreetView ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'}`} />
                  {showStreetView ? 'MAP VIEW' : 'STREET VIEW'}
                </button>
              )}
            </div>
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-3 left-3 z-10">
            <span className="bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] text-slate-300 border border-slate-800">
              {viewIncident && hasIncidentCoords
                ? `Tracking ${viewIncident.incidentCode}`
                : (override?.label || gps?.label || 'Monitoring field units')}
              {showStreetView ? ' • Street View' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};