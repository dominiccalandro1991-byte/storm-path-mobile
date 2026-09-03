import { fromArcgisBody, fromCensusBody, spAnnotateDistance, spMergeGeoHits, type SpGeoHit } from '../core/spGeoParse';
import { SP_MAP_VIEW_DEFAULT, spIsFiniteNumber, spIsPlainObject } from '../core/spTypes';

export type SpPlace = {
  label: string;
  sub: string;
  latitude: number;
  longitude: number;
};

export type SpGeoBias = { latitude: number; longitude: number };

export type SpRoute = {
  miles: number;
  minutes: number;
  geometry: { latitude: number; longitude: number }[];
  steps: { instruction: string; miles: number }[];
};

const SP_PHOTON = 'https://photon.komoot.io/api/';
const SP_NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const SP_OPENMETEO = 'https://geocoding-api.open-meteo.com/v1/search';
const SP_CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const SP_ARCGIS = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
const SP_OSRM = 'https://router.project-osrm.org/route/v1/driving/';

export const CHIP_QUERIES: Record<string, string> = {
  fuel: 'gas station',
  hospital: 'hospital',
  shelter: 'emergency shelter',
  grocery: 'grocery store',
};

function abortSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function biasOrDefault(bias?: SpGeoBias | null): SpGeoBias {
  if (bias && spIsFiniteNumber(bias.latitude) && spIsFiniteNumber(bias.longitude)) {
    return bias;
  }
  return { latitude: SP_MAP_VIEW_DEFAULT.latitude, longitude: SP_MAP_VIEW_DEFAULT.longitude };
}

function isUsCountry(country: string): boolean {
  const c = country.toUpperCase();
  if (!c) {
    return true;
  }
  return c === 'US' || c === 'USA' || c === 'UNITED STATES' || c.indexOf('UNITED STATES') >= 0;
}

async function fetchJson(url: string, headers: Record<string, string>, ms: number): Promise<unknown> {
  const res = await fetch(url, { headers, signal: abortSignal(ms) });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

function fromPhoton(body: unknown): SpPlace[] {
  if (!spIsPlainObject(body) || !Array.isArray(body.features)) {
    return [];
  }
  const out: SpPlace[] = [];
  for (const feature of body.features) {
    if (!spIsPlainObject(feature)) {
      continue;
    }
    const geom = feature.geometry;
    const props = feature.properties;
    if (!spIsPlainObject(geom) || !Array.isArray(geom.coordinates)) {
      continue;
    }
    const lon = geom.coordinates[0];
    const lat = geom.coordinates[1];
    if (!spIsFiniteNumber(lat) || !spIsFiniteNumber(lon)) {
      continue;
    }
    const p = spIsPlainObject(props) ? props : {};
    if (!isUsCountry(asString(p.country) || asString(p.countrycode))) {
      continue;
    }
    const name = asString(p.name);
    const city = asString(p.city) || asString(p.locality);
    const state = asString(p.state);
    const street = [asString(p.housenumber), asString(p.street)].filter(Boolean).join(' ');
    const label =
      name && city && state && name !== city
        ? `${name}, ${city}, ${state}`
        : name && state
          ? `${name}, ${state}`
          : name || street || 'Selected place';
    const sub = [street && name ? street : null, city, state].filter(Boolean).join(', ');
    out.push({ label, sub, latitude: lat, longitude: lon });
  }
  return out;
}

function fromNominatim(body: unknown): SpPlace[] {
  if (!Array.isArray(body)) {
    return [];
  }
  const out: SpPlace[] = [];
  for (const row of body) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const lat = parseFloat(String(row.lat));
    const lon = parseFloat(String(row.lon));
    if (!spIsFiniteNumber(lat) || !spIsFiniteNumber(lon)) {
      continue;
    }
    const addr = spIsPlainObject(row.address) ? row.address : {};
    if (!isUsCountry(asString(addr.country) || asString(addr.country_code))) {
      continue;
    }
    const name = asString(row.name) || asString(addr.city) || asString(addr.town) || asString(addr.village);
    const city = asString(addr.city) || asString(addr.town) || asString(addr.village);
    const street = [asString(addr.house_number), asString(addr.road)].filter(Boolean).join(' ');
    const label =
      name && city && name !== city
        ? `${name}, ${city}`
        : asString(row.display_name).split(',').slice(0, 3).join(',') || 'Selected place';
    out.push({ label, sub: street || city, latitude: lat, longitude: lon });
  }
  return out;
}

function fromOpenMeteo(body: unknown): SpPlace[] {
  if (!spIsPlainObject(body) || !Array.isArray(body.results)) {
    return [];
  }
  const out: SpPlace[] = [];
  for (const row of body.results) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const lat = row.latitude;
    const lon = row.longitude;
    if (!spIsFiniteNumber(lat) || !spIsFiniteNumber(lon)) {
      continue;
    }
    if (!isUsCountry(asString(row.country) || asString(row.country_code))) {
      continue;
    }
    const name = asString(row.name);
    const admin = asString(row.admin1);
    const label = name && admin ? `${name}, ${admin}` : name || 'Selected place';
    out.push({ label, sub: admin, latitude: lat, longitude: lon });
  }
  return out;
}

function toPlace(hit: SpGeoHit): SpPlace {
  return { label: hit.label, sub: hit.sub, latitude: hit.latitude, longitude: hit.longitude };
}

export async function searchPlaces(query: string, bias?: SpGeoBias | null): Promise<SpPlace[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }
  const b = biasOrDefault(bias);
  const enc = encodeURIComponent(q);
  const photonUrl = `${SP_PHOTON}?q=${enc}&lat=${b.latitude}&lon=${b.longitude}&limit=10&lang=en`;
  const nomUrl = `${SP_NOMINATIM}?format=jsonv2&addressdetails=1&countrycodes=us&dedupe=1&limit=8&q=${enc}`;
  const omUrl = `${SP_OPENMETEO}?name=${enc}&count=8&language=en&format=json&countryCode=US`;
  const censusUrl = `${SP_CENSUS}?address=${enc}&benchmark=Public_AR_Current&format=json`;
  const arcUrl = `${SP_ARCGIS}?f=json&countryCode=USA&maxLocations=8&outFields=Addr_type,Match_addr,LongLabel,PlaceName,StAddr,Place_addr,City,Region,Postal&location=${b.longitude},${b.latitude}&distance=80000&SingleLine=${enc}`;

  const [photon, nominatim, openMeteo, census, arcgis] = await Promise.all([
    fetchJson(photonUrl, { Accept: 'application/json' }, 8000).catch(() => null),
    fetchJson(nomUrl, { Accept: 'application/json', 'User-Agent': 'StormPath/1.0.0' }, 8000).catch(() => null),
    fetchJson(omUrl, { Accept: 'application/json' }, 8000).catch(() => null),
    fetchJson(censusUrl, { Accept: 'application/json' }, 8000).catch(() => null),
    fetchJson(arcUrl, { Accept: 'application/json' }, 8000).catch(() => null),
  ]);

  const photonHits: SpGeoHit[] = fromPhoton(photon).map((p) => ({
    ...p,
    rank: /\d/.test(p.label) ? 0 : 2,
  }));
  const nomHits: SpGeoHit[] = fromNominatim(nominatim).map((p) => ({
    ...p,
    rank: /\d/.test(p.label) ? 0 : 2,
  }));
  const omHits: SpGeoHit[] = fromOpenMeteo(openMeteo).map((p) => ({ ...p, rank: 3 }));
  const merged = spAnnotateDistance(
    spMergeGeoHits([fromCensusBody(census), fromArcgisBody(arcgis), photonHits, nomHits, omHits], 10),
    b.latitude,
    b.longitude,
  );
  return merged.map(toPlace);
}

export async function fetchDrivingRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): Promise<SpRoute | null> {
  if (
    !spIsFiniteNumber(from.latitude) ||
    !spIsFiniteNumber(from.longitude) ||
    !spIsFiniteNumber(to.latitude) ||
    !spIsFiniteNumber(to.longitude)
  ) {
    return null;
  }
  const path = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${SP_OSRM}${path}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url, { signal: abortSignal(12000) });
    if (!res.ok) {
      return null;
    }
    const body: unknown = await res.json();
    if (!spIsPlainObject(body) || body.code !== 'Ok' || !Array.isArray(body.routes)) {
      return null;
    }
    const route0 = body.routes[0];
    if (!spIsPlainObject(route0)) {
      return null;
    }
    const distM = typeof route0.distance === 'number' ? route0.distance : 0;
    const durS = typeof route0.duration === 'number' ? route0.duration : 0;
    const geom = spIsPlainObject(route0.geometry) ? route0.geometry.coordinates : null;
    const geometry: SpRoute['geometry'] = [];
    if (Array.isArray(geom)) {
      for (const pair of geom) {
        if (Array.isArray(pair) && spIsFiniteNumber(pair[0]) && spIsFiniteNumber(pair[1])) {
          geometry.push({ latitude: pair[1], longitude: pair[0] });
        }
      }
    }
    const steps: SpRoute['steps'] = [];
    const legs = Array.isArray(route0.legs) ? route0.legs : [];
    for (const leg of legs) {
      if (!spIsPlainObject(leg) || !Array.isArray(leg.steps)) {
        continue;
      }
      for (const step of leg.steps) {
        if (!spIsPlainObject(step)) {
          continue;
        }
        const man = spIsPlainObject(step.maneuver) ? step.maneuver : {};
        const name = typeof step.name === 'string' ? step.name : '';
        const type = typeof man.type === 'string' ? man.type : 'continue';
        const modifier = typeof man.modifier === 'string' ? man.modifier : '';
        const instruction =
          typeof man.instruction === 'string'
            ? man.instruction
            : name
              ? `${type.replace(/_/g, ' ')} ${modifier} on ${name}`.replace(/\s+/g, ' ').trim()
              : type.replace(/_/g, ' ');
        const miles = typeof step.distance === 'number' ? step.distance / 1609.34 : 0;
        steps.push({ instruction, miles });
      }
    }
    return {
      miles: distM / 1609.34,
      minutes: durS / 60,
      geometry,
      steps,
    };
  } catch {
    return null;
  }
}

export function isSpPlace(value: unknown): value is SpPlace {
  if (!spIsPlainObject(value)) {
    return false;
  }
  return (
    typeof value.label === 'string' &&
    typeof value.sub === 'string' &&
    spIsFiniteNumber(value.latitude) &&
    spIsFiniteNumber(value.longitude)
  );
}
