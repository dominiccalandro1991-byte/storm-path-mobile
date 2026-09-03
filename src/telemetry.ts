const EVENTS_URL = "https://core-api.dominic-calandro1991.workers.dev/api/v1/events";
const SOURCE = "storm-path-mobile";
const NWS_COUNT = "https://api.weather.gov/alerts/active/count";
const RADAR_PROBE =
  "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=WMS&version=1.1.1&request=GetMap&layers=conus_bref_qcd&format=image/png&transparent=true&srs=CRS:84&bbox=-90,37,-88,39&width=64&height=64";
const UA = "StormPath-Mobile/1.0 (voltcore-org telemetry; https://github.com/voltcore-org/storm-path-mobile)";

type Severity = "info" | "error" | "high";

type Flags = {
  weatherOK?: boolean;
  radarOK?: boolean;
  gpsAvailable?: boolean;
  accuracyMeters?: number | null;
};

const live: {
  gpsAccuracy: number;
  gpsState: string;
  nwsOk: boolean | null;
  radarOk: boolean | null;
  fps: number;
} = {
  gpsAccuracy: 0,
  gpsState: "unavailable",
  nwsOk: null,
  radarOk: null,
  fps: 0,
};

export function emitVoltcore(
  type: string,
  severity: Severity,
  payload: Record<string, unknown> = {},
): void {
  try {
    fetch(EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: SOURCE, type, severity, payload }),
    }).catch(() => undefined);
  } catch {
    /* never throw from telemetry */
  }
}

export function accuracyQuality(meters: number | null | undefined): number {
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) return 0;
  return Math.max(0, Math.min(1, 1 - (meters - 5) / 50));
}

export function reportStormPathFlags(flags: Flags): void {
  if (typeof flags.accuracyMeters === "number") {
    live.gpsAccuracy = accuracyQuality(flags.accuracyMeters);
    live.gpsState = flags.gpsAvailable === false ? "unavailable" : "fix";
  } else if (flags.gpsAvailable === false) {
    live.gpsAccuracy = 0;
    live.gpsState = "denied_or_unavailable";
  } else if (flags.gpsAvailable === true) {
    live.gpsState = "fix";
  }
  if (typeof flags.weatherOK === "boolean") live.nwsOk = flags.weatherOK;
  if (typeof flags.radarOK === "boolean") live.radarOk = flags.radarOK;
}

function startFpsSampler(): void {
  const raf = (globalThis as { requestAnimationFrame?: (cb: (t: number) => void) => number }).requestAnimationFrame;
  if (typeof raf !== "function") {
    let ticks = 0;
    const started = Date.now();
    const id = setInterval(() => {
      ticks += 1;
      const elapsed = (Date.now() - started) / 1000;
      if (elapsed >= 1) live.fps = Math.round(ticks / elapsed);
    }, 16);
    const g = globalThis as { __spFpsTimer?: ReturnType<typeof setInterval> };
    if (g.__spFpsTimer) clearInterval(g.__spFpsTimer);
    g.__spFpsTimer = id;
    return;
  }
  let frames = 0;
  let last = 0;
  const tick = (t: number) => {
    if (!last) last = t;
    frames += 1;
    if (t - last >= 1000) {
      live.fps = frames;
      frames = 0;
      last = t;
    }
    raf(tick);
  };
  raf(tick);
}

async function probeNetwork(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(NWS_COUNT, {
      method: "GET",
      headers: { Accept: "application/ld+json", "User-Agent": UA },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (live.nwsOk === null) live.nwsOk = res.ok;
    else live.nwsOk = live.nwsOk || res.ok;
  } catch {
    if (live.nwsOk === null) live.nwsOk = false;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(RADAR_PROBE, { method: "GET", signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) {
      if (live.radarOk === null) live.radarOk = false;
      return;
    }
    const buf = await res.arrayBuffer();
    const ok = buf.byteLength > 32;
    if (live.radarOk === null) live.radarOk = ok;
    else live.radarOk = live.radarOk || ok;
  } catch {
    if (live.radarOk === null) live.radarOk = false;
  }
}

function health(): Record<string, unknown> {
  return {
    status: "live",
    surface: "mobile",
    gps_accuracy: live.gpsAccuracy,
    gps_state: live.gpsState,
    nws_radar_status: Boolean(live.radarOk),
    weather_api_health: Boolean(live.nwsOk),
    frame_rate: live.fps,
  };
}

export function installVoltcoreTelemetry(): void {
  startFpsSampler();
  void probeNetwork().then(() => {
    emitVoltcore("app.event", "info", { status: "boot", ...health() });
  });

  const id = setInterval(() => {
    void probeNetwork().then(() => {
      emitVoltcore("health.heartbeat", "info", health());
    });
  }, 30000);

  const g = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
    __spTelemetryTimer?: ReturnType<typeof setInterval>;
  };
  if (g.__spTelemetryTimer) clearInterval(g.__spTelemetryTimer);
  g.__spTelemetryTimer = id;

  const utils = g.ErrorUtils;
  if (utils?.getGlobalHandler && utils.setGlobalHandler) {
    const prev = utils.getGlobalHandler();
    utils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      const err = error as { message?: string };
      emitVoltcore("runtime.error", "error", {
        message: String(err?.message ?? error),
        fatal: Boolean(isFatal),
        ...health(),
      });
      if (prev) prev(error, isFatal);
    });
  }
}
