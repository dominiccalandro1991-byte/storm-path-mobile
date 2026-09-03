import {
  SP_RADAR_SIZE_PX,
  SP_RADAR_SPAN_DEG,
  SP_RADAR_WMS_BASE,
  spIsFiniteNumber,
} from '../core/spTypes';
import { parseRainViewerIndex, SP_RAINVIEWER_INDEX, type SpRainViewerFrame } from '../core/spRadarTiles';
import { spHwAssertIo } from '../diagnostics/spHardwareLog';

export { SP_IEM_NEXRAD_TILE, SP_RAINVIEWER_INDEX, parseRainViewerIndex } from '../core/spRadarTiles';
export type { SpRainViewerFrame } from '../core/spRadarTiles';

export async function fetchRainViewerFrame(): Promise<SpRainViewerFrame | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(SP_RAINVIEWER_INDEX, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      return null;
    }
    return parseRainViewerIndex(await response.json());
  } catch {
    return null;
  }
}

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

/**
 * NOAA OpenGeo WMS GetMap. CRS:84 lon,lat axis order. Finite bbox required.
 */
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
    spHwAssertIo('RADAR', url);
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
  } catch (error) {
    if (error instanceof Error && error.message === 'SP_HW_IO_BEFORE_FINITE_FIX') {
      throw error;
    }
    return false;
  }
}
