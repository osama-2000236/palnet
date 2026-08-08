"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { startBandwidthDetection } from "./bandwidth";

// Standard Next.js App Router pattern:
//   * On the server, every request gets a fresh client so cached data
//     from one user never bleeds into another's HTML stream.
//   * In the browser, we keep a module-scope singleton so React's
//     concurrent rendering and Strict-Mode double-effects can't tear
//     down + rebuild the cache on every mount.
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 60s is conservative enough to avoid extra refetches on tab focus
        // while still letting mutations + manual invalidations win.
        staleTime: 60 * 1000,
        // Keep unused data in cache for 10 minutes before garbage collection.
        gcTime: 10 * 60 * 1000,
        // Mutations and route nav already cover most refetch needs.
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const client = getQueryClient();

  // Here rather than in a layout because this provider is already the one
  // client boundary every authenticated and public page passes through, and
  // the connection hint has to be current before the first query fires.
  useEffect(() => startBandwidthDetection(), []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
