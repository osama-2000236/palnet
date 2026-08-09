import * as FileSystem from "expo-file-system/legacy";
// eslint-disable-next-line import/no-unresolved -- dependency is pinned for Expo install; absent only in this offline sandbox.
import * as Sharing from "expo-sharing";

import { API_BASE } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

// Exporting a CV from the phone. Closes HANDOFF gap #6.
//
// Web has always had one: it laid the résumé out in React and used the
// browser's print dialog as the PDF exporter. A phone has no print dialog, so
// the twin could not be the same trick.
//
// What it is instead: the API assembles the document (`GET /cv/:handle`) and
// this hands the file to the OS share sheet. From there the member mails it,
// sends it on WhatsApp, or opens it in a browser and prints to PDF — and it is
// the OS text engine doing the Arabic shaping either way, which is the part
// that has to be right.
//
// GAP-09 records why the server does not produce PDF bytes: the only two ways
// are a headless browser on the API host, or a PDF library that cannot shape
// Arabic, and unshaped Arabic in a CV is worse than no CV. `expo-print` would
// turn this into a real PDF in about five lines — it is a native module, so it
// needs a dev-client rebuild, which is owner-gated.

export type CvExportResult = "shared" | "sharing-unavailable";

/**
 * Fetch the member's own CV and open the share sheet.
 *
 * Throws on auth or network failure; the caller shows the toast. Only the
 * member's own handle will succeed — the API refuses anybody else's, because a
 * CV is the most complete document Baydar holds about one person.
 */
export async function exportCv(handle: string, locale: string): Promise<CvExportResult> {
  const token = await getAccessToken();
  if (!token) throw new Error("AUTH_UNAUTHORIZED");

  if (!(await Sharing.isAvailableAsync())) return "sharing-unavailable";

  const response = await fetch(`${API_BASE}/cv/${encodeURIComponent(handle)}?locale=${locale}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("CV_EXPORT_FAILED");

  const html = await response.text();

  // Cache, not documents: this file is a copy of something the server can
  // regenerate, and it should not survive as clutter the member has to clear.
  const root = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!root) throw new Error("FILE_SYSTEM_UNAVAILABLE");

  // The handle is in the filename because that is what an employer sees in
  // their downloads folder, and "cv.html" from forty applicants is unusable.
  const uri = `${root}${handle}-cv.html`;
  await FileSystem.writeAsStringAsync(uri, html, { encoding: FileSystem.EncodingType.UTF8 });

  await Sharing.shareAsync(uri, { mimeType: "text/html", UTI: "public.html" });
  return "shared";
}
