import { isSpScreenName, type SpScreenName } from './spTypes';

export const SP_BOOT_SCREEN: SpScreenName = 'map';

/**
 * Pure one-active-screen transition.
 * Invalid name: no-op, current preserved.
 * Same-screen re-entry is a no-op (native map size invalidation is a view concern).
 */
export function switchScreenPure(
  current: SpScreenName,
  name: unknown,
): { next: SpScreenName; changed: boolean; sameReentry: boolean } {
  if (!isSpScreenName(name)) {
    return { next: current, changed: false, sameReentry: false };
  }
  if (name === current) {
    return { next: current, changed: false, sameReentry: true };
  }
  return { next: name, changed: true, sameReentry: false };
}
