import {
  SP_SOURCE_KEYS,
  type SpSourceKey,
  type SpSourceMap,
  type SpSourceStatus,
} from './spTypes';

const ALLOWED_STATUS: ReadonlySet<SpSourceStatus> = new Set([
  'connected',
  'prototype',
  'unavailable',
]);

function asStatus(value: unknown): SpSourceStatus | null {
  if (value === 'connected' || value === 'prototype' || value === 'unavailable') {
    return value;
  }
  return null;
}

/**
 * Sole source-map normalizer. Exact six keys. Unknown keys dropped.
 * Invalid values become unavailable.
 */
export function spNormalizeSourceStatuses(sources: unknown): SpSourceMap {
  const input = sources && typeof sources === 'object' ? (sources as Record<string, unknown>) : {};
  const out = {} as SpSourceMap;
  for (const key of SP_SOURCE_KEYS) {
    const parsed = asStatus(input[key]);
    out[key] = parsed === null ? 'unavailable' : parsed;
  }
  return out;
}

export function spSourceMapExactAndValid(sources: unknown): sources is SpSourceMap {
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) {
    return false;
  }
  const keys = Object.keys(sources as object);
  if (keys.length !== SP_SOURCE_KEYS.length) {
    return false;
  }
  for (const key of SP_SOURCE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(sources, key)) {
      return false;
    }
    const status = (sources as Record<string, unknown>)[key];
    if (!ALLOWED_STATUS.has(status as SpSourceStatus)) {
      return false;
    }
  }
  for (const key of keys) {
    if (!(SP_SOURCE_KEYS as readonly string[]).includes(key)) {
      return false;
    }
  }
  return true;
}

export function spAnySourceConnected(sources: SpSourceMap): boolean {
  return SP_SOURCE_KEYS.some((key: SpSourceKey) => sources[key] === 'connected');
}

export function spAllSourcesUnavailable(sources: SpSourceMap): boolean {
  return SP_SOURCE_KEYS.every((key: SpSourceKey) => sources[key] === 'unavailable');
}

export function spPromoteLiveSource(
  live: SpSourceMap,
  key: 'NOAA' | 'NWS',
  status: 'connected' | 'unavailable',
): SpSourceMap {
  return { ...live, [key]: status };
}

export function createInitialLiveSources(): SpSourceMap {
  return {
    NOAA: 'unavailable',
    NWS: 'unavailable',
    DOT: 'prototype',
    'EMERG MGMT': 'prototype',
    'ROAD CLOSURES': 'prototype',
    SHELTERS: 'prototype',
  };
}

export function spSourcesForState(staticMap: SpSourceMap, live: SpSourceMap): SpSourceMap {
  return {
    NOAA: live.NOAA === 'connected' || live.NOAA === 'unavailable' ? live.NOAA : staticMap.NOAA,
    NWS: live.NWS === 'connected' || live.NWS === 'unavailable' ? live.NWS : staticMap.NWS,
    DOT: staticMap.DOT,
    'EMERG MGMT': staticMap['EMERG MGMT'],
    'ROAD CLOSURES': staticMap['ROAD CLOSURES'],
    SHELTERS: staticMap.SHELTERS,
  };
}
