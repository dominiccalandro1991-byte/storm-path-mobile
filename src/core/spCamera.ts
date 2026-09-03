/**
 * Camera policy for Storm Path.
 * GPS apps (Apple Maps / Google / Waze):
 *   follow  — pan to the fix, keep the user's zoom
 *   browse  — user pinched or panned; GPS must not steal the camera
 *   start drive — brief route overview, then follow at street zoom
 * GPS ticks never hard-set zoom and never refetch+fitBounds.
 */

export const SP_CAM_MIN_ZOOM = 2;
export const SP_CAM_MAX_ZOOM = 19;
export const SP_CAM_FOLLOW_ZOOM = 16;
export const SP_CAM_OVERVIEW_MS = 1600;
export const SP_CAM_REROUTE_METERS = 250;
export const SP_CAM_REROUTE_MS = 30_000;

export type SpCamMode = 'follow' | 'browse';

export type SpCamEvent =
  | { type: 'gps' }
  | { type: 'user_gesture' }
  | { type: 'start_drive' }
  | { type: 'recenter' };

export type SpCamAction = 'none' | 'pan' | 'overview' | 'follow_zoom' | 'unlock';

export function spCamNext(mode: SpCamMode, event: SpCamEvent): { mode: SpCamMode; action: SpCamAction } {
  if (event.type === 'user_gesture') {
    return { mode: 'browse', action: 'unlock' };
  }
  if (event.type === 'recenter') {
    return { mode: 'follow', action: 'follow_zoom' };
  }
  if (event.type === 'start_drive') {
    return { mode: 'follow', action: 'overview' };
  }
  if (mode === 'follow') {
    return { mode: 'follow', action: 'pan' };
  }
  return { mode: 'browse', action: 'none' };
}

export function spCamShouldReroute(lastFetchAt: number, now: number, movedMeters: number): boolean {
  if (!Number.isFinite(lastFetchAt) || !Number.isFinite(now) || !Number.isFinite(movedMeters)) {
    return false;
  }
  return movedMeters >= SP_CAM_REROUTE_METERS || now - lastFetchAt >= SP_CAM_REROUTE_MS;
}

export function spCamMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
