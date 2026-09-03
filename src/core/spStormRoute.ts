import { spIsFiniteNumber } from './spTypes';

export const SP_STORM_EVENT_RE =
  /tornado|thunderstorm|flash flood|blizzard|winter storm|hurricane|cyclone|ice storm|dust storm|severe weather/i;

export function spIsDriveAroundAlert(event: string): boolean {
  return SP_STORM_EVENT_RE.test(event || '');
}

export function spFormatDuration(sec: number): string {
  if (!spIsFiniteNumber(sec) || sec < 0) {
    return '';
  }
  const s = Math.round(sec);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (d > 0) {
    return `${d}d ${h}h ${m}m`;
  }
  if (h > 0) {
    return `${h}h ${m}m ${r}s`;
  }
  if (m > 0) {
    return `${m} min ${r}s`;
  }
  return `${r}s`;
}

export function spClockParts(sec: number): [number, number, number, number] {
  const s = Math.max(0, Math.round(spIsFiniteNumber(sec) ? sec : 0));
  return [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
}

export function spPointInRing(lat: number, lon: number, ring: number[][]): boolean {
  if (!Array.isArray(ring) || ring.length < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (!spIsFiniteNumber(xi) || !spIsFiniteNumber(yi) || !spIsFiniteNumber(xj) || !spIsFiniteNumber(yj)) {
      continue;
    }
    const hit = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (hit) {
      inside = !inside;
    }
  }
  return inside;
}

export function spGeomHitsPoint(geom: unknown, lat: number, lon: number): boolean {
  if (!geom || typeof geom !== 'object') {
    return false;
  }
  const g = geom as { type?: string; coordinates?: unknown };
  const walk = (coords: unknown): boolean => {
    if (!Array.isArray(coords) || coords.length === 0) {
      return false;
    }
    if (typeof coords[0][0] === 'number') {
      return spPointInRing(lat, lon, coords as number[][]);
    }
    return coords.some(walk);
  };
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') {
    return walk(g.coordinates);
  }
  return false;
}

export type SpScoredRoute = {
  index: number;
  duration: number;
  hits: number;
  coords: { lat: number; lon: number }[];
};

export function spScoreRouteHits(
  coords: { lat: number; lon: number }[],
  geoms: unknown[],
): number {
  if (!geoms.length || !coords.length) {
    return 0;
  }
  const step = Math.max(1, Math.floor(coords.length / 40));
  let hits = 0;
  for (let i = 0; i < coords.length; i += step) {
    const p = coords[i];
    if (geoms.some((g) => spGeomHitsPoint(g, p.lat, p.lon))) {
      hits += 1;
    }
  }
  return hits;
}

export function spPickStormRoute(routes: SpScoredRoute[]): SpScoredRoute {
  if (!routes.length) {
    throw new Error('no routes');
  }
  const primary = routes[0];
  let best = primary;
  for (const r of routes) {
    if (r.hits < best.hits) {
      best = r;
    } else if (r.hits === best.hits && r.duration < best.duration) {
      best = r;
    }
  }
  if (primary.hits === 0) {
    return primary;
  }
  if (best.hits < primary.hits && best.duration <= primary.duration * 1.6) {
    return best;
  }
  return primary;
}
