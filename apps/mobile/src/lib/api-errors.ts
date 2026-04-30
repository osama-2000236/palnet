import type { TFunction } from "i18next";

import { ApiRequestError } from "./api";

export function apiErrorMessage(t: TFunction, error: unknown): string {
  if (error instanceof ApiRequestError) {
    return t(`api.errors.${error.code}`, {
      defaultValue: t(`auth.errors.${error.code}`, {
        defaultValue: t("common.genericError"),
      }),
    });
  }

  return t("common.genericError");
}

export function apiErrorCode(error: unknown): string | null {
  return error instanceof ApiRequestError ? error.code : null;
}
