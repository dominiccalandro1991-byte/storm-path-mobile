import {
  SP_NWS_ABORT_MS,
  SP_NWS_ORIGIN,
  SP_NWS_USER_AGENT,
  SP_WEATHER_REFRESH_OK_MS,
  spIsFiniteNumber,
  spIsPlainObject,
} from '../core/spTypes';
import { alertsFromNwsFeatures } from '../core/spAlerts';
import type { SpNwsAlert, SpNwsHourlyChips } from '../core/spTypes';
import { spHwAssertIo } from '../diagnostics/spHardwareLog';

export type SpWeatherResult = {
  ok: boolean;
  hourly: SpNwsHourlyChips | null;
  alerts: SpNwsAlert[];
  error: string | null;
};

function abortSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * Refuses any URL that does not start with https://api.weather.gov/
 */
export async function spNWSFetch(url: string): Promise<Record<string, unknown>> {
  if (!url.startsWith(SP_NWS_ORIGIN)) {
    throw new Error('NWS_ORIGIN_REFUSED');
  }
  spHwAssertIo('NWS', url);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': SP_NWS_USER_AGENT,
      Accept: 'application/geo+json',
    },
    signal: abortSignal(SP_NWS_ABORT_MS),
  });
  if (!response.ok) {
    throw new Error(`NWS_HTTP_${response.status}`);
  }
  const body: unknown = await response.json();
  if (!spIsPlainObject(body)) {
    throw new Error('NWS_BODY_NOT_OBJECT');
  }
  return body;
}

function formatHourly(period: Record<string, unknown>): SpNwsHourlyChips {
  const temp = period.temperature;
  const unit = typeof period.temperatureUnit === 'string' ? period.temperatureUnit : '';
  const temperature =
    typeof temp === 'number' && Number.isFinite(temp) ? `${temp}°${unit || 'F'}` : 'N/A';
  const windSpeed = typeof period.windSpeed === 'string' ? period.windSpeed : '';
  const windDir = typeof period.windDirection === 'string' ? period.windDirection : '';
  const wind = windSpeed || windDir ? `${windDir} ${windSpeed}`.trim() : 'N/A';
  const humidityRaw = period.relativeHumidity;
  let humidity = 'N/A';
  if (spIsPlainObject(humidityRaw) && typeof humidityRaw.value === 'number') {
    humidity = `${humidityRaw.value}%`;
  }
  return { temperature, wind, humidity };
}

/**
 * Requires finite lat/lon. Sequence: /points then parallel hourly + alerts.
 */
export async function spFetchWeather(lat: number, lon: number): Promise<SpWeatherResult> {
  if (!spIsFiniteNumber(lat) || !spIsFiniteNumber(lon)) {
    return { ok: false, hourly: null, alerts: [], error: 'NON_FINITE_COORD' };
  }
  const point = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  try {
    const points = await spNWSFetch(`${SP_NWS_ORIGIN}points/${point}`);
    const props = points.properties;
    if (!spIsPlainObject(props) || !props.gridId || props.gridX === undefined || props.gridY === undefined) {
      throw new Error('NWS_GRID_IDENTITY');
    }
    const office = String(props.gridId);
    const gridX = String(props.gridX);
    const gridY = String(props.gridY);
    const hourlyUrl = `${SP_NWS_ORIGIN}gridpoints/${office}/${gridX},${gridY}/forecast/hourly`;
    const alertsUrl = `${SP_NWS_ORIGIN}alerts/active?point=${point}`;
    const [hourlyBody, alertsBody] = await Promise.all([spNWSFetch(hourlyUrl), spNWSFetch(alertsUrl)]);

    const hourlyProps = hourlyBody.properties;
    if (!spIsPlainObject(hourlyProps) || !Array.isArray(hourlyProps.periods) || hourlyProps.periods.length === 0) {
      throw new Error('NWS_HOURLY_PERIODS');
    }
    const period0 = hourlyProps.periods[0];
    if (!spIsPlainObject(period0)) {
      throw new Error('NWS_HOURLY_PERIOD0');
    }

    const alerts = alertsFromNwsFeatures(alertsBody.features);
    return {
      ok: true,
      hourly: formatHourly(period0),
      alerts,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NWS_UNKNOWN';
    return { ok: false, hourly: null, alerts: [], error: message };
  }
}

export function nextWeatherBackoffMs(failCount: number): number {
  const raw = 5_000 * 2 ** Math.max(0, failCount - 1);
  return Math.min(raw, SP_WEATHER_REFRESH_OK_MS);
}
