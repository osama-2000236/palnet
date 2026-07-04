"use client";

// CityField — curated Palestinian city picker (docs/localization-palestine.md
// §Palestinian Context). Grouped native <select> by governorate + an "other
// city" free-text fallback for diaspora locations. Writes the canonical Arabic
// city name via normalizeCity so filters match across ar/en input.
// Native twin: apps/mobile/src/components/CityField.tsx (same props).

import { Input } from "@baydar/ui-web";
import { PS_CITIES, PS_GOVERNORATES, normalizeCity } from "@baydar/shared";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

const OTHER = "__other__";

export interface CityFieldProps {
  value: string;
  onChange: (city: string) => void;
  /** Render an empty "all cities" first option (for filters). */
  allowEmpty?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export function CityField({
  value,
  onChange,
  allowEmpty = false,
  required = false,
  disabled = false,
}: CityFieldProps): JSX.Element {
  const t = useTranslations("common.cityField");
  const locale = useLocale();
  const id = useId();
  const isArabic = locale.startsWith("ar");
  const known = PS_CITIES.some((c) => c.ar === value);
  const [other, setOther] = useState(() => Boolean(value) && !known);

  const selectValue = other ? OTHER : known ? value : "";

  return (
    <span className="flex w-full flex-col gap-1">
      <select
        id={id}
        value={selectValue}
        required={required && !other}
        disabled={disabled}
        aria-label={t("label")}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
        className={[
          "bg-surface text-ink border-line-hard hover:border-line-hard h-9 w-full rounded-md border px-3 text-sm",
          "focus-visible:border-brand-600 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
          disabled ? "bg-surface-subtle text-ink-subtle cursor-not-allowed" : "",
        ].join(" ")}
      >
        <option value="">{allowEmpty ? t("all") : t("placeholder")}</option>
        {PS_GOVERNORATES.map((gov) => (
          <optgroup key={gov.key} label={isArabic ? gov.ar : gov.en}>
            {gov.cities.map((city) => (
              <option key={city.key} value={city.ar}>
                {isArabic ? city.ar : city.en}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER}>{t("other")}</option>
      </select>
      {other ? (
        <Input
          aria-label={t("otherLabel")}
          placeholder={t("otherPlaceholder")}
          value={value}
          required={required}
          disabled={disabled}
          maxLength={120}
          fullWidth
          onChange={(e) => onChange(normalizeCity(e.target.value))}
        />
      ) : null}
    </span>
  );
}
