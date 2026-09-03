/**
 * Headless vector-score runner.
 * Engine checks are pure. File/HUD/store/github checks use fs.
 */
declare const process: {
  exit(code: number): never;
  cwd(): string;
};
declare function require(name: string): {
  existsSync(path: string): boolean;
  readFileSync(path: string, enc: string): string;
  writeFileSync(path: string, data: string): void;
  join(...parts: string[]): string;
};
declare function fetch(
  url: string,
  init?: { headers?: { [k: string]: string } },
): Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;

import { formatVectorReport, scoreVector, type VectorCheck } from '../src/core/vectorScore';

const fs = require('fs');
const path = require('path');
const root = process.cwd();

function exists(rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function read(rel: string): string {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';
}

function fileCheck(id: string, vector: VectorCheck['vector'], weight: number, rel: string, mustInclude?: string[]): VectorCheck {
  const body = read(rel);
  const present = body.length > 0;
  const missing = (mustInclude ?? []).filter((needle) => body.indexOf(needle) < 0);
  const ok = present && missing.length === 0;
  return {
    id,
    vector,
    weight,
    ok,
    detail: !present ? `missing ${rel}` : missing.length ? `missing ${missing.join(',')}` : rel,
  };
}

const extra: VectorCheck[] = [
  fileCheck('HUD_DRIVER', 'hud', 5, 'src/screens/DriverScreen.tsx', ['TIME TO ARRIVE', 'START DRIVE', 'CONFIDENCE']),
  fileCheck('HUD_MAP', 'hud', 5, 'src/screens/MapScreen.tsx', ['UrlTile', 'Polyline', 'Overlay', 'tile.openstreetmap.org', 'Murphysboro']),
  fileCheck('HUD_WEATHER', 'hud', 4, 'src/screens/WeatherScreen.tsx', ['LIVE NWS ALERTS', 'RADAR']),
  fileCheck('HUD_SETTINGS', 'hud', 3, 'src/screens/SettingsScreen.tsx', ['Speed units', 'AND-GATE', 'OpenStreetMap']),
  fileCheck('HUD_SEARCH', 'hud', 4, 'src/ui/SearchSheet.tsx', ['Set destination', 'START DRIVE']),
  fileCheck('HUD_CHROME', 'hud', 3, 'src/ui/Chrome.tsx', ['STORMPATH', 'RADAR', 'VIEW · MURPHYSBORO']),
  fileCheck('GPS_GATE', 'engine', 6, 'src/diagnostics/spHardwareLog.ts', ['SP_HW_IO_BEFORE_FINITE_FIX', 'First finite']),
  fileCheck('NWS_ORIGIN', 'engine', 4, 'src/net/spNWS.ts', ['https://api.weather.gov/', 'spNWSFetch']),
  fileCheck('RADAR_WMS', 'engine', 4, 'src/net/spRadar.ts', ['conus_bref_qcd', 'CRS:84']),
  fileCheck('GEOCODE_OSRM', 'hud', 3, 'src/net/spGeocode.ts', ['photon.komoot.io', 'router.project-osrm.org']),
  fileCheck('STORE_APP_JSON', 'store', 4, 'app.json', ['byte.dominiccalandro.stormpathmobile', 'NSLocationWhenInUseUsageDescription', '1.0.0']),
  fileCheck('STORE_EAS', 'store', 3, 'eas.json', ['production', 'app-bundle']),
  fileCheck('STORE_PRIVACY', 'store', 3, 'docs/privacy.html', ['Location', 'National Weather Service']),
  fileCheck('GITHUB_CI', 'github', 4, '.github/workflows/mobile-ci.yml', ['test:golden', 'test:vector']),
  fileCheck('GITHUB_PAGES', 'github', 3, '.github/workflows/pages.yml', ['deploy-pages', 'docs']),
  fileCheck('GITHUB_TEST_HUD', 'github', 4, 'docs/index.html', ['STORMPATH', 'spComputeNextState', 'api.weather.gov', '37.7645', 'get.geojs.io', 'applyView', '100dvh', 'VIEW · MURPHYSBORO']),
  fileCheck('ISOLATION_NO_WEB_HTML', 'github', 3, 'package.json', ['storm-path-mobile']),
];

if (exists('StormpathV1_3_5.html') || exists('index.html')) {
  extra.push({
    id: 'ISOLATION_WEB_BLOB',
    vector: 'github',
    weight: 5,
    ok: false,
    detail: 'web blob present in mobile tree',
  });
} else {
  extra.push({
    id: 'ISOLATION_WEB_BLOB',
    vector: 'github',
    weight: 5,
    ok: true,
    detail: 'no StormpathV1_3_5.html / index.html',
  });
}

extra.push({
  id: 'ICON_ASSETS',
  vector: 'store',
  weight: 3,
  ok: exists('assets/icon.png') && exists('assets/splash-icon.png') && exists('assets/android-icon-foreground.png'),
  detail: 'icon + splash + adaptive',
});

{
  const hud = read('docs/index.html');
  const tryNet = hud.slice(hud.indexOf('function tryNetwork'), hud.indexOf('document.getElementById(\'gpsGate\')'));
  extra.push({
    id: 'HUD_GPS_NOT_FROM_IP',
    vector: 'engine',
    weight: 8,
    ok: hud.indexOf("applyView(lat, lon, 'network')") >= 0 && tryNet.indexOf('onFix(') < 0,
    detail: 'geojs IP is VIEW; only geolocation sets S.gps',
  });
  extra.push({
    id: 'HUD_VIEW_MAP_FILL',
    vector: 'hud',
    weight: 4,
    ok: hud.indexOf('100dvh') >= 0 && hud.indexOf('invalidateSize') >= 0 && hud.indexOf('gps-gate') >= 0,
    detail: 'docs/index.html iPhone map fill + GPS gate',
  });
  extra.push({
    id: 'HUD_PAGES_MARKER',
    vector: 'hud',
    weight: 6,
    ok:
      hud.indexOf('Choose a form') >= 0 &&
      hud.indexOf('vehicles/twister.png') >= 0 &&
      hud.indexOf('sp.vehicle.v1') >= 0 &&
      exists('docs/vehicles/twister.png') &&
      exists('docs/vehicles/blaze.png'),
    detail: 'MARKER packs + vehicle PNGs',
  });
  extra.push({
    id: 'HUD_PAGES_INTEL',
    vector: 'hud',
    weight: 6,
    ok:
      hud.indexOf('DRIVER INTEL') >= 0 &&
      hud.indexOf('POST INTEL') >= 0 &&
      hud.indexOf('sp.intel.v1') >= 0 &&
      exists('docs/intel/unit.png') &&
      exists('docs/intel/collision.png'),
    detail: 'REPORT sheet + intel PNGs + 3h TTL store',
  });
  extra.push({
    id: 'HUD_PAGES_NWS_CARDS',
    vector: 'hud',
    weight: 4,
    ok: hud.indexOf('NWS ALERTS') >= 0 && hud.indexOf('headline') >= 0 && hud.indexOf('api.weather.gov/alerts/active') >= 0,
    detail: 'NWS headline cards from alerts/active',
  });
  extra.push({
    id: 'HUD_SIX_SOURCE_CHIPS',
    vector: 'hud',
    weight: 3,
    ok: hud.indexOf('DOT') >= 0 && hud.indexOf('EMERG MGMT') >= 0 && hud.indexOf('SHELTERS') >= 0,
    detail: 'NOAA NWS DOT EMERG ROAD SHELTERS chips',
  });
  extra.push({
    id: 'NATIVE_MAP_MARKER',
    vector: 'hud',
    weight: 6,
    ok: read('src/screens/MapScreen.tsx').indexOf('VORTEX') >= 0 || read('src/screens/MapScreen.tsx').indexOf('Choose a form') >= 0,
    detail: 'native MapScreen marker packs',
  });
  extra.push({
    id: 'NATIVE_MAP_INTEL',
    vector: 'hud',
    weight: 6,
    ok: read('src/screens/MapScreen.tsx').indexOf('POST INTEL') >= 0 || read('src/screens/MapScreen.tsx').indexOf('DRIVER INTEL') >= 0,
    detail: 'native MapScreen driver intel board',
  });
  extra.push({
    id: 'README_ORG_URL',
    vector: 'github',
    weight: 3,
    ok: read('README.md').indexOf('voltcore-org.github.io/storm-path-mobile') >= 0,
    detail: 'org Pages URL',
  });
}

function runtimeProbe(id: string, weight: number, url: string, ua: string, minBytes: number): Promise<VectorCheck> {
  return fetch(url, { headers: ua ? { 'User-Agent': ua, Accept: 'application/geo+json' } : {} })
    .then(async (r) => {
      const buf = new Uint8Array(await r.arrayBuffer());
      const ok = r.ok && buf.byteLength >= minBytes;
      return { id, vector: 'github' as const, weight, ok, detail: `HTTP ${r.status} bytes ${buf.byteLength}` };
    })
    .catch((err) => ({ id, vector: 'github' as const, weight, ok: false, detail: String(err && err.message ? err.message : err) }));
}

async function withRuntime(): Promise<void> {
  const ua = 'StormPath-Mobile/1.0.0 (https://github.com/voltcore-org/storm-path-mobile; dominic.calandro1991@yahoo.com)';
  const probes = await Promise.all([
    runtimeProbe('RUNTIME_NWS_POINTS', 10, 'https://api.weather.gov/points/37.7645,-89.3351', ua, 32),
    runtimeProbe(
      'RUNTIME_NOAA_WMS',
      8,
      'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.1.1&request=GetMap&layers=conus_bref_qcd&format=image/png&transparent=true&srs=CRS:84&bbox=-90,37,-88,39&width=64&height=64',
      '',
      32,
    ),
    runtimeProbe('RUNTIME_OSM_TILE', 6, 'https://tile.openstreetmap.org/13/2075/3104.png', 'StormPath-Mobile/1.0.0', 32),
    runtimeProbe('RUNTIME_PAGES_HUD', 8, 'https://voltcore-org.github.io/storm-path-mobile/', 'StormPath-Mobile/1.0.0', 10000),
    runtimeProbe('RUNTIME_VEH_PNG', 4, 'https://voltcore-org.github.io/storm-path-mobile/vehicles/twister.png', 'StormPath-Mobile/1.0.0', 1024),
    runtimeProbe('RUNTIME_INTEL_PNG', 4, 'https://voltcore-org.github.io/storm-path-mobile/intel/unit.png', 'StormPath-Mobile/1.0.0', 1024),
  ]);
  extra.push(...probes);
  const report = scoreVector(extra);
  const text = formatVectorReport(report);
  console.log(text);
  fs.writeFileSync(path.join(root, 'vector-score.txt'), `${text}\n`);
  if (!report.pass) process.exit(1);
  process.exit(0);
}

void withRuntime();
