// Error → friendly i18n message mapper.
//
// Use case: catch { setError(toErrorMessage(e, tErr)) }.
// Maps `ApiRequestError.code` to `errors.{CODE}` translation; falls back to
// `errors.fallback` for unknown codes or non-API errors. Never expose raw
// `API ${status} ${code}` strings to users.
//
// Pattern (in any client component):
//   const tErr = useTranslations("errors");
//   ...
//   } catch (e) {
//     setError(toErrorMessage(e, tErr));
//   }

import { ApiRequestError } from "./api";

export type ErrorTranslator = (key: string) => string;

/**
 * Map any caught value to a friendly message string.
 * - `ApiRequestError` → look up `errors.{code}`, fall back to `errors.fallback`.
 * - `TypeError` (fetch network failure) → `errors.NETWORK`.
 * - Anything else → `errors.fallback`.
 *
 * The `t` argument MUST come from `useTranslations("errors")` so namespaced
 * keys resolve correctly.
 */
export function toErrorMessage(error: unknown, t: ErrorTranslator): string {
  if (error instanceof ApiRequestError) {
    return tryT(t, error.code) ?? t("fallback");
  }
  if (error instanceof TypeError) {
    // fetch failures throw TypeError (DNS, offline, CORS, etc.)
    return tryT(t, "NETWORK") ?? t("fallback");
  }
  return t("fallback");
}

/**
 * Like `toErrorMessage` but returns the error code instead of message — useful
 * when callers need to branch on the code (e.g. redirect to /onboarding for
 * `PROFILE_ONBOARDING_REQUIRED`) before falling back to displaying a message.
 */
export function getErrorCode(error: unknown): string | null {
  if (error instanceof ApiRequestError) return error.code;
  if (error instanceof TypeError) return "NETWORK";
  return null;
}

function tryT(t: ErrorTranslator, key: string): string | null {
  try {
    const out = t(key);
    // next-intl returns the key unchanged when the message is missing; treat
    // that as "no translation" so we fall back instead of showing the raw key.
    return out === key ? null : out;
  } catch {
    return null;
  }
}
