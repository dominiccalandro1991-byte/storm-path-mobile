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
import { SP_MAP_VIEW_DEFAULT, SP_VIEW_ONLY_LABEL } from '../src/core/spTypes';

const golden = runGoldenInvariantChecks();
const startup = runStartupSafetyChecks({ mapLayoutOk: true });
const blocked = spComputeNextState({
  spGPSAvailable: true,
  spWeatherOK: true,
  spRadarOK: false,
  spLastAlertState: 'stop',
});
const viewOnly =
  SP_MAP_VIEW_DEFAULT.latitude === 37.7645 &&
  SP_MAP_VIEW_DEFAULT.longitude === -89.3351 &&
  SP_VIEW_ONLY_LABEL === 'Murphysboro, IL';

const failures: string[] = [
  ...golden.map((code) => `GOLDEN_${code}`),
  ...startup.codes,
];

if (blocked !== 'safe') {
  failures.push('AND_GATE_STOP_BLOCKED_SAFE');
}
if (!viewOnly) {
  failures.push('VIEW_DEFAULT_NOT_MURPHYSBORO');
}

if (failures.length > 0) {
  console.error('SP_GOLDEN_FAIL');
  for (const code of failures) {
    console.error(code);
  }
  process.exit(1);
}

console.log('SP_GOLDEN_OK codes=0 murphysboroViewOnly=true andGateSafeOnRadarFail=true');
process.exit(0);
