import type { SpAlertDerivedState, SpStateKey } from './spTypes';

export type SpAndGateFlags = {
  spGPSAvailable: boolean;
  spWeatherOK: boolean;
  spRadarOK: boolean;
  spLastAlertState: SpAlertDerivedState | null;
};

/**
 * Three-source AND-gate.
 * nextState = (GPS && WX && RADAR) ? (lastAlert || 'normal') : 'safe'
 */
export function spComputeNextState(flags: SpAndGateFlags): SpStateKey {
  if (flags.spGPSAvailable && flags.spWeatherOK && flags.spRadarOK) {
    return flags.spLastAlertState || 'normal';
  }
  return 'safe';
}
