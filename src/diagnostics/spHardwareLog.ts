/**
 * Hardware-validation probe. Outer adapter only.
 * Does not own driver state, screens, or confidence.
 * First finite GPS fix is the exclusive legal trigger for NWS / NOAA I/O.
 */
import { spIsFiniteNumber, type SpCoords } from '../core/spTypes';

export type SpHardwareSnapshot = {
  bootMs: number;
  firstFixMs: number | null;
  lastFix: SpCoords | null;
  permissionGranted: boolean | null;
  illegalIoCount: number;
  nwsAfterFix: number;
  radarAfterFix: number;
  lastNwsUrl: string | null;
  lastRadarUrl: string | null;
};

const state: SpHardwareSnapshot = {
  bootMs: Date.now(),
  firstFixMs: null,
  lastFix: null,
  permissionGranted: null,
  illegalIoCount: 0,
  nwsAfterFix: 0,
  radarAfterFix: 0,
  lastNwsUrl: null,
  lastRadarUrl: null,
};

function stamp(): string {
  return new Date().toISOString();
}

export function spHwSnapshot(): SpHardwareSnapshot {
  return { ...state, lastFix: state.lastFix ? { ...state.lastFix } : null };
}

export function spHwHasFiniteFix(): boolean {
  return state.firstFixMs !== null && state.lastFix !== null;
}

export function spHwMarkBoot(): void {
  state.bootMs = Date.now();
  console.log(`SP_HW BOOT t=${stamp()} gps=false weatherIO=blocked radarIO=blocked murphysboroViewOnly=true`);
}

export function spHwMarkPermission(granted: boolean): void {
  state.permissionGranted = granted;
  console.log(`SP_HW PERM t=${stamp()} granted=${granted}`);
}

export function spHwMarkFix(fix: SpCoords): boolean {
  if (!spIsFiniteNumber(fix.latitude) || !spIsFiniteNumber(fix.longitude)) {
    console.error(`SP_HW FIX_REJECTED t=${stamp()} reason=NON_FINITE`);
    return false;
  }
  const first = state.firstFixMs === null;
  if (first) {
    state.firstFixMs = Date.now();
  }
  state.lastFix = fix;
  console.log(
    `SP_HW FIX t=${stamp()} first=${first} lat=${fix.latitude.toFixed(6)} lon=${fix.longitude.toFixed(6)} acc=${fix.accuracy ?? 'null'}`,
  );
  return true;
}

export function spHwMarkGpsFail(reason: string): void {
  console.warn(`SP_HW GPS_FAIL t=${stamp()} reason=${reason}`);
}

export function spHwAssertIo(channel: 'NWS' | 'RADAR', url: string): void {
  const legal = spHwHasFiniteFix();
  if (channel === 'NWS') {
    state.lastNwsUrl = url;
  } else {
    state.lastRadarUrl = url;
  }
  if (!legal) {
    state.illegalIoCount += 1;
    console.error(`SP_HW ILLEGAL_IO t=${stamp()} channel=${channel} url=${url}`);
    throw new Error('SP_HW_IO_BEFORE_FINITE_FIX');
  }
  if (channel === 'NWS') {
    state.nwsAfterFix += 1;
  } else {
    state.radarAfterFix += 1;
  }
  const fix = state.lastFix;
  console.log(
    `SP_HW ${channel} t=${stamp()} legal=true lat=${fix?.latitude.toFixed(6)} lon=${fix?.longitude.toFixed(6)} url=${url}`,
  );
}

export function spHwFormatSettingsDump(): string {
  const snap = spHwSnapshot();
  const fix = snap.lastFix
    ? `${snap.lastFix.latitude.toFixed(4)},${snap.lastFix.longitude.toFixed(4)}`
    : 'null';
  return [
    `gateFix=${snap.firstFixMs === null ? 'CLOSED' : 'OPEN'}`,
    `perm=${snap.permissionGranted === null ? 'unknown' : String(snap.permissionGranted)}`,
    `fix=${fix}`,
    `nwsAfterFix=${snap.nwsAfterFix}`,
    `radarAfterFix=${snap.radarAfterFix}`,
    `illegalIo=${snap.illegalIoCount}`,
  ].join(' | ');
}
