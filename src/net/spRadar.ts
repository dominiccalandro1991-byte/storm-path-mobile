import {
  SP_RADAR_SIZE_PX,
  SP_RADAR_SPAN_DEG,
  SP_RADAR_WMS_BASE,
  spIsFiniteNumber,
} from '../core/spTypes';

export type RadarBounds = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

export function radarBoundsFromFix(lat: number, lon: number): RadarBounds | null {
  if (!spIsFiniteNumber(lat) || !spIsFiniteNumber(lon)) {
    return null;
  }
  const half = SP_RADAR_SPAN_DEG / 2;
  return {
    minLon: lon - half,
    minLat: lat - half,
    maxLon: lon + half,
    maxLat: lat + half,
  };
}

export function buildRadarWmsUrl(bounds: RadarBounds): string | null {
  const { minLon, minLat, maxLon, maxLat } = bounds;
  if (
    !spIsFiniteNumber(minLon) ||
    !spIsFiniteNumber(minLat) ||
    !spIsFiniteNumber(maxLon) ||
    !spIsFiniteNumber(maxLat)
  ) {
    return null;
  }
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  const q = new URLSearchParams({
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    layers: 'conus_bref_qcd',
    format: 'image/png',
    transparent: 'true',
    srs: 'CRS:84',
    bbox,
    width: String(SP_RADAR_SIZE_PX),
    height: String(SP_RADAR_SIZE_PX),
  });
  return `${SP_RADAR_WMS_BASE}?${q.toString()}`;
}

export async function probeRadarDecode(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      return false;
    }
    const type = response.headers.get('content-type') || '';
    if (!type.includes('image') && !type.includes('png') && !type.includes('octet-stream')) {
      const buf = await response.arrayBuffer();
      return buf.byteLength > 32;
    }
    const buf = await response.arrayBuffer();
    return buf.byteLength > 32;
  } catch {
    return false;
  }
}
