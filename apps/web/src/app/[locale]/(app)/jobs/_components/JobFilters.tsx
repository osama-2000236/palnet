"use client";

import { JobLocationMode, JobType, PS_INDUSTRIES } from "@baydar/shared";
import { Chip, SearchField, Surface } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";

import { CityField } from "@/components/CityField";

export type JobFiltersState = {
  q: string;
  city: string;
  type: JobType | "";
  locationMode: JobLocationMode | "";
  companyId: string;
  companyName: string;
  industry: string;
};

export function JobFilters({
  filters,
  onChange,
}: {
  filters: JobFiltersState;
  onChange: (filters: JobFiltersState) => void;
}): JSX.Element {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isArabic = locale.startsWith("ar");

  return (
    <Surface variant="card" padding="4" as="aside">
      <h2 className="text-ink mb-3 text-sm font-semibold">{t("filters")}</h2>

      <div className="mb-3">
        <label htmlFor="jobs-q" className="text-ink-muted mb-1 block text-xs">
          {t("search")}
        </label>
        <SearchField
          id="jobs-q"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          onClear={() => onChange({ ...filters, q: "" })}
          clearLabel={tCommon("clear")}
          placeholder={t("searchPlaceholder")}
          containerClassName="w-full"
          aria-label={t("search")}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="jobs-city" className="text-ink-muted mb-1 block text-xs">
          {t("city")}
        </label>
        <CityField
          allowEmpty
          value={filters.city}
          onChange={(city) => onChange({ ...filters, city })}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="jobs-industry" className="text-ink-muted mb-1 block text-xs">
          {t("industry")}
        </label>
        {/* Sector facet — canonical PS_INDUSTRIES Arabic values on the wire,
            localized labels in the UI. NGO/intl-org lead the list on purpose. */}
        <select
          id="jobs-industry"
          value={filters.industry}
          onChange={(e) => onChange({ ...filters, industry: e.target.value })}
          className="border-line-hard bg-surface text-ink hover:border-line-hard focus-visible:border-brand-600 focus-visible:outline-hidden h-9 w-full rounded-md border px-3 text-sm focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <option value="">{t("any")}</option>
          {PS_INDUSTRIES.map((industry) => (
            <option key={industry.key} value={industry.ar}>
              {isArabic ? industry.ar : industry.en}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="mb-3">
        <legend className="text-ink-muted mb-1 block text-xs">{t("type")}</legend>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            size="sm"
            active={filters.type === ""}
            onClick={() => onChange({ ...filters, type: "" })}
          >
            {t("any")}
          </Chip>
          {(Object.values(JobType) as JobType[]).map((kind) => (
            <Chip
              key={kind}
              size="sm"
              active={filters.type === kind}
              onClick={() => onChange({ ...filters, type: kind })}
            >
              {t(`typeLabels.${kind}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-ink-muted mb-1 block text-xs">{t("location")}</legend>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            size="sm"
            active={filters.locationMode === ""}
            onClick={() => onChange({ ...filters, locationMode: "" })}
          >
            {t("any")}
          </Chip>
          {(Object.values(JobLocationMode) as JobLocationMode[]).map((mode) => (
            <Chip
              key={mode}
              size="sm"
              active={filters.locationMode === mode}
              onClick={() => onChange({ ...filters, locationMode: mode })}
            >
              {t(`locationLabels.${mode}`)}
            </Chip>
          ))}
        </div>
      </fieldset>
    </Surface>
  );
}
