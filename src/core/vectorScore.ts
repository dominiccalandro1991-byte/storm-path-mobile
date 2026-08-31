/**
 * Dual-vector scoring for Storm Path store readiness.
 * Pure core — no React Native, Expo, Fastlane, or EAS imports.
 */
import { spClassifyAlert, spEvaluateAlertState } from './spAlerts';
import { spValidateConfidence } from './spConfidence';
import { runGoldenInvariantChecks } from './spGoldenChecks';
import { spComputeNextState } from './spRecompute';
import { switchScreenPure } from './spScreens';
import { spNormalizeSourceStatuses } from './spSources';
import { runStartupSafetyChecks } from './spStartup';
import { SP_STATES } from './spStates';
import {
  SP_APP_VERSION,
  SP_MAP_VIEW_DEFAULT,
  SP_SOURCE_KEYS,
  SP_STATE_KEYS,
  SP_VALID_SCREENS,
  SP_VIEW_ONLY_LABEL,
} from './spTypes';

export type VectorCheck = {
  id: string;
  vector: 'engine' | 'hud' | 'store' | 'github';
  weight: number;
  ok: boolean;
  detail: string;
};

export type VectorReport = {
  score: number;
  max: number;
  percent: number;
  pass: boolean;
  checks: VectorCheck[];
};

const PASS_PERCENT = 90;

function check(id: string, vector: VectorCheck['vector'], weight: number, ok: boolean, detail: string): VectorCheck {
  return { id, vector, weight, ok, detail };
}

export function runVectorEngineChecks(): VectorCheck[] {
  const golden = runGoldenInvariantChecks();
  const startup = runStartupSafetyChecks({ mapLayoutOk: true });
  const sixStates = SP_STATE_KEYS.every((key) => Boolean(SP_STATES[key]));
  const fourScreens = SP_VALID_SCREENS.length === 4;
  const sixSources = SP_SOURCE_KEYS.length === 6;
  const andSafe = spComputeNextState({
    spGPSAvailable: true,
    spWeatherOK: true,
    spRadarOK: false,
    spLastAlertState: 'stop',
  }) === 'safe';
  const andLive =
    spComputeNextState({
      spGPSAvailable: true,
      spWeatherOK: true,
      spRadarOK: true,
      spLastAlertState: 'danger',
    }) === 'danger';
  const protoBan = (() => {
    const v = spValidateConfidence({
      confLevel: 'high',
      confLevelLabel: 'HIGH',
      confPercent: 96,
      sources: SP_STATES.normal.sources,
    });
    return !v.valid && v.confLevel === 'unknown';
  })();
  const tornadoStop =
    spClassifyAlert({ event: 'Tornado Warning', severity: 'Extreme', urgency: 'Immediate' }) === 'stop';
  const emptyNormal = spEvaluateAlertState([]) === 'normal';
  const screenNoop = !switchScreenPure('map', 'radar').changed;
  const viewOnly =
    SP_MAP_VIEW_DEFAULT.latitude === 37.7645 &&
    SP_MAP_VIEW_DEFAULT.longitude === -89.3351 &&
    SP_VIEW_ONLY_LABEL === 'Murphysboro, IL';
  const version = SP_APP_VERSION === '1.0.0';
  const normalized = spNormalizeSourceStatuses({ NOAA: 'connected', extra: 'connected' });
  const exactKeys = SP_SOURCE_KEYS.every((k) => k in normalized) && Object.keys(normalized).length === 6;

  return [
    check('GOLDEN_INVARIANTS', 'engine', 12, golden.length === 0, golden.length ? golden.join(',') : 'all hold'),
    check('STARTUP_SAFE_ON_LAYOUT', 'engine', 4, startup.ok, startup.ok ? 'map layout + schema pass' : startup.codes.join(',')),
    check('SIX_STATES', 'engine', 6, sixStates, sixStates ? 'normal/caution/danger/stop/safe/offline' : 'missing state'),
    check('FOUR_SCREENS', 'engine', 4, fourScreens, fourScreens ? 'driver/map/weather/settings' : 'screen drift'),
    check('SIX_SOURCES', 'engine', 4, sixSources && exactKeys, 'NOAA NWS DOT EMERG ROAD SHELTERS'),
    check('AND_GATE_SAFE', 'engine', 10, andSafe, 'radar fail forces safe even on stop'),
    check('AND_GATE_LIVE', 'engine', 8, andLive, 'three-source live preserves lastAlert'),
    check('PROTOTYPE_BAN', 'engine', 8, protoBan, 'prototype sources cannot validate HIGH'),
    check('TORNADO_STOP', 'engine', 6, tornadoStop && emptyNormal, 'classifier + empty-alert normal'),
    check('SCREEN_NOOP', 'engine', 3, screenNoop, 'invalid screen is a no-op'),
    check('VIEW_DEFAULT_MURPHYSBORO', 'engine', 5, viewOnly, 'map-view default is Murphysboro, not a live I/O trigger'),
    check('APP_VERSION_1_0_0', 'store', 4, version, SP_APP_VERSION),
  ];
}

export function scoreVector(extra: VectorCheck[] = []): VectorReport {
  const checks = [...runVectorEngineChecks(), ...extra];
  const max = checks.reduce((sum, c) => sum + c.weight, 0);
  const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  const percent = max === 0 ? 0 : Math.round((score / max) * 1000) / 10;
  return {
    score,
    max,
    percent,
    pass: percent >= PASS_PERCENT,
    checks,
  };
}

export function formatVectorReport(report: VectorReport): string {
  const lines = [
    `SP_VECTOR_SCORE ${report.score}/${report.max} ${report.percent}% ${report.pass ? 'PASS' : 'FAIL'}`,
  ];
  for (const c of report.checks) {
    lines.push(`${c.ok ? 'PASS' : 'FAIL'}  ${c.vector.padEnd(7)} +${c.weight}  ${c.id}  ${c.detail}`);
  }
  return lines.join('\n');
}
