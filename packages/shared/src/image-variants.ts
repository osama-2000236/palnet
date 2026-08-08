// Which size of an image goes over the wire.
//
// Every uploaded image is stored in three widths — 320, 640, 1080 — and every
// avatar in two, 32 and 96. Which one a member gets is decided by the mode
// they are in, and it is decided ONCE, on the server, from the
// `X-Baydar-Connection` hint.
//
// Server-side rather than in each client's image component, for the reason
// §15.3 gives: the API is what picks the variant URL. A client that received a
// 1080px URL and then decided not to load it has already paid for the DNS
// lookup and the decision; a client that never sees the URL cannot get it
// wrong. It also means the two kits need no bandwidth store, and no call site
// can opt itself back up to full size.
//
// The transform base is Cloudflare Images. Unset — which it is until somebody
// provisions it — every function here returns the original URL, so the product
// works and simply spends more bytes. That is the designed fallback, not a
// stub: nothing is hidden and nothing 404s.

import { BANDWIDTH_POLICY, modeForConnection, type ConnectionClass } from "./connection-class";

/** The widths actually stored. Asking for anything else would 404. */
export const IMAGE_VARIANTS = [320, 640, 1080] as const;
export type ImageVariant = (typeof IMAGE_VARIANTS)[number];

export const AVATAR_VARIANTS = [32, 96] as const;
export type AvatarVariant = (typeof AVATAR_VARIANTS)[number];

/**
 * Build the variant URL for one image.
 *
 * `transformBase` null (unconfigured) returns the original, and so does a URL
 * that is not on the media origin — an avatar someone pasted from elsewhere
 * must not be rewritten into a path that does not exist.
 */
export function imageVariantUrl(
  url: string | null | undefined,
  width: number,
  transformBase: string | null | undefined,
): string | null {
  if (!url) return null;
  if (!transformBase) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  return `${transformBase.replace(/\/$/, "")}/width=${width},format=auto/${encodeURIComponent(url)}`;
}

/** The image width this connection is allowed, from the one policy table. */
export function imageWidthFor(connection: ConnectionClass): ImageVariant {
  return BANDWIDTH_POLICY[modeForConnection(connection)].imageWidth;
}

/** The avatar width this connection is allowed. Only two are stored. */
export function avatarWidthFor(connection: ConnectionClass): AvatarVariant {
  return BANDWIDTH_POLICY[modeForConnection(connection)].avatarWidth;
}

/**
 * Rewrite an avatar for this connection.
 *
 * A 96px circle on 2G costs about as much as the rest of a feed row, which is
 * why `light` drops to 32 — the size it is actually drawn at there.
 */
export function avatarUrlFor(
  url: string | null | undefined,
  connection: ConnectionClass,
  transformBase: string | null | undefined,
): string | null {
  return imageVariantUrl(url, avatarWidthFor(connection), transformBase);
}

/**
 * Rewrite a post image for this connection.
 *
 * On `light` the client does not auto-load it at all — it draws the blurhash
 * and a tap-to-load labelled with the cost. Sending the 320 URL anyway is
 * deliberate: when the member does tap, the bytes are already the small ones.
 */
export function postImageUrlFor(
  url: string | null | undefined,
  connection: ConnectionClass,
  transformBase: string | null | undefined,
): string | null {
  return imageVariantUrl(url, imageWidthFor(connection), transformBase);
}
