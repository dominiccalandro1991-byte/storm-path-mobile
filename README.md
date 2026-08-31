# Storm Path

Native iOS / Android app for weather-aware navigation.

Repository: [dominiccalandro1991-byte/storm-path-mobile](https://github.com/dominiccalandro1991-byte/storm-path-mobile)

This tree is **not** `dominiccalandro1991-byte/storm-path`. The web core is frozen. No file in this repository may mutate the web repo.

## Test it on GitHub

- **Live HUD (this commit, no install):** [jsDelivr HUD](https://cdn.jsdelivr.net/gh/dominiccalandro1991-byte/storm-path-mobile@main/docs/index.html)
- **CI:** Actions tab → `storm-path-mobile-ci` → `engine` job (golden + vector score artifact)
- **Privacy:** [docs/privacy.html](https://github.com/dominiccalandro1991-byte/storm-path-mobile/blob/main/docs/privacy.html)

Allow location on the HUD. Device GNSS is the store binary via `expo-location`. GitHub Pages for this repo needs Settings → Pages → GitHub Actions once (the token in CI cannot create the Pages site).

## What it does

DRIVER / MAP / WEATHER / SETTINGS. Search a US town or address, Start Drive, live NWS alerts, NOAA base-reflectivity radar.

AND-gate:

```
nextState = (GPS && WX && RADAR) ? (lastAlert || normal) : safe
```

Map view default is Murphysboro, Illinois. That default is **view only**. First finite GPS fix is the only legal NWS / NOAA WMS trigger.

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

Vector score must print `PASS` at ≥ 90%.
