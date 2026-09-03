import { spIsFiniteNumber, spIsPlainObject } from './spTypes';

export type SpGeoHit = {
  label: string;
  sub: string;
  latitude: number;
  longitude: number;
  rank: number;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function spLooksLikeStreetAddress(q: string): boolean {
  return /\d/.test(q) && /[a-zA-Z]/.test(q);
}

export function spPushUniqueHits(out: SpGeoHit[], place: SpGeoHit, max = 10): void {
  const dup = out.some(
    (p) => Math.abs(p.latitude - place.latitude) < 0.0003 && Math.abs(p.longitude - place.longitude) < 0.0003,
  );
  if (!dup && out.length < max) {
    out.push(place);
  }
}

export function fromCensusBody(body: unknown): SpGeoHit[] {
  if (!spIsPlainObject(body)) {
    return [];
  }
  const result = body.result;
  if (!spIsPlainObject(result) || !Array.isArray(result.addressMatches)) {
    return [];
  }
  const out: SpGeoHit[] = [];
  for (const row of result.addressMatches) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const coords = row.coordinates;
    if (!spIsPlainObject(coords)) {
      continue;
    }
    const lat = coords.y;
    const lon = coords.x;
    if (!spIsFiniteNumber(lat) || !spIsFiniteNumber(lon)) {
      continue;
    }
    const label = asString(row.matchedAddress) || 'US address';
    out.push({ label, sub: 'CENSUS MAF', latitude: lat, longitude: lon, rank: 0 });
  }
  return out;
}

export function fromArcgisBody(body: unknown): SpGeoHit[] {
  if (!spIsPlainObject(body) || !Array.isArray(body.candidates)) {
    return [];
  }
  const out: SpGeoHit[] = [];
  for (const row of body.candidates) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const loc = row.location;
    if (!spIsPlainObject(loc) || !spIsFiniteNumber(loc.y) || !spIsFiniteNumber(loc.x)) {
      continue;
    }
    const score = typeof row.score === 'number' ? row.score : 0;
    if (score < 70) {
      continue;
    }
    const attr = spIsPlainObject(row.attributes) ? row.attributes : {};
    const kind = asString(attr.Addr_type);
    const place = asString(attr.PlaceName);
    const city = asString(attr.City);
    const region = asString(attr.Region);
    const match = asString(attr.Match_addr) || asString(row.address);
    const label =
      place && city && !match.toLowerCase().startsWith(place.toLowerCase())
        ? `${place}, ${city}, ${region || 'US'}`
        : match || place || 'US place';
    const sub = [kind, city, region].filter(Boolean).join(' · ');
    const rank = kind === 'PointAddress' || kind === 'StreetAddress' ? 0 : kind === 'POI' ? 1 : 2;
    out.push({ label, sub, latitude: loc.y, longitude: loc.x, rank });
  }
  return out;
}

export function spMergeGeoHits(groups: SpGeoHit[][], max = 10): SpGeoHit[] {
  const ranked = groups.flat().sort((a, b) => a.rank - b.rank);
  const out: SpGeoHit[] = [];
  for (const hit of ranked) {
    spPushUniqueHits(out, hit, max);
  }
  return out;
}
