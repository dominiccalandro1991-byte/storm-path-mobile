/**
 * Frozen six-key driver table + startup fallback.
 * Static source maps stay prototype / unavailable. Never boot as connected.
 */

import type { SpSourceMap, SpStateKey, SpStateRecord } from './spTypes';

const STATIC_SOURCES: SpSourceMap = {
  NOAA: 'prototype',
  NWS: 'prototype',
  DOT: 'prototype',
  'EMERG MGMT': 'prototype',
  'ROAD CLOSURES': 'prototype',
  SHELTERS: 'prototype',
};

export const SP_STATES: Readonly<Record<SpStateKey, SpStateRecord>> = Object.freeze({
  normal: Object.freeze({
    label: 'NORMAL',
    icon: 'N',
    action: 'CONTINUE ROUTE',
    reason: 'No active high-rank weather alert at the live fix.',
    fallback: 'Hold current heading. Recheck when sources drop.',
    showPlaceholder: false,
    confLevel: 'unknown',
    confLevelLabel: 'UNKNOWN',
    confPercent: null,
    sources: { ...STATIC_SOURCES },
  }),
  caution: Object.freeze({
    label: 'CAUTION',
    icon: 'C',
    action: 'REDUCE SPEED',
    reason: 'Active advisory-class weather alert at the live fix.',
    fallback: 'Slow down and increase following distance.',
    showPlaceholder: false,
    confLevel: 'low',
    confLevelLabel: 'LOW',
    confPercent: 0,
    sources: { ...STATIC_SOURCES },
  }),
  danger: Object.freeze({
    label: 'DANGER',
    icon: 'D',
    action: 'TAKE STORM REROUTE',
    reason: 'Tornado warning or Extreme severity at the live fix.',
    fallback: 'Leave the exposed corridor if a safe alternate exists.',
    showPlaceholder: false,
    confLevel: 'low',
    confLevelLabel: 'LOW',
    confPercent: 0,
    sources: { ...STATIC_SOURCES },
  }),
  stop: Object.freeze({
    label: 'STOP',
    icon: 'S',
    action: 'STOP NOW — REASSESS',
    reason: 'Immediate Extreme / tornado-warning condition.',
    fallback: 'Stop in a hardened location. Do not continue the route.',
    showPlaceholder: false,
    confLevel: 'low',
    confLevelLabel: 'LOW',
    confPercent: 0,
    sources: { ...STATIC_SOURCES },
  }),
  safe: Object.freeze({
    label: 'SAFE MODE',
    icon: 'SM',
    action: 'PROCEED WITH CAUTION',
    reason: 'GPS, NWS, or radar is not verified. Alert paint is blocked.',
    fallback: 'Treat the route as unverified until all three sources recover.',
    showPlaceholder: true,
    confLevel: 'unknown',
    confLevelLabel: 'UNKNOWN',
    confPercent: null,
    sources: { ...STATIC_SOURCES },
  }),
  offline: Object.freeze({
    label: 'OFFLINE MODE',
    icon: 'OF',
    action: 'USE CACHED ROUTE',
    reason: 'Device has no live weather path. Cached NWS rules are not stored.',
    fallback: 'Use last local plan only. Do not treat this as a live alert.',
    showPlaceholder: true,
    confLevel: 'unknown',
    confLevelLabel: 'UNKNOWN',
    confPercent: null,
    sources: { ...STATIC_SOURCES },
  }),
});

export const SP_STARTUP_SAFE_FALLBACK: Readonly<SpStateRecord> = Object.freeze({
  label: 'SAFE MODE',
  icon: 'SM',
  action: 'PROCEED WITH CAUTION',
  reason: 'Startup safety check failed. Exclusive fallback payload is in force.',
  fallback: 'Do not paint alert-derived states until checks pass.',
  showPlaceholder: true,
  confLevel: 'unknown',
  confLevelLabel: 'UNKNOWN',
  confPercent: null,
  sources: {
    NOAA: 'unavailable' as const,
    NWS: 'unavailable' as const,
    DOT: 'unavailable' as const,
    'EMERG MGMT': 'unavailable' as const,
    'ROAD CLOSURES': 'unavailable' as const,
    SHELTERS: 'unavailable' as const,
  },
});

export const SP_REQUIRED_STATE_FIELDS: ReadonlyArray<keyof SpStateRecord> = [
  'label',
  'icon',
  'action',
  'reason',
  'fallback',
  'showPlaceholder',
];
