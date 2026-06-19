import { JobLocationMode, JobType } from "@baydar/shared";
import { Button, Chip, Input, Sheet, nativeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export type Filters = {
  q: string;
  city: string;
  type: JobType | "";
  locationMode: JobLocationMode | "";
  // Set when arriving from a company search hit ("jobs at this company").
  companyId: string;
  companyName: string;
};

export const EMPTY_FILTERS: Filters = {
  q: "",
  city: "",
  type: "",
  locationMode: "",
  companyId: "",
  companyName: "",
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
  return qs.toString();
}

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.q) n += 1;
  if (f.city) n += 1;
  if (f.type) n += 1;
  if (f.locationMode) n += 1;
  if (f.companyId) n += 1;
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
  const { t } = useTranslation();
  const set = <K extends keyof Filters>(key: K, value: Filters[K]): void => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("jobs.filters")}>
      <Field label={t("jobs.city")}>
        <Input
          fullWidth
          size="lg"
          value={filters.city}
          onChangeText={(v) => set("city", v)}
          placeholder={t("jobs.cityPlaceholder")}
        />
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
  return (
    <View style={{ gap: nativeTokens.space[1] }}>
      <Text
        style={{
          color: nativeTokens.color.inkMuted,
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
