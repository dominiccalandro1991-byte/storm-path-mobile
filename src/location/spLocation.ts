import * as Location from 'expo-location';
import { spIsFiniteNumber, type SpCoords } from '../core/spTypes';

export async function requestForegroundLocation(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === Location.PermissionStatus.GRANTED) {
    return true;
  }
  const asked = await Location.requestForegroundPermissionsAsync();
  return asked.status === Location.PermissionStatus.GRANTED;
}

export function coordsFromExpo(loc: Location.LocationObject): SpCoords | null {
  const lat = loc.coords.latitude;
  const lon = loc.coords.longitude;
  if (!spIsFiniteNumber(lat) || !spIsFiniteNumber(lon)) {
    return null;
  }
  const speed = loc.coords.speed;
  return {
    latitude: lat,
    longitude: lon,
    speed: spIsFiniteNumber(speed) ? speed : null,
    accuracy: spIsFiniteNumber(loc.coords.accuracy) ? loc.coords.accuracy : null,
    timestamp: loc.timestamp,
  };
}

export async function readCurrentFix(): Promise<SpCoords | null> {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return coordsFromExpo(loc);
}

export function watchFixes(onFix: (coords: SpCoords) => void, onError: () => void): { remove: () => void } {
  let sub: Location.LocationSubscription | null = null;
  Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 15,
      timeInterval: 4000,
    },
    (loc) => {
      const parsed = coordsFromExpo(loc);
      if (parsed) {
        onFix(parsed);
      }
    },
  )
    .then((subscription) => {
      sub = subscription;
    })
    .catch(() => {
      onError();
    });
  return {
    remove: () => {
      if (sub) {
        sub.remove();
      }
    },
  };
}
