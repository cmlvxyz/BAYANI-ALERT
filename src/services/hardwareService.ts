/**
 * Bayani Alert - Hardware & Hardware Simulation Service
 * 
 * Simulates and interfaces with the physical discreet wearable emergency device
 * worn on the user's thigh.
 * 
 * Future API: Real BLE / GSM / MQTT WebSockets from hardware gateway
 */

export interface WearableDeviceTelemetry {
  deviceId: string;
  event: 'IDLE' | 'SOS';
  latitude: number;
  longitude: number;
  locationName: string;
  barangay: string;
  city: string;
  battery: number;
  timestamp: string;
  audioStatus: 'ready' | 'recording' | 'stored';
  gsmSignal: 'Strong' | 'Moderate' | 'Weak' | 'Offline';
  gpsFix: 'Locked' | 'Searching' | 'Acquired';
  bleConnected: boolean;
  stealthMode: boolean;
}

export const DEFAULT_WEARABLE_STATE: WearableDeviceTelemetry = {
  deviceId: 'BA-001',
  event: 'IDLE',
  latitude: 0,
  longitude: 0,
  locationName: '',
  barangay: '',
  city: '',
  battery: 82,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  audioStatus: 'ready',
  gsmSignal: 'Strong',
  gpsFix: 'Locked',
  bleConnected: true,
  stealthMode: false,
};

type HardwareListener = (telemetry: WearableDeviceTelemetry) => void;

export interface LocationOverride {
  lat: number;
  lng: number;
  label: string;
  city: string;
  barangay: string;
  address: string;
  /** Optional exact Google Street View panorama id + view orientation. */
  pano?: string;
  heading?: number;
  pitch?: number;
}

/** Quick-set presets (prototype stand-ins for real GPS/venue location). */
export const BALANGA_LOCATION: LocationOverride = {
  lat: 14.6781,
  lng: 120.5439,
  label: 'Balanga City',
  city: 'Balanga City',
  barangay: 'Bataan',
  address: 'Balanga City, Bataan',
};

class HardwareService {
  private telemetry: WearableDeviceTelemetry = { ...DEFAULT_WEARABLE_STATE };
  private listeners: HardwareListener[] = [];
  private override: LocationOverride | null = null;

  public getTelemetry(): WearableDeviceTelemetry {
    return { ...this.telemetry };
  }

  public getLocationOverride(): LocationOverride | null {
    return this.override ? { ...this.override } : null;
  }

  /**
   * Manually pins the wearer's location (prototype stand-in for accurate GPS).
   * Very useful when browser GPS/IP detection is wrong or unavailable.
   */
  public setLocationOverride(override: LocationOverride | null) {
    this.override = override;
    if (override) {
      this.telemetry = {
        ...this.telemetry,
        latitude: override.lat,
        longitude: override.lng,
        locationName: override.label,
        barangay: override.barangay,
        city: override.city,
      };
    }
    this.notify();
  }

  public subscribe(listener: HardwareListener): () => void {
    this.listeners.push(listener);
    listener(this.telemetry);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.telemetry });
    }
  }

  /**
   * Simulates the physical hidden squeeze trigger on the wearable thigh-band.
   * In production, this will receive an incoming GSM/MQTT webhook: POST /api/sos
   * Optionally accepts the wearer's resolved location so the SOS is pinned
   * to the real spot (browser GPS, or IP-based fallback).
   */
  public simulateHardwareSOS(coords?: {
    lat: number;
    lng: number;
    label?: string;
    city?: string;
    region?: string;
  }): WearableDeviceTelemetry {
    this.telemetry = {
      ...this.telemetry,
      event: 'SOS',
      latitude: coords ? coords.lat : (this.override ? this.override.lat : this.telemetry.latitude),
      longitude: coords ? coords.lng : (this.override ? this.override.lng : this.telemetry.longitude),
      locationName: coords?.label ?? (this.override?.label ?? this.telemetry.locationName),
      barangay: coords?.region ?? (this.override?.barangay ?? this.telemetry.barangay),
      city: coords?.city ?? (this.override?.city ?? this.telemetry.city),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audioStatus: 'recording',
      gpsFix: 'Acquired',
    };
    this.notify();
    return { ...this.telemetry };
  }

  /**
   * Resets the hardware emergency state back to IDLE
   */
  public resetHardware(): WearableDeviceTelemetry {
    this.telemetry = {
      ...this.telemetry,
      event: 'IDLE',
      audioStatus: 'ready',
    };
    this.notify();
    return { ...this.telemetry };
  }

  public setStealthMode(enabled: boolean) {
    this.telemetry = {
      ...this.telemetry,
      stealthMode: enabled,
    };
    this.notify();
  }
}

export const hardwareService = new HardwareService();
