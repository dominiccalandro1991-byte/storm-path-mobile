import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SP_STARTUP_SAFE_FALLBACK, SP_STATES } from '../core/spStates';
import { spValidateConfidence, formatConfidenceMirror } from '../core/spConfidence';
import { createInitialLiveSources, spPromoteLiveSource, spSourcesForState } from '../core/spSources';
import { spEvaluateAlertState } from '../core/spAlerts';
import { spComputeNextState } from '../core/spRecompute';
import { switchScreenPure } from '../core/spScreens';
import { runStartupSafetyChecks } from '../core/spStartup';
import { runGoldenInvariantChecks } from '../core/spGoldenChecks';
import { parseLsValue } from '../core/spPersistence';
import {
  SP_LS_SCHEMA,
  SP_MAP_VIEW_DEFAULT,
  SP_WEATHER_REFRESH_OK_MS,
  type SpAlertDerivedState,
  type SpCoords,
  type SpNwsHourlyChips,
  type SpScreenName,
  type SpSourceMap,
  type SpStateKey,
  type SpStateRecord,
  type SpValidatedConfidence,
} from '../core/spTypes';
import { nextWeatherBackoffMs, spFetchWeather } from '../net/spNWS';
import { buildRadarWmsUrl, probeRadarDecode, radarBoundsFromFix } from '../net/spRadar';
import { readCurrentFix, requestForegroundLocation, watchFixes } from '../location/spLocation';
import {
  spHwMarkBoot,
  spHwMarkFix,
  spHwMarkGpsFail,
  spHwMarkPermission,
} from '../diagnostics/spHardwareLog';

export type StormSnapshot = {
  driverState: SpStateKey;
  record: SpStateRecord;
  validated: SpValidatedConfidence;
  activeScreen: SpScreenName;
  gpsAvailable: boolean;
  weatherOK: boolean;
  radarOK: boolean;
  lastAlertState: SpAlertDerivedState | null;
  coords: SpCoords | null;
  liveSources: SpSourceMap;
  startupSafe: boolean;
  startupCodes: string[];
  weatherMirrorState: string;
  weatherMirrorConf: string;
  hourly: SpNwsHourlyChips | null;
  radarUrl: string | null;
  mapLayoutOk: boolean;
  pressureChip: 'N/A';
  visibilityChip: 'N/A';
  capeChip: 'N/A';
};

type StormContextValue = {
  snapshot: StormSnapshot;
  spSetState: (stateKey: SpStateKey) => void;
  switchScreen: (name: unknown) => void;
  spRecomputeState: () => void;
  markMapLayout: (ok: boolean) => void;
  mapViewDefault: typeof SP_MAP_VIEW_DEFAULT;
};

const StormContext = createContext<StormContextValue | null>(null);

function runtimeRecord(
  key: SpStateKey,
  live: SpSourceMap,
  startupSafe: boolean,
): { record: SpStateRecord; validated: SpValidatedConfidence } {
  const base = startupSafe ? SP_STARTUP_SAFE_FALLBACK : SP_STATES[key];
  const sources = startupSafe ? base.sources : spSourcesForState(base.sources, live);
  const record: SpStateRecord = { ...base, sources };
  const validated = spValidateConfidence(record);
  return { record: { ...record, ...validated, sources: validated.sources }, validated };
}

function buildSnapshot(args: {
  driverState: SpStateKey;
  activeScreen: SpScreenName;
  gpsAvailable: boolean;
  weatherOK: boolean;
  radarOK: boolean;
  lastAlertState: SpAlertDerivedState | null;
  coords: SpCoords | null;
  liveSources: SpSourceMap;
  startupSafe: boolean;
  startupCodes: string[];
  hourly: SpNwsHourlyChips | null;
  radarUrl: string | null;
  mapLayoutOk: boolean;
}): StormSnapshot {
  const { record, validated } = runtimeRecord(args.driverState, args.liveSources, args.startupSafe);
  return {
    ...args,
    record,
    validated,
    weatherMirrorState: args.startupSafe || args.driverState === 'safe' ? 'SAFE MODE' : record.label,
    weatherMirrorConf: formatConfidenceMirror(validated),
    pressureChip: 'N/A',
    visibilityChip: 'N/A',
    capeChip: 'N/A',
  };
}

export function StormPathProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [mapLayoutOk, setMapLayoutOk] = useState(false);
  const [activeScreen, setActiveScreen] = useState<SpScreenName>('map');
  const [driverState, setDriverState] = useState<SpStateKey>('safe');
  const [gpsAvailable, setGpsAvailable] = useState(false);
  const [weatherOK, setWeatherOK] = useState(false);
  const [radarOK, setRadarOK] = useState(false);
  const [lastAlertState, setLastAlertState] = useState<SpAlertDerivedState | null>(null);
  const [coords, setCoords] = useState<SpCoords | null>(null);
  const [liveSources, setLiveSources] = useState<SpSourceMap>(createInitialLiveSources);
  const [startupSafe, setStartupSafe] = useState(false);
  const [startupCodes, setStartupCodes] = useState<string[]>([]);
  const [hourly, setHourly] = useState<SpNwsHourlyChips | null>(null);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);

  const weatherInFlight = useRef(false);
  const weatherTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weatherFails = useRef(0);
  const watchRef = useRef<{ remove: () => void } | null>(null);
  const flagsRef = useRef({
    gpsAvailable: false,
    weatherOK: false,
    radarOK: false,
    lastAlertState: null as SpAlertDerivedState | null,
    liveSources: createInitialLiveSources(),
    startupSafe: false,
    coords: null as SpCoords | null,
  });

  const persistOptionalCaches = useCallback(async () => {
    try {
      for (const key of Object.keys(SP_LS_SCHEMA)) {
        const raw = await AsyncStorage.getItem(key);
        parseLsValue(key, raw);
      }
    } catch {
      console.warn('SP_LS_QUOTA_OR_READ');
    }
  }, []);

  const spSetState = useCallback((stateKey: SpStateKey) => {
    if (flagsRef.current.startupSafe) {
      setDriverState('safe');
      return;
    }
    setDriverState(stateKey);
  }, []);

  const spRecomputeState = useCallback(() => {
    if (flagsRef.current.startupSafe) {
      setDriverState('safe');
      return;
    }
    const next = spComputeNextState({
      spGPSAvailable: flagsRef.current.gpsAvailable,
      spWeatherOK: flagsRef.current.weatherOK,
      spRadarOK: flagsRef.current.radarOK,
      spLastAlertState: flagsRef.current.lastAlertState,
    });
    setDriverState(next);
  }, []);

  const switchScreen = useCallback((name: unknown) => {
    setActiveScreen((current) => {
      const result = switchScreenPure(current, name);
      return result.next;
    });
  }, []);

  const markMapLayout = useCallback((ok: boolean) => {
    setMapLayoutOk(ok);
  }, []);

  const runRadar = useCallback(async (fix: SpCoords) => {
    const bounds = radarBoundsFromFix(fix.latitude, fix.longitude);
    if (!bounds) {
      flagsRef.current.radarOK = false;
      setRadarOK(false);
      setRadarUrl(null);
      setLiveSources((prev) => {
        const next = spPromoteLiveSource(prev, 'NOAA', 'unavailable');
        flagsRef.current.liveSources = next;
        return next;
      });
      spRecomputeState();
      return;
    }
    const url = buildRadarWmsUrl(bounds);
    if (!url) {
      flagsRef.current.radarOK = false;
      setRadarOK(false);
      setRadarUrl(null);
      setLiveSources((prev) => {
        const next = spPromoteLiveSource(prev, 'NOAA', 'unavailable');
        flagsRef.current.liveSources = next;
        return next;
      });
      spRecomputeState();
      return;
    }
    const decoded = await probeRadarDecode(url);
    flagsRef.current.radarOK = decoded;
    setRadarOK(decoded);
    setRadarUrl(decoded ? url : null);
    setLiveSources((prev) => {
      const next = spPromoteLiveSource(prev, 'NOAA', decoded ? 'connected' : 'unavailable');
      flagsRef.current.liveSources = next;
      return next;
    });
    spRecomputeState();
  }, [spRecomputeState]);

  const runWeather = useCallback(async (fix: SpCoords) => {
    if (weatherInFlight.current) {
      return;
    }
    if (!flagsRef.current.gpsAvailable) {
      return;
    }
    weatherInFlight.current = true;
    const result = await spFetchWeather(fix.latitude, fix.longitude);
    weatherInFlight.current = false;
    if (result.ok) {
      weatherFails.current = 0;
      flagsRef.current.weatherOK = true;
      setWeatherOK(true);
      setHourly(result.hourly);
      const evaluated = spEvaluateAlertState(result.alerts);
      flagsRef.current.lastAlertState = evaluated;
      setLastAlertState(evaluated);
      setLiveSources((prev) => {
        const next = spPromoteLiveSource(prev, 'NWS', 'connected');
        flagsRef.current.liveSources = next;
        return next;
      });
      spRecomputeState();
      if (weatherTimer.current) {
        clearTimeout(weatherTimer.current);
      }
      weatherTimer.current = setTimeout(() => {
        const latest = flagsRef.current.coords;
        if (latest && flagsRef.current.gpsAvailable) {
          void runWeather(latest);
        }
      }, SP_WEATHER_REFRESH_OK_MS);
    } else {
      weatherFails.current += 1;
      flagsRef.current.weatherOK = false;
      setWeatherOK(false);
      setLiveSources((prev) => {
        const next = spPromoteLiveSource(prev, 'NWS', 'unavailable');
        flagsRef.current.liveSources = next;
        return next;
      });
      spRecomputeState();
      if (weatherTimer.current) {
        clearTimeout(weatherTimer.current);
      }
      weatherTimer.current = setTimeout(() => {
        const latest = flagsRef.current.coords;
        if (latest && flagsRef.current.gpsAvailable) {
          void runWeather(latest);
        }
      }, nextWeatherBackoffMs(weatherFails.current));
    }
  }, [spRecomputeState]);

  const acceptFix = useCallback(
    (fix: SpCoords) => {
      if (!spHwMarkFix(fix)) {
        return;
      }
      flagsRef.current.coords = fix;
      flagsRef.current.gpsAvailable = true;
      setCoords(fix);
      setGpsAvailable(true);
      void runWeather(fix);
      void runRadar(fix);
      spRecomputeState();
    },
    [runRadar, runWeather, spRecomputeState],
  );

  const failGps = useCallback(() => {
    spHwMarkGpsFail('location_unavailable_or_denied');
    flagsRef.current.gpsAvailable = false;
    flagsRef.current.coords = null;
    setGpsAvailable(false);
    setCoords(null);
    spRecomputeState();
  }, [spRecomputeState]);

  useEffect(() => {
    flagsRef.current.gpsAvailable = gpsAvailable;
    flagsRef.current.weatherOK = weatherOK;
    flagsRef.current.radarOK = radarOK;
    flagsRef.current.lastAlertState = lastAlertState;
    flagsRef.current.liveSources = liveSources;
    flagsRef.current.startupSafe = startupSafe;
    flagsRef.current.coords = coords;
  }, [coords, gpsAvailable, lastAlertState, liveSources, radarOK, startupSafe, weatherOK]);

  useEffect(() => {
    const golden = runGoldenInvariantChecks();
    const checks = runStartupSafetyChecks({ mapLayoutOk });
    const codes = [...checks.codes, ...golden.map((code) => `GOLDEN_${code}`)];
    const failed = codes.length > 0;
    setStartupCodes(codes);
    setStartupSafe(failed);
    flagsRef.current.startupSafe = failed;
    if (failed) {
      console.warn('SP_STARTUP_SAFE', codes);
      setDriverState('safe');
    }
  }, [mapLayoutOk]);

  useEffect(() => {
    void persistOptionalCaches();
    spHwMarkBoot();
    let cancelled = false;
    (async () => {
      const permitted = await requestForegroundLocation();
      if (cancelled) {
        return;
      }
      spHwMarkPermission(permitted);
      if (!permitted) {
        failGps();
        return;
      }
      try {
        const first = await readCurrentFix();
        if (cancelled) {
          return;
        }
        if (!first) {
          failGps();
          return;
        }
        acceptFix(first);
      } catch {
        failGps();
        return;
      }
      watchRef.current = watchFixes(acceptFix, failGps);
    })();
    return () => {
      cancelled = true;
      watchRef.current?.remove();
      if (weatherTimer.current) {
        clearTimeout(weatherTimer.current);
      }
    };
  }, [acceptFix, failGps, persistOptionalCaches]);

  const snapshot = useMemo(
    () =>
      buildSnapshot({
        driverState,
        activeScreen,
        gpsAvailable,
        weatherOK,
        radarOK,
        lastAlertState,
        coords,
        liveSources,
        startupSafe,
        startupCodes,
        hourly,
        radarUrl,
        mapLayoutOk,
      }),
    [
      activeScreen,
      coords,
      driverState,
      gpsAvailable,
      hourly,
      lastAlertState,
      liveSources,
      mapLayoutOk,
      radarOK,
      radarUrl,
      startupCodes,
      startupSafe,
      weatherOK,
    ],
  );

  const value = useMemo(
    () => ({
      snapshot,
      spSetState,
      switchScreen,
      spRecomputeState,
      markMapLayout,
      mapViewDefault: SP_MAP_VIEW_DEFAULT,
    }),
    [markMapLayout, snapshot, spRecomputeState, spSetState, switchScreen],
  );

  return <StormContext.Provider value={value}>{children}</StormContext.Provider>;
}

export function useStormPath(): StormContextValue {
  const ctx = useContext(StormContext);
  if (!ctx) {
    throw new Error('StormPathProvider required');
  }
  return ctx;
}
