# Storm-Path Mobile

Isolated React Native (Expo) port of Storm-Path.

This repository is **not** `dominiccalandro1991-byte/storm-path`. The web core is frozen. No file, commit, symlink, or workflow in this tree may mutate the web repository.

## Locked stack

| Layer | Implementation |
|---|---|
| Language | TypeScript 5.x, `strict: true` |
| Runtime | Expo SDK 57 / React Native 0.86 |
| State | React Context SSOT (`StormPathProvider`) |
| Map | `react-native-maps` + NOAA WMS `Overlay` |
| Location | `expo-location` foreground high-accuracy |
| Weather | `https://api.weather.gov/` only via `spNWSFetch` |
| Radar | NOAA OpenGeo `conus_bref_qcd` GetMap CRS:84 |
| Persistence | AsyncStorage + closed `SP_LS_SCHEMA` |

## Immutable symbols (1:1 with Layer 1)

- `SP_STATES`, `spSetState`, `spValidateConfidence`, `spNormalizeSourceStatuses`
- `switchScreen` / `SP_VALID_SCREENS` (boot screen `map`)
- `spNWSFetch`, `spFetchWeather`, `spClassifyAlert`, `spEvaluateAlertState`, `spRecomputeState`

## AND-gate

```
nextState = (spGPSAvailable && spWeatherOK && spRadarOK)
  ? (spLastAlertState || 'normal')
  : 'safe'
```

Alert-derived paint is illegal unless all three flags are true. Prototype-only sources cannot emit HIGH or MEDIUM.

## Initialize on a workstation

See `INIT-COMMANDS.md`. Do not run those commands against the web repository.

## Honest non-goals

- Pressure / visibility / CAPE from NWS hourly: missing by contract, chips stay `N/A`
- Cached NWS rules for true `offline`: missing
- Live DOT / emergency-management / road-closure / shelter feeds: stay prototype
- Fastlane store deploy: later sprint
