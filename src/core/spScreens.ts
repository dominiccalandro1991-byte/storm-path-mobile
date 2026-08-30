import { isSpScreenName, type SpScreenName } from './spTypes';

export const SP_BOOT_SCREEN: SpScreenName = 'map';

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
