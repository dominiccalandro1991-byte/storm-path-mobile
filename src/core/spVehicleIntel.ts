/** Vehicle packs + driver intel contracts. Pure — no RN. */

export const SP_INTEL_TTL_MS = 3 * 60 * 60 * 1000;

export type SpVehicleItem = {
  id: string;
  label: string;
  desc: string;
  file: string;
};

export type SpVehicleSection = {
  id: string;
  label: string;
  desc: string;
  items: SpVehicleItem[];
};

export const SP_VEHICLE_SECTIONS: SpVehicleSection[] = [
  {
    id: 'vortex',
    label: 'VORTEX',
    desc: 'Storm forms',
    items: [
      { id: 'blaze', label: 'BLAZE', desc: 'Fire funnel', file: 'blaze.png' },
      { id: 'twister', label: 'TWISTER', desc: 'Classic funnel', file: 'twister.png' },
      { id: 'cell', label: 'CELL', desc: 'Radar green', file: 'cell.png' },
      { id: 'ion', label: 'ION', desc: 'Plasma funnel', file: 'ion.png' },
    ],
  },
  {
    id: 'strike',
    label: 'STRIKE',
    desc: 'Lightning',
    items: [
      { id: 'flare', label: 'FLARE', desc: 'Fire strike', file: 'flare.png' },
      { id: 'bolt', label: 'BOLT', desc: 'Cloud to ground', file: 'bolt.png' },
      { id: 'volt', label: 'VOLT', desc: 'Radar green', file: 'volt.png' },
      { id: 'arc', label: 'ARC', desc: 'Plasma strike', file: 'arc.png' },
    ],
  },
  {
    id: 'hail',
    label: 'HAIL',
    desc: 'Ice cores',
    items: [
      { id: 'ember', label: 'EMBER', desc: 'Fire cores', file: 'ember.png' },
      { id: 'ice', label: 'ICE', desc: 'Live hail', file: 'ice.png' },
      { id: 'glow', label: 'GLOW', desc: 'Radar green', file: 'glow.png' },
      { id: 'nova', label: 'NOVA', desc: 'Plasma cores', file: 'nova.png' },
    ],
  },
  {
    id: 'rain',
    label: 'RAIN',
    desc: 'Falling water',
    items: [
      { id: 'lava', label: 'LAVA', desc: 'Fire rain', file: 'lava.png' },
      { id: 'pour', label: 'POUR', desc: 'Live rain', file: 'pour.png' },
      { id: 'acid', label: 'ACID', desc: 'Radar green', file: 'acid.png' },
      { id: 'neon', label: 'NEON', desc: 'Plasma rain', file: 'neon.png' },
    ],
  },
  {
    id: 'cloud',
    label: 'CLOUD',
    desc: 'Storm mass',
    items: [
      { id: 'pyro', label: 'PYRO', desc: 'Fire cloud', file: 'pyro.png' },
      { id: 'nimbus', label: 'NIMBUS', desc: 'Live storm', file: 'nimbus.png' },
      { id: 'spore', label: 'SPORE', desc: 'Radar green', file: 'spore.png' },
      { id: 'pulse', label: 'PULSE', desc: 'Plasma cloud', file: 'pulse.png' },
    ],
  },
];

export type SpIntelSubtype = { id: string; label: string };

export type SpIntelType = {
  id: string;
  label: string;
  desc: string;
  color: string;
  file: string;
  subtypes: SpIntelSubtype[];
};

export const SP_INTEL_TYPES: SpIntelType[] = [
  {
    id: 'unit',
    label: 'UNIT',
    desc: 'Police / enforcement',
    color: '#7ec8ff',
    file: 'unit.png',
    subtypes: [
      { id: 'visible', label: 'VISIBLE' },
      { id: 'opposite', label: 'OPPOSITE SIDE' },
    ],
  },
  {
    id: 'collision',
    label: 'COLLISION',
    desc: 'Crash on the road',
    color: '#ff3d3d',
    file: 'collision.png',
    subtypes: [
      { id: 'minor', label: 'MINOR' },
      { id: 'major', label: 'MAJOR' },
    ],
  },
  {
    id: 'object',
    label: 'OBJECT',
    desc: 'Tree, tire, rock, debris',
    color: '#ffab00',
    file: 'object.png',
    subtypes: [
      { id: 'debris', label: 'DEBRIS' },
      { id: 'tree', label: 'TREE' },
      { id: 'tire', label: 'BLOWN TIRE' },
      { id: 'rock', label: 'ROCK' },
    ],
  },
  { id: 'construction', label: 'CONSTRUCTION', desc: 'Work zone', color: '#ffab00', file: 'construction.png', subtypes: [] },
  { id: 'closure', label: 'CLOSURE', desc: 'Lane or road closed', color: '#ff3d3d', file: 'closure.png', subtypes: [] },
  {
    id: 'weather',
    label: 'WEATHER',
    desc: 'Flood, hail, ice, wind',
    color: '#ce93d8',
    file: 'weather.png',
    subtypes: [
      { id: 'flood', label: 'FLOODED ROAD' },
      { id: 'hail', label: 'HAIL' },
      { id: 'wind', label: 'HIGH WIND' },
      { id: 'ice', label: 'ICE' },
    ],
  },
  { id: 'disabled', label: 'DISABLED', desc: 'Vehicle stopped', color: '#00e5ff', file: 'disabled.png', subtypes: [] },
  { id: 'pothole', label: 'SURFACE', desc: 'Pothole or damage', color: '#ffab00', file: 'pothole.png', subtypes: [] },
];

export type SpIntelPin = {
  id: string;
  type: string;
  subtype: string | null;
  label: string;
  note: string;
  color: string;
  lat: number;
  lon: number;
  source: 'gps' | 'map';
  ts: number;
};

export function spFindVehicle(id: string | null): SpVehicleItem | null {
  if (!id) {
    return null;
  }
  for (const sec of SP_VEHICLE_SECTIONS) {
    const hit = sec.items.find((it) => it.id === id);
    if (hit) {
      return hit;
    }
  }
  return null;
}

export function spFindIntelType(id: string): SpIntelType | null {
  return SP_INTEL_TYPES.find((t) => t.id === id) ?? null;
}

export function spPruneIntel(list: SpIntelPin[], now = Date.now()): SpIntelPin[] {
  return list.filter((i) => i && typeof i.ts === 'number' && now - i.ts < SP_INTEL_TTL_MS);
}

export function isSpIntelPin(value: unknown): value is SpIntelPin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.type === 'string' &&
    typeof o.label === 'string' &&
    typeof o.lat === 'number' &&
    Number.isFinite(o.lat) &&
    typeof o.lon === 'number' &&
    Number.isFinite(o.lon) &&
    typeof o.ts === 'number' &&
    Number.isFinite(o.ts)
  );
}
