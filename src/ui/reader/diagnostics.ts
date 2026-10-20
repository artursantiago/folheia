import { createBudget, currentEnvironment } from '../../render/budget';

/** A plain-text report the user can paste in a GitHub issue. No file content or names. */
export function diagnostics(extra: Record<string, unknown> = {}): string {
  const env = currentEnvironment();
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  const report = {
    app: `Folheia ${__APP_VERSION__} (${__APP_CHANNEL__} · ${__APP_BUILD__})`,
    userAgent: env.userAgent,
    platform: env.platform,
    touchPoints: env.maxTouchPoints,
    deviceMemoryGb: env.deviceMemory ?? null,
    pixelRatio: window.devicePixelRatio,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    jsHeapMb: memory ? Math.round(memory.usedJSHeapSize / 1048576) : null,
    budget: createBudget(env),
    ...extra,
  };
  return JSON.stringify(report, null, 2);
}
