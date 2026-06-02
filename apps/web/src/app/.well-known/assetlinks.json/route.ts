const packageName = process.env.BAYDAR_ANDROID_PACKAGE_NAME ?? "ps.baydar.app";

const relations = ["delegate_permission/common.handle_all_urls"];

const fingerprintEnv = "BAYDAR_ANDROID_SHA256_CERT_FINGERPRINTS";

const getFingerprints = (): string[] =>
  (process.env[fingerprintEnv] ?? "")
    .split(",")
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);

const cacheControl = (status: number): string =>
  status === 200 ? "public, max-age=3600, s-maxage=3600" : "no-store";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const fingerprints = getFingerprints();

  if (fingerprints.length === 0) {
    return Response.json(
      { error: `${fingerprintEnv} is not configured` },
      {
        status: 503,
        headers: {
          "Cache-Control": cacheControl(503),
        },
      },
    );
  }

  return Response.json(
    [
      {
        relation: relations,
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    {
      headers: {
        "Cache-Control": cacheControl(200),
      },
    },
  );
}
