const EVENTS_URL = "https://core-api.dominic-calandro1991.workers.dev/api/v1/events";
const SOURCE = "storm-path-mobile";

export function emitVoltcore(
  type: string,
  severity: "info" | "error" | "low" | "medium" | "high" | "critical",
  payload: Record<string, unknown> = {}
): void {
  try {
    fetch(EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: SOURCE, type, severity, payload }),
    }).catch(() => {});
  } catch {
    /* never throw from telemetry */
  }
}

export function installVoltcoreTelemetry(): void {
  emitVoltcore("app.event", "info", { status: "boot" });

  const g = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  };
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

  if (typeof g.addEventListener === "function") {
    g.addEventListener("unhandledrejection", (event: Event) => {
      const reason = (event as PromiseRejectionEvent).reason;
      emitVoltcore("runtime.error", "error", { reason: String(reason ?? "") });
    });
  }
}
