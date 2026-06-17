type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

export type CorsOriginDelegate = (
  origin: string | undefined,
  callback: CorsOriginCallback,
) => void;

interface WildcardOrigin {
  protocol: string;
  suffix: string;
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
  const match = /^(https?):\/\/\*\.(.+)$/i.exec(origin);
  if (!match) return null;

  return {
    protocol: match[1]!.toLowerCase(),
    suffix: match[2]!.toLowerCase(),
  };
}

function matchesWildcard(origin: string, rule: WildcardOrigin): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol.toLowerCase() === `${rule.protocol}:` &&
      hostname.endsWith(`.${rule.suffix}`) &&
      hostname !== rule.suffix
    );
  } catch {
    return false;
  }
}
