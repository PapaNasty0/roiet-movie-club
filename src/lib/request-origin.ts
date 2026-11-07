/**
 * Public site origin for OAuth redirects and email links.
 * App Hosting / Cloud Run often sets request.url to http://0.0.0.0:8080
 * or the internal *.run.app service URL; never use those for OAuth.
 */
export function publicOrigin(request: Request, stored?: string | null): string {
  if (stored?.startsWith("http://") || stored?.startsWith("https://")) {
    const cleaned = stored.replace(/\/$/, "");
    if (!isInternalOrigin(cleaned)) return cleaned;
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (forwardedHost && !isInternalHost(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  const host = request.headers.get("host")?.trim();
  if (host && !isInternalHost(host)) {
    const proto =
      forwardedProto ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const env = process.env.APP_ORIGIN?.trim();
  if (env) return env.replace(/\/$/, "");

  return new URL(request.url).origin;
}

function isInternalHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith("0.0.0.0") ||
    h.startsWith("127.0.0.1") ||
    h.startsWith("localhost") ||
    h.startsWith("[::]") ||
    h.startsWith("[::1]") ||
    h.endsWith(".run.app")
  );
}

function isInternalOrigin(origin: string): boolean {
  try {
    return isInternalHost(new URL(origin).host);
  } catch {
    return true;
  }
}
