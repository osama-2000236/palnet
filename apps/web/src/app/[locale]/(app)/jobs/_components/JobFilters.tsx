"use client";

import { JobLocationMode, JobType } from "@baydar/shared";
import { Chip, Icon, Input, Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";

export type JobFiltersState = {
  q: string;
  city: string;
  type: JobType | "";
  locationMode: JobLocationMode | "";
  companyId: string;
  companyName: string;
};

export function JobFilters({
  filters,
  onChange,
}: {
  filters: JobFiltersState;
  onChange: (filters: JobFiltersState) => void;
}): JSX.Element {
  const t = useTranslations("jobs");

  return (
    <Surface variant="card" padding="4" as="aside">
      <h2 className="text-ink mb-3 text-sm font-semibold">{t("filters")}</h2>

      <div className="mb-3">
        <label htmlFor="jobs-q" className="text-ink-muted mb-1 block text-xs">
          {t("search")}
        </label>
        <Input
          id="jobs-q"
          type="search"
          size="sm"
          fullWidth
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder={t("searchPlaceholder")}
          leading={<Icon name="search" size={14} />}
          aria-label={t("search")}
        />
      </div>

      <div className="mb-3">
        <label htmlFor="jobs-city" className="text-ink-muted mb-1 block text-xs">
          {t("city")}
        </label>
        <Input
          id="jobs-city"
          type="text"
          size="sm"
          fullWidth
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
          placeholder={t("cityPlaceholder")}
          aria-label={t("city")}
        />
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
