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
import { spPruneIntel, type SpIntelPin } from '../src/core/spVehicleIntel';
import { spCamNext, spCamShouldReroute } from '../src/core/spCamera';
import { parseRainViewerIndex } from '../src/core/spRadarTiles';
import { fromArcgisBody, fromCensusBody, spMergeGeoHits } from '../src/core/spGeoParse';

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
  fileCheck('HUD_MAP', 'hud', 5, 'src/screens/MapScreen.tsx', ['UrlTile', 'Polyline', 'minZoomLevel={2}', 'tile.openstreetmap.org', 'followCam']),
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
    ok:
      read('src/ui/MarkerSheet.tsx').indexOf('Choose a form') >= 0 &&
      read('src/core/spVehicleIntel.ts').indexOf('VORTEX') >= 0 &&
      read('src/screens/MapScreen.tsx').indexOf('MARKER') >= 0 &&
      exists('assets/vehicles/twister.png'),
    detail: 'native MarkerSheet + VORTEX packs + PNG',
  });
  extra.push({
    id: 'NATIVE_MAP_INTEL',
    vector: 'hud',
    weight: 6,
    ok:
      read('src/ui/IntelSheet.tsx').indexOf('DRIVER INTEL') >= 0 &&
      read('src/ui/IntelSheet.tsx').indexOf('POST INTEL') >= 0 &&
      read('src/screens/MapScreen.tsx').indexOf('REPORT') >= 0 &&
      exists('assets/intel/unit.png'),
    detail: 'native IntelSheet + REPORT dock + PNG',
  });
  extra.push({
    id: 'NATIVE_MAP_DOCK',
    vector: 'hud',
    weight: 3,
    ok:
      read('src/screens/MapScreen.tsx').indexOf('SET DESTINATION') >= 0 &&
      read('src/navigation/RootNavigator.tsx').indexOf('MarkerSheet') >= 0 &&
      read('src/navigation/RootNavigator.tsx').indexOf('IntelSheet') >= 0,
    detail: 'dock + sheets mounted',
  });
  extra.push({
    id: 'INTEL_TTL_PRUNE',
    vector: 'engine',
    weight: 3,
    ok: (() => {
      const sample = (ts: number): SpIntelPin => ({
        id: 'x',
        type: 'collision',
        subtype: 'major',
        label: 'COLLISION',
        note: '',
        color: '#ff3d3d',
        lat: 37.76,
        lon: -89.33,
        source: 'gps',
        ts,
      });
      const now = Date.now();
      return spPruneIntel([sample(now - 4 * 60 * 60 * 1000)], now).length === 0 && spPruneIntel([sample(now)], now).length === 1;
    })(),
    detail: '3h TTL drops expired pins',
  });
  extra.push({
    id: 'HUD_SEARCH_UNIQUE',
    vector: 'hud',
    weight: 4,
    ok:
      hud.indexOf('function uniquePlaces') >= 0 &&
      hud.indexOf('function formatPhoton') >= 0 &&
      hud.indexOf('START DRIVE') >= 0 &&
      hud.indexOf('housenumber') >= 0,
    detail: 'Photon street/city labels + dedupe + START DRIVE',
  });
  extra.push({
    id: 'HUD_LEAFLET_NOT_ON_DOCK',
    vector: 'hud',
    weight: 3,
    ok: hud.indexOf('.leaflet-control-attribution { display:none') >= 0 && hud.indexOf('under-banner') >= 0,
    detail: 'OSM credit not over dock; banner clears zoom',
  });
  extra.push({
    id: 'NATIVE_STORE_SHEET_API',
    vector: 'hud',
    weight: 4,
    ok:
      read('src/state/StormPathStore.tsx').indexOf('setMarkerOpen,') >= 0 &&
      read('src/state/StormPathStore.tsx').indexOf('postIntel,') >= 0 &&
      read('src/state/StormPathStore.tsx').indexOf('deleteIntel,') >= 0,
    detail: 'context exports sheet methods',
  });
  extra.push({
    id: 'CAM_POLICY_FOLLOW_PANS',
    vector: 'engine',
    weight: 6,
    ok:
      spCamNext('follow', { type: 'gps' }).action === 'pan' &&
      spCamNext('browse', { type: 'gps' }).action === 'none' &&
      spCamNext('follow', { type: 'user_gesture' }).mode === 'browse' &&
      spCamNext('browse', { type: 'start_drive' }).action === 'overview' &&
      spCamNext('browse', { type: 'recenter' }).mode === 'follow',
    detail: 'GPS pans in follow, never while browsing; drive overview; recenter',
  });
  extra.push({
    id: 'CAM_POLICY_REROUTE',
    vector: 'engine',
    weight: 3,
    ok: (() => {
      const t = 1_000_000;
      return !spCamShouldReroute(t, t + 1000, 10) && spCamShouldReroute(t, t + 31_000, 10) && spCamShouldReroute(t, t + 1000, 300);
    })(),
    detail: 'reroute only after 250m or 30s',
  });
  extra.push({
    id: 'HUD_CAM_NO_GPS_STEAL',
    vector: 'hud',
    weight: 8,
    ok:
      hud.indexOf("cam:{ mode:'follow'") >= 0 &&
      hud.indexOf('camFollowPan') >= 0 &&
      hud.indexOf('minZoom:2') >= 0 &&
      hud.indexOf('id="recenter"') >= 0 &&
      hud.indexOf('if (S.dest) await startDrive') < 0 &&
      hud.indexOf('map.setView([lat,lon], 14)') < 0,
    detail: 'GPS ticks pan only; startDrive not in onFix; world minZoom 2',
  });
  extra.push({
    id: 'NATIVE_CAM_UNCONTROLLED',
    vector: 'hud',
    weight: 5,
    ok:
      read('src/screens/MapScreen.tsx').indexOf('followCam') >= 0 &&
      read('src/screens/MapScreen.tsx').indexOf('minZoomLevel={2}') >= 0 &&
      read('src/screens/MapScreen.tsx').indexOf('onPanDrag') >= 0 &&
      read('src/screens/MapScreen.tsx').indexOf('region={region}') < 0,
    detail: 'native map is not a controlled region',
  });
  extra.push({
    id: 'RADAR_PARSE_RAINVIEWER',
    vector: 'engine',
    weight: 4,
    ok: (() => {
      const hit = parseRainViewerIndex({
        host: 'https://tilecache.rainviewer.com',
        radar: { past: [{ time: 1788471600, path: '/v2/radar/262b1d72e745' }] },
      });
      return (
        !!hit &&
        hit.tileUrl.indexOf('{z}/{x}/{y}') >= 0 &&
        hit.tileUrl.indexOf('/v2/radar/') >= 0 &&
        parseRainViewerIndex({}) === null
      );
    })(),
    detail: 'RainViewer index parser',
  });
  extra.push({
    id: 'HUD_RADAR_TILES',
    vector: 'hud',
    weight: 8,
    ok:
      hud.indexOf('api.rainviewer.com/public/weather-maps.json') >= 0 &&
      hud.indexOf('L.tileLayer') >= 0 &&
      hud.indexOf("half = 0.35") < 0 &&
      hud.indexOf('conus_bref_qcd') >= 0 &&
      hud.indexOf('under-banner') >= 0,
    detail: 'global radar tiles + NOAA fallback; banner does not cover zoom',
  });
  extra.push({
    id: 'GEO_CENSUS_ARCGIS_PARSE',
    vector: 'engine',
    weight: 6,
    ok: (() => {
      const census = fromCensusBody({
        result: { addressMatches: [{ matchedAddress: '1400 WALNUT ST, MURPHYSBORO, IL, 62966', coordinates: { x: -89.3382, y: 37.7644 } }] },
      });
      const arc = fromArcgisBody({
        candidates: [
          {
            score: 100,
            address: '1400 Walnut St, Murphysboro, Illinois, 62966',
            location: { x: -89.3383, y: 37.7645 },
            attributes: { Addr_type: 'PointAddress', Match_addr: '1400 Walnut St, Murphysboro, Illinois, 62966', City: 'Murphysboro', Region: 'Illinois' },
          },
        ],
      });
      const poi = fromArcgisBody({
        candidates: [
          {
            score: 100,
            address: 'Walgreens',
            location: { x: -89.3297, y: 37.7635 },
            attributes: {
              Addr_type: 'POI',
              Match_addr: 'Walgreens',
              PlaceName: 'Walgreens',
              StAddr: '503 Walnut St',
              Place_addr: '503 Walnut St, Murphysboro, Illinois, 62966',
              City: 'Murphysboro',
              Region: 'Illinois',
              Postal: '62966',
            },
          },
        ],
      });
      const merged = spMergeGeoHits([census, arc], 10);
      return (
        census.length === 1 &&
        arc.length === 1 &&
        merged.length === 1 &&
        census[0].rank === 0 &&
        poi.length === 1 &&
        poi[0].label === 'Walgreens' &&
        poi[0].sub.indexOf('503 Walnut St') >= 0
      );
    })(),
    detail: 'Census MAF + ArcGIS PointAddress parsers',
  });
  extra.push({
    id: 'HUD_US_ADDRESS_SEARCH',
    vector: 'hud',
    weight: 8,
    ok:
      hud.indexOf('geocode.arcgis.com') >= 0 &&
      hud.indexOf('nominatim.openstreetmap.org') >= 0 &&
      hud.indexOf('StAddr') >= 0 &&
      hud.indexOf('LongLabel') >= 0 &&
      hud.indexOf('photon.komoot.io') >= 0 &&
      hud.indexOf('camFollowPan') >= 0 &&
      hud.indexOf('api.rainviewer.com') >= 0,
    detail: 'HUD multi-geocoder without dropping camera/radar',
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
    runtimeProbe('RUNTIME_RAINVIEWER_INDEX', 6, 'https://api.rainviewer.com/public/weather-maps.json', '', 64),
    runtimeProbe(
      'RUNTIME_IEM_NEXRAD',
      4,
      'https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/5/7/11.png',
      '',
      64,
    ),
    runtimeProbe(
      'RUNTIME_ARCGIS_ADDR',
      6,
      'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&countryCode=USA&maxLocations=1&SingleLine=1400%20Walnut%20St%2C%20Murphysboro%2C%20IL',
      '',
      80,
    ),
    runtimeProbe(
      'RUNTIME_CENSUS_ADDR',
      6,
      'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=1400%20Walnut%20St%2C%20Murphysboro%2C%20IL%2062966&benchmark=Public_AR_Current&format=json',
      '',
      80,
    ),
  ]);
  extra.push(...probes);
  try {
    const idx = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const bytes = new Uint8Array(await idx.arrayBuffer());
    let text = '';
    for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
    const frame = parseRainViewerIndex(JSON.parse(text));
    if (frame) {
      const tile = frame.tileUrl.replace('{z}', '3').replace('{x}', '1').replace('{y}', '2');
      extra.push(await runtimeProbe('RUNTIME_RAINVIEWER_TILE', 8, tile, '', 64));
    } else {
      extra.push({ id: 'RUNTIME_RAINVIEWER_TILE', vector: 'github', weight: 8, ok: false, detail: 'index parse failed' });
    }
  } catch (err) {
    extra.push({
      id: 'RUNTIME_RAINVIEWER_TILE',
      vector: 'github',
      weight: 8,
      ok: false,
      detail: String(err && (err as { message?: string }).message ? (err as { message: string }).message : err),
    });
  }
  const report = scoreVector(extra);
  const text = formatVectorReport(report);
  console.log(text);
  fs.writeFileSync(path.join(root, 'vector-score.txt'), `${text}\n`);
  if (!report.pass) process.exit(1);
  process.exit(0);
}

void withRuntime();
