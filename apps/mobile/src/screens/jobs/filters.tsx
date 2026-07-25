import { JobLocationMode, JobType, PS_INDUSTRIES } from "@baydar/shared";
import { Button, Chip, Sheet, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { CityField } from "@/components/CityField";

import { AlertsSection } from "./AlertsSection";

export type Filters = {
  q: string;
  city: string;
  type: JobType | "";
  locationMode: JobLocationMode | "";
  // Set when arriving from a company search hit ("jobs at this company").
  companyId: string;
  companyName: string;
  industry: string;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  city: "",
  type: "",
  locationMode: "",
  companyId: "",
  companyName: "",
  industry: "",
};

export const TYPE_VALUES: JobType[] = [
  JobType.FULL_TIME,
  JobType.PART_TIME,
  JobType.CONTRACT,
  JobType.INTERNSHIP,
  JobType.VOLUNTEER,
  JobType.TEMPORARY,
];

export const LOCATION_VALUES: JobLocationMode[] = [
  JobLocationMode.ONSITE,
  JobLocationMode.HYBRID,
  JobLocationMode.REMOTE,
];

export function buildQs(filters: Filters, after: string | null): string {
  const qs = new URLSearchParams({ limit: "20" });
  if (after) qs.set("after", after);
  if (filters.q) qs.set("q", filters.q);
  if (filters.city) qs.set("city", filters.city);
  if (filters.type) qs.set("type", filters.type);
  if (filters.locationMode) qs.set("locationMode", filters.locationMode);
  if (filters.companyId) qs.set("companyId", filters.companyId);
  if (filters.industry) qs.set("industry", filters.industry);
  return qs.toString();
}

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.q) n += 1;
  if (f.city) n += 1;
  if (f.type) n += 1;
  if (f.locationMode) n += 1;
  if (f.companyId) n += 1;
  if (f.industry) n += 1;
  return n;
}

export function FilterSheet({
  filters,
  onChange,
  onClose,
  open,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClose: () => void;
  open: boolean;
}): JSX.Element {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const set = <K extends keyof Filters>(key: K, value: Filters[K]): void => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("jobs.filters")}>
      <Field label={t("jobs.city")}>
        <CityField allowEmpty value={filters.city} onChange={(v) => set("city", v)} />
      </Field>
      <Field label={t("jobs.industry")}>
        {/* Sector facet — canonical PS_INDUSTRIES Arabic on the wire, localized
            labels; NGO/intl-org lead. Web twin: JobFilters.tsx industry select. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[2] }}>
          {PS_INDUSTRIES.map((industry) => (
            <Chip
              key={industry.key}
              selected={filters.industry === industry.ar}
              accessibilityLabel={isArabic ? industry.ar : industry.en}
              onPress={() => set("industry", filters.industry === industry.ar ? "" : industry.ar)}
            >
              {isArabic ? industry.ar : industry.en}
            </Chip>
          ))}
        </View>
      </Field>
      <Field label={t("jobs.type")}>
        <ChipRow
          values={TYPE_VALUES}
          selected={filters.type}
          onSelect={(v) => set("type", filters.type === v ? "" : v)}
          labelFor={(v) => t(`jobs.typeLabels.${v}`)}
        />
      </Field>
      <Field label={t("jobs.location")}>
        <ChipRow
          values={LOCATION_VALUES}
          selected={filters.locationMode}
          onSelect={(v) => set("locationMode", filters.locationMode === v ? "" : v)}
          labelFor={(v) => t(`jobs.locationLabels.${v}`)}
        />
      </Field>
      <Field label={t("jobs.alerts.title")}>
        <AlertsSection filters={filters} />
      </Field>
      <View
        style={{
          flexDirection: "row",
          gap: nativeTokens.space[2],
          marginTop: nativeTokens.space[2],
        }}
      >
        <View style={{ flex: 1 }}>
          <Button variant="secondary" size="md" fullWidth onPress={() => onChange(EMPTY_FILTERS)}>
            {t("common.clear")}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button variant="primary" size="md" fullWidth onPress={onClose}>
            {t("common.done")}
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <View style={{ gap: nativeTokens.space[1] }}>
      <Text
        style={{
          color: c.inkMuted,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function ChipRow<T extends string>({
  labelFor,
  onSelect,
  selected,
  values,
}: {
  labelFor: (v: T) => string;
  onSelect: (v: T) => void;
  selected: T | "";
  values: T[];
}): JSX.Element {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[2] }}>
      {values.map((v) => (
        <Chip
          key={v}
          selected={selected === v}
          onPress={() => onSelect(v)}
          accessibilityLabel={labelFor(v)}
        >
          {labelFor(v)}
        </Chip>
      ))}
    </View>
  );
}

// expo-router colocation: not a screen.
export default (): null => null;
