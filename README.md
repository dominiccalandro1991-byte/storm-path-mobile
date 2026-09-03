# Storm Path Mobile

Native iOS / Android app for weather-aware navigation.

Repository: [voltcore-org/storm-path-mobile](https://github.com/voltcore-org/storm-path-mobile)

This tree is **not** `voltcore-org/storm-path`. The web core is isolated. No file in this repository may mutate the web repo.

## Test it on GitHub

- **Live HUD:** [https://voltcore-org.github.io/storm-path-mobile/](https://voltcore-org.github.io/storm-path-mobile/)
- **CI:** Actions tab → `storm-path-mobile-ci` → `engine` job (golden + vector score artifact)
- **Privacy:** [docs/privacy.html](https://voltcore-org.github.io/storm-path-mobile/privacy.html)

Allow location on the HUD. Device GNSS is the store binary via `expo-location`. Map view default is Murphysboro, Illinois — view only. IP geolocation is VIEW, never GPS.

## What it does

DRIVER / MAP / WEATHER / SETTINGS. Search a US town or address, Start Drive, live NWS alerts, NOAA base-reflectivity radar.

AND-gate:

```
nextState = (GPS && WX && RADAR) ? (lastAlert || normal) : safe
```

This is not a life-safety system. NWS/NOAA only. Never treat a map view or stale/IP location as live GPS.

## Store packaging

| Field | Value |
|---|---|
| Version | 1.0.0 |
| iOS bundle | `byte.dominiccalandro.stormpathmobile` |
| Android package | `byte.dominiccalandro.stormpathmobile` |
| Stack | Expo SDK 57 / RN 0.86 / TypeScript strict |

Remaining human steps (Apple / Google / Expo accounts) are in `STORE.md`. Those cannot be completed from this repository alone.

## Verify locally

```
npm install --no-audit --no-fund
npm run typecheck
npm run test:golden
npm run test:vector
```

Vector score must print `PASS` at ≥ 90%. Engine checks execute the AND-gate. Runtime checks hit live NWS, NOAA WMS, and OSM. File-presence-only is not a pass.
