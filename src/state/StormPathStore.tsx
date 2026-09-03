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
  type SpNwsAlert,
  type SpNwsHourlyChips,
  type SpScreenName,
  type SpSourceMap,
  type SpStateKey,
  type SpStateRecord,
  type SpValidatedConfidence,
} from '../core/spTypes';
import { nextWeatherBackoffMs, spFetchWeather } from '../net/spNWS';
import { buildRadarWmsUrl, probeRadarDecode, radarBoundsFromFix } from '../net/spRadar';
import { CHIP_QUERIES, fetchDrivingRoute, isSpPlace, searchPlaces, type SpPlace, type SpRoute } from '../net/spGeocode';
import { readCurrentFix, requestForegroundLocation, watchFixes } from '../location/spLocation';
import {
  spHwMarkBoot,
  spHwMarkFix,
  spHwMarkGpsFail,
  spHwMarkPermission,
} from '../diagnostics/spHardwareLog';
import { reportStormPathFlags } from '../telemetry';

export type SpeedUnits = 'MPH' | 'KMH';

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
  alerts: SpNwsAlert[];
  radarUrl: string | null;
  mapLayoutOk: boolean;
  pressureChip: 'N/A';
  visibilityChip: 'N/A';
  capeChip: 'N/A';
  destination: SpPlace | null;
  route: SpRoute | null;
  driving: boolean;
  recents: SpPlace[];
  saved: { home: SpPlace | null; work: SpPlace | null };
  searchOpen: boolean;
  searchHits: SpPlace[];
  searchStatus: string;
  speedUnits: SpeedUnits;
  showLabels: boolean;
  showLimit: boolean;
  toast: string;
  clock: string;
};

type StormContextValue = {
  snapshot: StormSnapshot;
  spSetState: (stateKey: SpStateKey) => void;
  switchScreen: (name: unknown) => void;
  spRecomputeState: () => void;
  markMapLayout: (ok: boolean) => void;
  requestGps: () => void;
  setSearchOpen: (open: boolean) => void;
  runSearch: (query: string) => Promise<void>;
  startDrive: (place: SpPlace) => Promise<void>;
  clearDestination: () => void;
  chipSearch: (kind: string) => Promise<string | null>;
  saveSlot: (slot: 'home' | 'work', place: SpPlace | null) => void;
  toggleUnits: () => void;
  toggleLabels: () => void;
  toggleLimit: () => void;
  clearRecents: () => void;
  clearSaved: () => void;
  clearIntel: () => void;
  clearPlans: () => void;
  showToast: (msg: string) => void;
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

export function formatSpeed(coords: SpCoords | null, gpsAvailable: boolean, units: SpeedUnits): string {
  if (!gpsAvailable || !coords || coords.speed == null || !Number.isFinite(coords.speed) || coords.speed < 0) {
    return '--';
  }
  const mph = coords.speed * 2.236936;
  if (units === 'KMH') {
    return String(Math.round(mph * 1.60934));
  }
  return String(Math.round(mph));
}

function clockNow(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
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
  const [alerts, setAlerts] = useState<SpNwsAlert[]>([]);
  const [radarUrl, setRadarUrl] = useState<string | null>(null);
  const [destination, setDestination] = useState<SpPlace | null>(null);
  const [route, setRoute] = useState<SpRoute | null>(null);
  const [driving, setDriving] = useState(false);
  const [recents, setRecents] = useState<SpPlace[]>([]);
  const [saved, setSaved] = useState<{ home: SpPlace | null; work: SpPlace | null }>({ home: null, work: null });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHits, setSearchHits] = useState<SpPlace[]>([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [speedUnits, setSpeedUnits] = useState<SpeedUnits>('MPH');
  const [showLabels, setShowLabels] = useState(true);
  const [showLimit, setShowLimit] = useState(true);
  const [toast, setToast] = useState('');
  const [clock, setClock] = useState(clockNow);

  const weatherInFlight = useRef(false);
  const weatherTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    destination: null as SpPlace | null,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  const persistJson = useCallback(async (key: string, value: unknown) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn('SP_LS_QUOTA_OR_WRITE');
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
    setActiveScreen((current) => switchScreenPure(current, name).next);
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
    if (weatherInFlight.current || !flagsRef.current.gpsAvailable) {
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
      setAlerts(result.alerts);
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

  const maybeRoute = useCallback(async (fix: SpCoords, dest: SpPlace | null) => {
    if (!dest) {
      return;
    }
    const next = await fetchDrivingRoute(fix, dest);
    if (next) {
      setRoute(next);
    }
  }, []);

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
      void maybeRoute(fix, flagsRef.current.destination);
      spRecomputeState();
    },
    [maybeRoute, runRadar, runWeather, spRecomputeState],
  );

  const failGps = useCallback(() => {
    spHwMarkGpsFail('location_unavailable_or_denied');
    flagsRef.current.gpsAvailable = false;
    flagsRef.current.coords = null;
    setGpsAvailable(false);
    setCoords(null);
    spRecomputeState();
  }, [spRecomputeState]);

  const bootLocation = useCallback(async () => {
    const permitted = await requestForegroundLocation();
    spHwMarkPermission(permitted);
    if (!permitted) {
      failGps();
      return;
    }
    try {
      const first = await readCurrentFix();
      if (!first) {
        failGps();
        return;
      }
      acceptFix(first);
    } catch {
      failGps();
      return;
    }
    watchRef.current?.remove();
    watchRef.current = watchFixes(acceptFix, failGps);
  }, [acceptFix, failGps]);

  const requestGps = useCallback(() => {
    void bootLocation();
  }, [bootLocation]);

  useEffect(() => {
    flagsRef.current.gpsAvailable = gpsAvailable;
    flagsRef.current.weatherOK = weatherOK;
    flagsRef.current.radarOK = radarOK;
    flagsRef.current.lastAlertState = lastAlertState;
    flagsRef.current.liveSources = liveSources;
    flagsRef.current.startupSafe = startupSafe;
    flagsRef.current.coords = coords;
    flagsRef.current.destination = destination;
  }, [coords, destination, gpsAvailable, lastAlertState, liveSources, radarOK, startupSafe, weatherOK]);

  useEffect(() => {
    reportStormPathFlags({
      weatherOK,
      radarOK,
      gpsAvailable,
      accuracyMeters: coords && typeof coords.accuracy === 'number' ? coords.accuracy : null,
    });
  }, [coords, gpsAvailable, radarOK, weatherOK]);

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
    let cancelled = false;
    (async () => {
      try {
        const recRaw = await AsyncStorage.getItem('sp.recents.v1');
        const savRaw = await AsyncStorage.getItem('sp.saved.v1');
        const setRaw = await AsyncStorage.getItem('sp.settings.v1');
        const recParsed = parseLsValue('sp.recents.v1', recRaw);
        const savParsed = parseLsValue('sp.saved.v1', savRaw);
        const setParsed = parseLsValue('sp.settings.v1', setRaw);
        if (!cancelled && Array.isArray(recParsed)) {
          setRecents(recParsed.filter(isSpPlace).slice(0, 8));
        }
        if (!cancelled && savParsed && typeof savParsed === 'object') {
          const rec = savParsed as Record<string, unknown>;
          setSaved({
            home: isSpPlace(rec.home) ? rec.home : null,
            work: isSpPlace(rec.work) ? rec.work : null,
          });
        }
        if (!cancelled && setParsed && typeof setParsed === 'object') {
          const rec = setParsed as Record<string, unknown>;
          if (rec.units === 'KMH' || rec.units === 'MPH') {
            setSpeedUnits(rec.units);
          }
          if (typeof rec.showLabels === 'boolean') {
            setShowLabels(rec.showLabels);
          }
          if (typeof rec.showLimit === 'boolean') {
            setShowLimit(rec.showLimit);
          }
        }
        for (const key of Object.keys(SP_LS_SCHEMA)) {
          const raw = await AsyncStorage.getItem(key);
          parseLsValue(key, raw);
        }
      } catch {
        console.warn('SP_LS_QUOTA_OR_READ');
      }
    })();
    spHwMarkBoot();
    void bootLocation();
    const tick = setInterval(() => setClock(clockNow()), 1000);
    return () => {
      cancelled = true;
      watchRef.current?.remove();
      if (weatherTimer.current) {
        clearTimeout(weatherTimer.current);
      }
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      clearInterval(tick);
    };
  }, [bootLocation]);

  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearchStatus('');
      return;
    }
    setSearchStatus('SEARCHING');
    const bias = flagsRef.current.coords;
    const hits = await searchPlaces(q, bias);
    setSearchHits(hits);
    setSearchStatus(hits.length ? `${hits.length} RESULTS` : 'NO MATCH');
  }, []);

  const startDrive = useCallback(async (place: SpPlace) => {
    flagsRef.current.destination = place;
    setDestination(place);
    setDriving(true);
    setSearchOpen(false);
    setSearchHits([]);
    setRecents((prev) => {
      const next = [place, ...prev.filter((p) => p.label !== place.label)].slice(0, 8);
      void persistJson('sp.recents.v1', next);
      return next;
    });
    const fix = flagsRef.current.coords;
    if (fix && flagsRef.current.gpsAvailable) {
      const next = await fetchDrivingRoute(fix, place);
      setRoute(next);
      showToast(next ? `DRIVE TO ${place.label.toUpperCase()}` : 'DESTINATION SET · ROUTE WAIT');
    } else {
      setRoute(null);
      showToast('DESTINATION SET · AWAITING GPS FOR ROUTE');
    }
  }, [persistJson, showToast]);

  const clearDestination = useCallback(() => {
    flagsRef.current.destination = null;
    setDestination(null);
    setRoute(null);
    setDriving(false);
    showToast('DRIVE ENDED');
  }, [showToast]);

  const chipSearch = useCallback(async (kind: string): Promise<string | null> => {
    if (kind === 'home' && saved.home) {
      return 'saved-home';
    }
    if (kind === 'work' && saved.work) {
      return 'saved-work';
    }
    const q = CHIP_QUERIES[kind];
    if (!q) {
      return null;
    }
    await runSearch(q);
    return 'search';
  }, [runSearch, saved.home, saved.work]);

  const saveSlot = useCallback((slot: 'home' | 'work', place: SpPlace | null) => {
    setSaved((prev) => {
      const next = { ...prev, [slot]: place };
      void persistJson('sp.saved.v1', next);
      return next;
    });
    showToast(place ? `${slot.toUpperCase()} SAVED` : `${slot.toUpperCase()} CLEARED`);
  }, [persistJson, showToast]);

  const persistSettings = useCallback((next: { units: SpeedUnits; showLabels: boolean; showLimit: boolean }) => {
    void persistJson('sp.settings.v1', next);
  }, [persistJson]);

  const toggleUnits = useCallback(() => {
    setSpeedUnits((prev) => {
      const units = prev === 'MPH' ? 'KMH' : 'MPH';
      persistSettings({ units, showLabels, showLimit });
      return units;
    });
  }, [persistSettings, showLabels, showLimit]);

  const toggleLabels = useCallback(() => {
    setShowLabels((prev) => {
      persistSettings({ units: speedUnits, showLabels: !prev, showLimit });
      return !prev;
    });
  }, [persistSettings, showLimit, speedUnits]);

  const toggleLimit = useCallback(() => {
    setShowLimit((prev) => {
      persistSettings({ units: speedUnits, showLabels, showLimit: !prev });
      return !prev;
    });
  }, [persistSettings, showLabels, speedUnits]);

  const clearRecents = useCallback(() => {
    setRecents([]);
    void persistJson('sp.recents.v1', []);
    showToast('RECENTS CLEARED');
  }, [persistJson, showToast]);

  const clearSaved = useCallback(() => {
    const next = { home: null, work: null };
    setSaved(next);
    void persistJson('sp.saved.v1', next);
    showToast('SAVED PLACES CLEARED');
  }, [persistJson, showToast]);

  const clearIntel = useCallback(() => {
    void persistJson('sp.intel.v1', []);
    showToast('DRIVER INTEL CLEARED');
  }, [persistJson, showToast]);

  const clearPlans = useCallback(() => {
    void persistJson('sp.plans.v1', []);
    showToast('PLANS CLEARED');
  }, [persistJson, showToast]);

  const { record, validated } = runtimeRecord(driverState, liveSources, startupSafe);

  const snapshot = useMemo<StormSnapshot>(
    () => ({
      driverState,
      record,
      validated,
      activeScreen,
      gpsAvailable,
      weatherOK,
      radarOK,
      lastAlertState,
      coords,
      liveSources,
      startupSafe,
      startupCodes,
      weatherMirrorState: startupSafe || driverState === 'safe' ? 'SAFE MODE' : record.label,
      weatherMirrorConf: formatConfidenceMirror(validated),
      hourly,
      alerts,
      radarUrl,
      mapLayoutOk,
      pressureChip: 'N/A',
      visibilityChip: 'N/A',
      capeChip: 'N/A',
      destination,
      route,
      driving,
      recents,
      saved,
      searchOpen,
      searchHits,
      searchStatus,
      speedUnits,
      showLabels,
      showLimit,
      toast,
      clock,
    }),
    [
      activeScreen,
      alerts,
      clock,
      coords,
      destination,
      driverState,
      driving,
      gpsAvailable,
      hourly,
      lastAlertState,
      liveSources,
      mapLayoutOk,
      radarOK,
      radarUrl,
      recents,
      record,
      route,
      saved,
      searchHits,
      searchOpen,
      searchStatus,
      showLabels,
      showLimit,
      speedUnits,
      startupCodes,
      startupSafe,
      toast,
      validated,
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
      requestGps,
      setSearchOpen,
      runSearch,
      startDrive,
      clearDestination,
      chipSearch,
      saveSlot,
      toggleUnits,
      toggleLabels,
      toggleLimit,
      clearRecents,
      clearSaved,
      clearIntel,
      clearPlans,
      showToast,
      mapViewDefault: SP_MAP_VIEW_DEFAULT,
    }),
    [
      chipSearch,
      clearDestination,
      clearIntel,
      clearPlans,
      clearRecents,
      clearSaved,
      markMapLayout,
      requestGps,
      runSearch,
      saveSlot,
      showToast,
      snapshot,
      spRecomputeState,
      spSetState,
      startDrive,
      switchScreen,
      toggleLabels,
      toggleLimit,
      toggleUnits,
    ],
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
