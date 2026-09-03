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

export function spMetersBetween(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLon = toR(bLon - aLon);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function spFormatMiles(meters: number): string {
  const mi = meters / 1609.34;
  if (mi < 0.1) {
    return `${Math.round(meters * 3.28084)} ft`;
  }
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}

function hasStreet(hit: SpGeoHit): boolean {
  return /\d/.test(hit.label) || /\d/.test(hit.sub);
}

export function spPushUniqueHits(out: SpGeoHit[], place: SpGeoHit, max = 10): void {
  const idx = out.findIndex(
    (p) => Math.abs(p.latitude - place.latitude) < 0.0015 && Math.abs(p.longitude - place.longitude) < 0.0015,
  );
  if (idx >= 0) {
    if (hasStreet(place) && !hasStreet(out[idx])) {
      out[idx] = place;
    }
    return;
  }
  if (out.length < max) {
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
    out.push({ label, sub: 'US Census', latitude: lat, longitude: lon, rank: 0 });
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
    const postal = asString(attr.Postal);
    const street = asString(attr.StAddr);
    const placeAddr = asString(attr.Place_addr);
    const longLabel = asString(attr.LongLabel);
    const match = asString(attr.Match_addr) || asString(row.address);
    const regionShort = region === 'Illinois' ? 'IL' : region;
    let label = match || place || 'US place';
    let sub = [city, regionShort].filter(Boolean).join(', ');
    if (kind === 'POI' && place) {
      label = place;
      sub = street
        ? `${street}, ${city}${regionShort ? `, ${regionShort}` : ''}${postal ? ` ${postal}` : ''}`
        : placeAddr || longLabel || sub;
    } else if (longLabel) {
      label = longLabel.replace(/, USA$/, '');
      sub = [city, regionShort, postal].filter(Boolean).join(' ');
    }
    const rank = kind === 'PointAddress' || kind === 'StreetAddress' ? 0 : kind === 'POI' ? 1 : 2;
    out.push({ label, sub, latitude: loc.y, longitude: loc.x, rank });
  }
  return out;
}

export function spMergeGeoHits(groups: SpGeoHit[][], max = 10): SpGeoHit[] {
  const ranked = groups.flat().sort((a, b) => a.rank - b.rank || (hasStreet(b) ? 1 : 0) - (hasStreet(a) ? 1 : 0));
  const out: SpGeoHit[] = [];
  for (const hit of ranked) {
    spPushUniqueHits(out, hit, max);
  }
  return out;
}

export function spAnnotateDistance(hits: SpGeoHit[], lat: number, lon: number): SpGeoHit[] {
  return hits
    .map((hit) => {
      const meters = spMetersBetween(lat, lon, hit.latitude, hit.longitude);
      const miles = spFormatMiles(meters);
      const sub = hit.sub && hit.sub.indexOf(' mi') < 0 && hit.sub.indexOf(' ft') < 0 ? `${hit.sub} · ${miles}` : miles;
      return { ...hit, sub, rank: hit.rank };
    })
    .sort((a, b) => spMetersBetween(lat, lon, a.latitude, a.longitude) - spMetersBetween(lat, lon, b.latitude, b.longitude));
}
