import { spIsPlainObject } from './spTypes';

export const SP_RAINVIEWER_INDEX = 'https://api.rainviewer.com/public/weather-maps.json';
export const SP_IEM_NEXRAD_TILE =
  'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png';
export const SP_NCEP_WMS_TILE =
  'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows';

export type SpRainViewerFrame = {
  host: string;
  path: string;
  time: number;
  tileUrl: string;
};

export function rainViewerTileTemplate(host: string, path: string): string {
  return `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;
}

export function parseRainViewerIndex(body: unknown): SpRainViewerFrame | null {
  if (!spIsPlainObject(body)) {
    return null;
  }
  const radar = body.radar;
  if (!spIsPlainObject(radar) || !Array.isArray(radar.past) || radar.past.length === 0) {
    return null;
  }
  const last = radar.past[radar.past.length - 1];
  if (!spIsPlainObject(last)) {
    return null;
  }
  const path = typeof last.path === 'string' ? last.path : '';
  const time = typeof last.time === 'number' ? last.time : 0;
  const host =
    typeof body.host === 'string' && body.host.startsWith('https://')
      ? body.host.replace(/\/$/, '')
      : 'https://tilecache.rainviewer.com';
  if (!path.startsWith('/v2/radar/')) {
    return null;
  }
  return { host, path, time, tileUrl: rainViewerTileTemplate(host, path) };
}
