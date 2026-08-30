import { SP_REQUIRED_STATE_FIELDS, SP_STATES } from './spStates';
import { spValidateConfidence } from './spConfidence';
import { SP_STATE_KEYS } from './spTypes';
import { spSourceMapExactAndValid } from './spSources';

export type StartupCheckResult = {
  ok: boolean;
  codes: string[];
};

/**
 * Native startup SAFE MODE gate.
 * Failure forces exclusive SP_STARTUP_SAFE_FALLBACK payload.
 */
export function runStartupSafetyChecks(opts: { mapLayoutOk: boolean }): StartupCheckResult {
  const codes: string[] = [];

  if (!opts.mapLayoutOk) {
    codes.push('MAP_LAYOUT');
  }

  for (const key of SP_STATE_KEYS) {
    const rec = SP_STATES[key];
    if (!rec) {
      codes.push(`STATE_MISSING_${key}`);
      continue;
    }
    for (const field of SP_REQUIRED_STATE_FIELDS) {
      if (rec[field] === undefined || rec[field] === null) {
        codes.push(`STATE_FIELD_${key}_${String(field)}`);
      }
    }
    if (!spSourceMapExactAndValid(rec.sources)) {
      codes.push(`STATE_SOURCES_${key}`);
    }
    const conf = spValidateConfidence(rec);
    if (!conf.valid) {
      codes.push(`STATE_CONFIDENCE_${key}`);
    }
  }

  return { ok: codes.length === 0, codes };
}
