type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

export type CorsOriginDelegate = (origin: string | undefined, callback: CorsOriginCallback) => void;

interface WildcardOrigin {
  protocol: string;
  hostnamePattern: RegExp;
}

export function buildCorsOrigin(rawOrigins: string): false | CorsOriginDelegate {
  const origins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) return false;

  const exactOrigins = new Set(origins.filter((origin) => !origin.includes("*")));
  const wildcardOrigins = origins
    .map(parseWildcardOrigin)
    .filter((origin): origin is WildcardOrigin => origin !== null);

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (exactOrigins.has(origin) || wildcardOrigins.some((rule) => matchesWildcard(origin, rule))) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

function parseWildcardOrigin(origin: string): WildcardOrigin | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }

  if (!url.hostname.includes("*") || url.pathname !== "/" || url.search || url.hash) {
    return null;
  }

  return {
    protocol: url.protocol.toLowerCase(),
    hostnamePattern: wildcardHostnameToRegex(url.hostname),
  };
}

function matchesWildcard(origin: string, rule: WildcardOrigin): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return url.protocol.toLowerCase() === rule.protocol && rule.hostnamePattern.test(hostname);
  } catch {
    return false;
  }
}

function wildcardHostnameToRegex(hostname: string): RegExp {
  const pattern = hostname.toLowerCase().split("*").map(escapeRegExp).join("[^.]+");

  return new RegExp(`^${pattern}$`, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
