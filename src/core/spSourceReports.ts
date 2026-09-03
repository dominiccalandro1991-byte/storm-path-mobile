import { spIsFiniteNumber, spIsPlainObject } from './spTypes';

export type SpReport = {
  id: string;
  source: string;
  title: string;
  body: string;
  when: string;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function whenFromMs(ms: unknown): string {
  const n = typeof ms === 'number' ? ms : Number(ms);
  if (!spIsFiniteNumber(n) || n <= 0) {
    return '';
  }
  try {
    return new Date(n).toLocaleString();
  } catch {
    return '';
  }
}

function whenFromIso(iso: unknown): string {
  const s = asString(iso);
  if (!s) {
    return '';
  }
  const t = Date.parse(s);
  return spIsFiniteNumber(t) ? new Date(t).toLocaleString() : s.slice(0, 10);
}

export function fromIdotIncidents(body: unknown): SpReport[] {
  if (!spIsPlainObject(body) || !Array.isArray(body.features)) {
    return [];
  }
  const out: SpReport[] = [];
  for (const row of body.features) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const a = spIsPlainObject(row.attributes) ? row.attributes : {};
    const id = `dot-${asString(a.OBJECTID) || out.length}`;
    const kind = asString(a.TRAFFIC_ITEM_TYPE_DESC) || 'INCIDENT';
    const bodyText =
      asString(a.TRAFFIC_ITEM_DESCRIPTION) ||
      asString(a.TRAFFIC_ITEM_DESCRIPTION_NO_EX) ||
      asString(a.ORIGIN) ||
      asString(a.DESCRIPTION);
    out.push({
      id,
      source: 'DOT',
      title: kind.replace(/_/g, ' '),
      body: bodyText || `${asString(a.CRITICALITY_DESC)} · closed=${asString(a.ROAD_CLOSED)}`,
      when: whenFromMs(a.START_TIME),
    });
  }
  return out;
}

export function fromIdotClosures(body: unknown): SpReport[] {
  if (!spIsPlainObject(body) || !Array.isArray(body.features)) {
    return [];
  }
  const out: SpReport[] = [];
  for (const row of body.features) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const a = spIsPlainObject(row.attributes) ? row.attributes : {};
    const id = `close-${asString(a.ID) || asString(a.OBJECTID) || out.length}`;
    out.push({
      id,
      source: 'ROAD CLOSURES',
      title: asString(a.ClosureType) || asString(a.ConstructionType) || 'CLOSURE',
      body: [asString(a.Location), asString(a.St_Name), asString(a.DetourRoute), asString(a.County)]
        .filter(Boolean)
        .join(' · '),
      when: whenFromMs(a.StartDate),
    });
  }
  return out;
}

export function fromFemaDisasters(body: unknown): SpReport[] {
  if (!spIsPlainObject(body) || !Array.isArray(body.DisasterDeclarationsSummaries)) {
    return [];
  }
  const out: SpReport[] = [];
  for (const row of body.DisasterDeclarationsSummaries) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const num = asString(row.disasterNumber) || asString(row.femaDeclarationString);
    out.push({
      id: `fema-${num || out.length}`,
      source: 'EMERG MGMT',
      title: asString(row.declarationTitle) || asString(row.incidentType) || 'FEMA DECLARATION',
      body: [asString(row.state), asString(row.declarationType), asString(row.incidentType), num && `DR-${num}`]
        .filter(Boolean)
        .join(' · '),
      when: whenFromIso(row.declarationDate),
    });
  }
  return out;
}

export function fromFemaShelters(body: unknown): SpReport[] {
  if (!spIsPlainObject(body) || !Array.isArray(body.features)) {
    return [];
  }
  const out: SpReport[] = [];
  for (const row of body.features) {
    if (!spIsPlainObject(row)) {
      continue;
    }
    const a = spIsPlainObject(row.attributes) ? row.attributes : {};
    const name = asString(a.shelter_name);
    const city = asString(a.city);
    const state = asString(a.state);
    out.push({
      id: `sh-${asString(a.shelter_id) || asString(a.objectid) || name || out.length}`,
      source: 'SHELTERS',
      title: name || 'OPEN SHELTER',
      body: [asString(a.address), city, state, asString(a.shelter_status)].filter(Boolean).join(' · '),
      when: asString(a.hours_open),
    });
  }
  return out;
}

export function spFilterDismissed(reports: SpReport[], dismissed: string[]): SpReport[] {
  const hide = new Set(dismissed);
  return reports.filter((r) => !hide.has(r.id));
}
