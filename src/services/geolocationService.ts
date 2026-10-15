/**
 * Bayani Alert - Geolocation Resolution Service
 *
 * Tries the browser's GPS first and reverse-geocodes the result (so the
 * real place name shows). If GPS is unavailable/denied, falls back to
 * IP-based geolocation tagged as approximate (city/region is often the ISP
 * hub, not the wearer's actual spot).
 */

export interface ResolvedLocation {
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  label?: string;
  source: 'gps' | 'ip';
}

async function ipFallback(): Promise<ResolvedLocation> {
  const res = await fetch('https://ipapi.co/json/');
  if (!res.ok) {
    throw new Error('IP geolocation request failed');
  }
  const data = await res.json();
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error('IP geolocation returned no coordinates');
  }
  const city = data.city || '';
  const region = data.region || '';
  return {
    lat: data.latitude,
    lng: data.longitude,
    city,
    region,
    country: data.country_name || 'Philippines',
    label: [city, region].filter(Boolean).join(', '),
    source: 'ip',
  };
}

/**
 * Reverse geocodes coordinates via OpenStreetMap Nominatim (free, no API key)
 * to recover the real place name. Best-effort: returns {} on any failure.
 */
async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<Pick<ResolvedLocation, 'city' | 'region' | 'country' | 'label'>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return {};
    }
    const data = await res.json();
    const a = data.address || {};
    const city = a.city || a.town || a.municipality || a.village || a.county || '';
    const region = a.state || a.province || a.region || '';
    const label = data.display_name
      ? String(data.display_name).split(',').slice(0, 3).join(',').trim()
      : [city, region].filter(Boolean).join(', ');
    return { city, region, country: a.country || 'Philippines', label };
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

export function resolveLocation(): Promise<ResolvedLocation> {
  const getGps = new Promise<ResolvedLocation>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' }),
      () => reject(new Error('GPS denied or unavailable')),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });

  return getGps
    .then(async (loc) => {
      const place = await reverseGeocode(loc.lat, loc.lng);
      return { ...loc, ...place };
    })
    .catch(() => ipFallback());
}

/**
 * Continuously tracks the browser GPS and keeps updating the caller, so the
 * map auto-corrects as soon as the user grants location permission. Falls
 * back to IP-based geolocation on error. Returns a cleanup function.
 */
export function watchGeolocation(
  onUpdate: (loc: ResolvedLocation) => void,
  onError: () => void,
): () => void {
  if (!('geolocation' in navigator)) {
    onError();
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const coords: ResolvedLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        source: 'gps',
      };
      onUpdate(coords);
      reverseGeocode(pos.coords.latitude, pos.coords.longitude).then((place) => {
        onUpdate({ ...coords, ...place });
      });
    },
    () => {
      ipFallback().then(onUpdate).catch(onError);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}