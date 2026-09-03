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
  fileCheck('HUD_SETTINGS', 'hud', 3, 'src/screens/SettingsScreen.tsx', ['Speed units', 'AND-GATE']),
  fileCheck('HUD_SEARCH', 'hud', 4, 'src/ui/SearchSheet.tsx', ['Set destination', 'START DRIVE']),
  fileCheck('HUD_CHROME', 'hud', 3, 'src/ui/Chrome.tsx', ['STORMPATH', 'RADAR']),
  fileCheck('GPS_GATE', 'engine', 6, 'src/diagnostics/spHardwareLog.ts', ['SP_HW_IO_BEFORE_FINITE_FIX', 'First finite']),
  fileCheck('NWS_ORIGIN', 'engine', 4, 'src/net/spNWS.ts', ['https://api.weather.gov/', 'spNWSFetch']),
  fileCheck('RADAR_WMS', 'engine', 4, 'src/net/spRadar.ts', ['conus_bref_qcd', 'CRS:84']),
  fileCheck('GEOCODE_OSRM', 'hud', 3, 'src/net/spGeocode.ts', ['photon.komoot.io', 'router.project-osrm.org']),
  fileCheck('STORE_APP_JSON', 'store', 4, 'app.json', ['byte.dominiccalandro.stormpathmobile', 'NSLocationWhenInUseUsageDescription', '1.0.0']),
  fileCheck('STORE_EAS', 'store', 3, 'eas.json', ['production', 'app-bundle']),
  fileCheck('STORE_PRIVACY', 'store', 3, 'docs/privacy.html', ['Location', 'National Weather Service']),
  fileCheck('GITHUB_CI', 'github', 4, '.github/workflows/mobile-ci.yml', ['test:golden', 'test:vector']),
  fileCheck('GITHUB_PAGES', 'github', 3, '.github/workflows/pages.yml', ['deploy-pages', 'docs']),
  fileCheck('GITHUB_TEST_HUD', 'github', 4, 'docs/index.html', ['STORMPATH', 'spComputeNextState', 'api.weather.gov', '37.7645', 'get.geojs.io']),
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

const report = scoreVector(extra);
const text = formatVectorReport(report);
console.log(text);
fs.writeFileSync(path.join(root, 'vector-score.txt'), `${text}\n`);

if (!report.pass) {
  process.exit(1);
}
process.exit(0);
