import { SP_LS_SCHEMA, type SpLsKey } from './spTypes';

export function spLsSchemaOk(key: string, value: unknown): boolean {
  if (!(key in SP_LS_SCHEMA)) {
    return false;
  }
  const kind = SP_LS_SCHEMA[key as SpLsKey];
  if (kind === 'array') {
    return Array.isArray(value);
  }
  if (kind === 'object') {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  if (kind === 'string') {
    return typeof value === 'string';
  }
  return false;
}

export function parseLsValue(key: string, raw: string | null): unknown {
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return spLsSchemaOk(key, parsed) ? parsed : null;
}
