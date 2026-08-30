import { spClassifyAlert, spEvaluateAlertState } from './spAlerts';
import { spValidateConfidence } from './spConfidence';
import { spComputeNextState } from './spRecompute';
import { switchScreenPure } from './spScreens';
import { SP_STATES } from './spStates';
import { spNormalizeSourceStatuses } from './spSources';

export function runGoldenInvariantChecks(): string[] {
  const failures: string[] = [];

  const protoHigh = spValidateConfidence({
    confLevel: 'high',
    confLevelLabel: 'HIGH',
    confPercent: 96,
    sources: SP_STATES.normal.sources,
  });
  if (protoHigh.valid || protoHigh.confLevel !== 'unknown') {
    failures.push('PROTOTYPE_BAN_HIGH');
  }

  const allUnavail = spValidateConfidence({
    confLevel: 'low',
    confLevelLabel: 'LOW',
    confPercent: 10,
    sources: spNormalizeSourceStatuses({
      NOAA: 'unavailable',
      NWS: 'unavailable',
      DOT: 'unavailable',
      'EMERG MGMT': 'unavailable',
      'ROAD CLOSURES': 'unavailable',
      SHELTERS: 'unavailable',
    }),
  });
  if (allUnavail.valid || allUnavail.confLevel !== 'unknown') {
    failures.push('ALL_UNAVAILABLE_MUST_UNKNOWN');
  }

  if (spEvaluateAlertState([]) !== 'normal') {
    failures.push('EMPTY_ALERTS_NORMAL');
  }
  if (spEvaluateAlertState(null) !== 'normal') {
    failures.push('MISSING_ALERTS_NORMAL');
  }

  const stop = spClassifyAlert({
    event: 'Tornado Warning',
    severity: 'Extreme',
    urgency: 'Immediate',
  });
  if (stop !== 'stop') {
    failures.push('TORNADO_IMMEDIATE_STOP');
  }

  const danger = spClassifyAlert({
    event: 'Tornado Warning',
    severity: 'Extreme',
    urgency: 'Expected',
  });
  if (danger !== 'danger') {
    failures.push('TORNADO_DANGER');
  }

  const other = spClassifyAlert({ event: 'Winter Weather Advisory', severity: 'Minor', urgency: 'Expected' });
  if (other !== 'caution') {
    failures.push('OTHER_ALERT_CAUTION');
  }

  const blocked = spComputeNextState({
    spGPSAvailable: true,
    spWeatherOK: true,
    spRadarOK: false,
    spLastAlertState: 'danger',
  });
  if (blocked !== 'safe') {
    failures.push('AND_GATE_RADAR_FAIL_SAFE');
  }

  const live = spComputeNextState({
    spGPSAvailable: true,
    spWeatherOK: true,
    spRadarOK: true,
    spLastAlertState: 'caution',
  });
  if (live !== 'caution') {
    failures.push('AND_GATE_LIVE_ALERT');
  }

  const invalidScreen = switchScreenPure('map', 'radar');
  if (invalidScreen.next !== 'map' || invalidScreen.changed) {
    failures.push('INVALID_SCREEN_NOOP');
  }

  const same = switchScreenPure('map', 'map');
  if (!same.sameReentry || same.changed) {
    failures.push('SAME_SCREEN_NOOP');
  }

  return failures;
}
