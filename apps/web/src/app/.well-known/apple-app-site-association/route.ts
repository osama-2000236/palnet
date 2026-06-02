const teamIdEnv = "BAYDAR_APPLE_TEAM_ID";

const bundleId = process.env.BAYDAR_IOS_BUNDLE_ID ?? "ps.baydar.app";

const paths = ["/", "/jobs/*", "/map/*", "/messages/*", "/profile/*", "/employer/*"];

const cacheControl = (status: number): string =>
  status === 200 ? "public, max-age=3600, s-maxage=3600" : "no-store";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const teamId = process.env[teamIdEnv]?.trim();

  if (!teamId) {
    return Response.json(
      { error: `${teamIdEnv} is not configured` },
      {
        status: 503,
        headers: {
          "Cache-Control": cacheControl(503),
        },
      },
    );
  }

  return Response.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.${bundleId}`,
            paths,
          },
        ],
      },
    },
    {
      headers: {
        "Cache-Control": cacheControl(200),
      },
    },
  );
}
