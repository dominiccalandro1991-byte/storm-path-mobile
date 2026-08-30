import { SP_ALERT_STATE_RANK, type SpAlertDerivedState, type SpNwsAlert } from './spTypes';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Conservative classifier. Unclassified active alerts become caution, never normal.
 */
export function spClassifyAlert(alert: unknown): SpAlertDerivedState {
  const raw = alert && typeof alert === 'object' ? (alert as Record<string, unknown>) : {};
  const event = asString(raw.event).toLowerCase();
  const severity = asString(raw.severity);
  const urgency = asString(raw.urgency);

  const tornadoWarning = event.includes('tornado warning');
  const extreme = severity === 'Extreme';
  const immediate = urgency === 'Immediate';

  if ((tornadoWarning || extreme) && immediate) {
    return 'stop';
  }
  if (tornadoWarning || extreme) {
    return 'danger';
  }
  if (event.includes('severe thunderstorm warning') || event.includes('flood warning')) {
    return 'caution';
  }
  return 'caution';
}

/**
 * Empty or missing list → normal. Otherwise worst-alert wins.
 */
export function spEvaluateAlertState(alerts: unknown): SpAlertDerivedState {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return 'normal';
  }
  let worst: SpAlertDerivedState = 'normal';
  let worstRank: number = SP_ALERT_STATE_RANK.normal;
  for (const alert of alerts) {
    const classified = spClassifyAlert(alert);
    const rank: number = SP_ALERT_STATE_RANK[classified];
    if (rank > worstRank) {
      worst = classified;
      worstRank = rank;
    }
  }
  return worst;
}

export function alertsFromNwsFeatures(features: unknown): SpNwsAlert[] {
  if (!Array.isArray(features)) {
    return [];
  }
  const out: SpNwsAlert[] = [];
  for (const feature of features) {
    if (!feature || typeof feature !== 'object') {
      continue;
    }
    const props = (feature as Record<string, unknown>).properties;
    if (!props || typeof props !== 'object') {
      continue;
    }
    const p = props as Record<string, unknown>;
    out.push({
      event: typeof p.event === 'string' ? p.event : '',
      severity: typeof p.severity === 'string' ? p.severity : '',
      urgency: typeof p.urgency === 'string' ? p.urgency : '',
    });
  }
  return out;
}
