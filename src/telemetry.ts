const EVENTS_URL = "https://core-api.dominic-calandro1991.workers.dev/api/v1/events";
const SOURCE = "storm-path-mobile";

type Severity = "info" | "error" | "high";

export function emitVoltcore(
  type: string,
  severity: Severity,
  payload: Record<string, unknown> = {}
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

async function sampleHealth(): Promise<Record<string, unknown>> {
  let gps_accuracy = 0;
  let nws_radar_status = false;
  let weather_api_health = false;
  try {
    const Loc = await import("expo-location");
    const perm = await Loc.getForegroundPermissionsAsync();
    if (perm.status === "granted") {
      const pos = await Loc.getLastKnownPositionAsync();
      const acc = pos?.coords?.accuracy;
      if (typeof acc === "number" && Number.isFinite(acc)) {
        gps_accuracy = Math.max(0, Math.min(1, 1 - (acc - 5) / 50));
      }
    }
  } catch {
    /* optional */
  }
  try {
    const g = globalThis as typeof globalThis & {
      __spNwsOk?: boolean;
      __spRadarOk?: boolean;
    };
    weather_api_health = Boolean(g.__spNwsOk);
    nws_radar_status = Boolean(g.__spRadarOk ?? g.__spNwsOk);
  } catch {
    /* optional */
  }
  return {
    gps_accuracy,
    nws_radar_status,
    weather_api_health,
    frame_rate: 60,
    surface: "mobile",
  };
}

export function installVoltcoreTelemetry(): void {
  void sampleHealth().then((health) => {
    emitVoltcore("app.event", "info", { status: "boot", ...health });
  });

  const id = setInterval(() => {
    void sampleHealth().then((health) => {
      emitVoltcore("health.heartbeat", "info", health);
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
      });
      if (prev) prev(error, isFatal);
    });
  }
}
