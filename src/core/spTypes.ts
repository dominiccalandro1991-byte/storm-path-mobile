/**
 * Storm-Path mobile — locked type contracts.
 * Mathematical identity with Layer 1 web architecture lock.
 * Do not rename exported symbols.
 */

export const SP_STATE_KEYS = [
  'normal',
  'caution',
  'danger',
  'stop',
  'safe',
  'offline',
] as const;
export type SpStateKey = (typeof SP_STATE_KEYS)[number];

export const SP_VALID_SCREENS = ['driver', 'map', 'weather', 'settings'] as const;
export type SpScreenName = (typeof SP_VALID_SCREENS)[number];

export const SP_SOURCE_KEYS = [
  'NOAA',
  'NWS',
  'DOT',
  'EMERG MGMT',
  'ROAD CLOSURES',
  'SHELTERS',
] as const;
export type SpSourceKey = (typeof SP_SOURCE_KEYS)[number];
export type SpSourceStatus = 'connected' | 'prototype' | 'unavailable';
export type SpSourceMap = Record<SpSourceKey, SpSourceStatus>;

export const SP_LIVE_SOURCE_KEYS = ['NOAA', 'NWS'] as const;
export type SpLiveSourceKey = (typeof SP_LIVE_SOURCE_KEYS)[number];

export const SP_CONFIDENCE_STATES = [
  'high',
  'medium',
  'low',
  'conflicting',
  'stale',
  'unknown',
] as const;
export type SpConfLevel = (typeof SP_CONFIDENCE_STATES)[number];

export const SP_THRESHOLDS = {
  high: { min: 90, max: 100, label: 'HIGH' },
  medium: { min: 70, max: 89, label: 'MEDIUM' },
  low: { min: 0, max: 69, label: 'LOW' },
} as const;

export const SP_ALERT_STATE_RANK = {
  normal: 0,
  caution: 1,
  danger: 2,
  stop: 3,
} as const;
export type SpAlertDerivedState = keyof typeof SP_ALERT_STATE_RANK;

export type SpStateRecord = {
  label: string;
  icon: string;
  action: string;
  reason: string;
  fallback: string;
  showPlaceholder: boolean;
  confLevel: SpConfLevel;
  confLevelLabel: string;
  confPercent: number | null;
  sources: SpSourceMap;
  conflictFlag?: boolean;
  staleFlag?: boolean;
};

export type SpValidatedConfidence = {
  confLevel: SpConfLevel;
  confLevelLabel: string;
  confPercent: number | null;
  sources: SpSourceMap;
  valid: boolean;
};

export type SpCoords = {
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
};

export type SpNwsHourlyChips = {
  temperature: string;
  wind: string;
  humidity: string;
};

export type SpNwsAlert = {
  event: string;
  severity: string;
  urgency: string;
};

export const SP_LS_SCHEMA = {
  'sp.recents.v1': 'array',
  'sp.saved.v1': 'object',
  'sp.intel.v1': 'array',
  'sp.vehicle.v1': 'string',
  'sp.plans.v1': 'array',
  'sp.settings.v1': 'object',
} as const;
export type SpLsKey = keyof typeof SP_LS_SCHEMA;

export const SP_WEATHER_REFRESH_OK_MS = 5 * 60 * 1000;
export const SP_NWS_ABORT_MS = 12_000;
export const SP_RADAR_SPAN_DEG = 2.5;
export const SP_RADAR_SIZE_PX = 512;

/** Map-view default only. Never a legal NWS / NOAA trigger. */
export const SP_MAP_VIEW_DEFAULT = {
  latitude: 37.7645,
  longitude: -89.3351,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
} as const;
export const SP_VIEW_ONLY_LABEL = 'Murphysboro, IL';

export const SP_NWS_ORIGIN = 'https://api.weather.gov/';
export const SP_NWS_USER_AGENT =
  'StormPath/1.0.0 (weather safety navigation; dominic.calandro1991@yahoo.com)';
export const SP_RADAR_WMS_BASE =
  'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows';

export const SP_APP_VERSION = '1.0.0';

export function spIsPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function spIsFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isSpStateKey(value: unknown): value is SpStateKey {
  return typeof value === 'string' && (SP_STATE_KEYS as readonly string[]).includes(value);
}

export function isSpScreenName(value: unknown): value is SpScreenName {
  return typeof value === 'string' && (SP_VALID_SCREENS as readonly string[]).includes(value);
}
