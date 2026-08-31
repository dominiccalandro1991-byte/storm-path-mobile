/**
 * Headless golden-invariant runner.
 * Does not import React Native, Expo, Fastlane, or EAS.
 * Exit 0 only when every locked invariant holds.
 */
declare const process: {
  exit(code: number): never;
};

import { runGoldenInvariantChecks } from '../src/core/spGoldenChecks';
import { runStartupSafetyChecks } from '../src/core/spStartup';
import { spComputeNextState } from '../src/core/spRecompute';
import { SP_MAP_VIEW_DEFAULT } from '../src/core/spTypes';

const golden = runGoldenInvariantChecks();
const startup = runStartupSafetyChecks({ mapLayoutOk: true });
const blocked = spComputeNextState({
  spGPSAvailable: true,
  spWeatherOK: true,
  spRadarOK: false,
  spLastAlertState: 'stop',
});
const stlIsViewOnly =
  SP_MAP_VIEW_DEFAULT.latitude === 38.627 && SP_MAP_VIEW_DEFAULT.longitude === -90.1994;

const failures: string[] = [
  ...golden.map((code) => `GOLDEN_${code}`),
  ...startup.codes,
];

if (blocked !== 'safe') {
  failures.push('AND_GATE_STOP_BLOCKED_SAFE');
}
if (!stlIsViewOnly) {
  failures.push('STL_DEFAULT_DRIFT');
}

if (failures.length > 0) {
  console.error('SP_GOLDEN_FAIL');
  for (const code of failures) {
    console.error(code);
  }
  process.exit(1);
}

console.log('SP_GOLDEN_OK codes=0 stlViewOnly=true andGateSafeOnRadarFail=true');
process.exit(0);
