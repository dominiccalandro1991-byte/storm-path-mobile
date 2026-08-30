import {
  SP_CONFIDENCE_STATES,
  SP_THRESHOLDS,
  type SpConfLevel,
  type SpSourceMap,
  type SpValidatedConfidence,
} from './spTypes';
import {
  spAllSourcesUnavailable,
  spAnySourceConnected,
  spNormalizeSourceStatuses,
  spSourceMapExactAndValid,
} from './spSources';

const UNKNOWN: SpValidatedConfidence = {
  confLevel: 'unknown',
  confLevelLabel: 'UNKNOWN',
  confPercent: null,
  sources: spNormalizeSourceStatuses(null),
  valid: false,
};

function isConfLevel(value: unknown): value is SpConfLevel {
  return typeof value === 'string' && (SP_CONFIDENCE_STATES as readonly string[]).includes(value);
}

function tierForPercent(percent: number): 'high' | 'medium' | 'low' | null {
  if (percent >= SP_THRESHOLDS.high.min && percent <= SP_THRESHOLDS.high.max) {
    return 'high';
  }
  if (percent >= SP_THRESHOLDS.medium.min && percent <= SP_THRESHOLDS.medium.max) {
    return 'medium';
  }
  if (percent >= SP_THRESHOLDS.low.min && percent <= SP_THRESHOLDS.low.max) {
    return 'low';
  }
  return null;
}

/**
 * Sole confidence normalizer. Invalid input collapses to UNKNOWN.
 * Precedence matches Layer 1 §4.3 exactly.
 */
export function spValidateConfidence(stateData: unknown): SpValidatedConfidence {
  if (!stateData || typeof stateData !== 'object') {
    return { ...UNKNOWN };
  }
  const data = stateData as Record<string, unknown>;

  if (!isConfLevel(data.confLevel)) {
    return { ...UNKNOWN };
  }
  const level = data.confLevel;
  const expectedLabel = level.toUpperCase();
  if (data.confLevelLabel !== expectedLabel) {
    return { ...UNKNOWN };
  }
  if (!Object.prototype.hasOwnProperty.call(data, 'confPercent')) {
    return { ...UNKNOWN };
  }

  if (!spSourceMapExactAndValid(data.sources)) {
    return { ...UNKNOWN };
  }
  const sources: SpSourceMap = data.sources;

  if (spAllSourcesUnavailable(sources)) {
    return { ...UNKNOWN, sources };
  }

  if (level === 'conflicting') {
    if (data.conflictFlag !== true || data.confPercent !== null) {
      return { ...UNKNOWN, sources };
    }
    return {
      confLevel: 'conflicting',
      confLevelLabel: 'CONFLICTING',
      confPercent: null,
      sources,
      valid: true,
    };
  }

  if (level === 'stale') {
    if (data.staleFlag !== true || data.confPercent !== null) {
      return { ...UNKNOWN, sources };
    }
    return {
      confLevel: 'stale',
      confLevelLabel: 'STALE',
      confPercent: null,
      sources,
      valid: true,
    };
  }

  if (level === 'unknown') {
    if (data.confPercent !== null && data.confPercent !== undefined) {
      return { ...UNKNOWN, sources };
    }
    return {
      confLevel: 'unknown',
      confLevelLabel: 'UNKNOWN',
      confPercent: null,
      sources,
      valid: true,
    };
  }

  if (typeof data.confPercent !== 'number' || !Number.isFinite(data.confPercent)) {
    return { ...UNKNOWN, sources };
  }
  const percent = data.confPercent;
  const tier = tierForPercent(percent);
  if (tier !== level) {
    return { ...UNKNOWN, sources };
  }

  if ((level === 'high' || level === 'medium') && !spAnySourceConnected(sources)) {
    return { ...UNKNOWN, sources };
  }

  return {
    confLevel: level,
    confLevelLabel: expectedLabel,
    confPercent: percent,
    sources,
    valid: true,
  };
}

export function formatConfidenceMirror(validated: SpValidatedConfidence): string {
  if (!validated.valid || validated.confLevel === 'unknown') {
    return 'N/A UNKNOWN';
  }
  if (validated.confPercent === null) {
    return `N/A ${validated.confLevelLabel}`;
  }
  return `${validated.confPercent}% ${validated.confLevelLabel}`;
}
