// Mobile jobs list — the tab-bar entry for the briefcase icon.
//
// Rows mirror the web layout but drop the skills chips for space. Tap opens
// the detail at /(app)/jobs/[id]. Applied badge shown per-row.
//
// Paginated via the same cursorPage envelope the web list uses — FlatList
// onEndReached triggers the next page when within 40% of the bottom.
//
// Filtering: a header "Filter" button opens a Sheet with controlled inputs
// for q / city (text) and type / locationMode (chips). Changes refetch
// with a 250 ms debounce, matching the web behavior.

import { cursorPage, Job as JobSchema, JobLocationMode, JobType, type Job } from "@baydar/shared";
import { Button, Sheet, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const JobsPage = cursorPage(JobSchema);

type Filters = {
  q: string;
  city: string;
  type: JobType | "";
  locationMode: JobLocationMode | "";
};

const EMPTY_FILTERS: Filters = { q: "", city: "", type: "", locationMode: "" };

const TYPE_VALUES: JobType[] = [
  JobType.FULL_TIME,
  JobType.PART_TIME,
  JobType.CONTRACT,
  JobType.INTERNSHIP,
  JobType.VOLUNTEER,
  JobType.TEMPORARY,
];

const LOCATION_VALUES: JobLocationMode[] = [
  JobLocationMode.ONSITE,
  JobLocationMode.HYBRID,
  JobLocationMode.REMOTE,
];

function buildQs(filters: Filters, after: string | null): string {
  const qs = new URLSearchParams({ limit: "20" });
  if (after) qs.set("after", after);
  if (filters.q) qs.set("q", filters.q);
  if (filters.city) qs.set("city", filters.city);
  if (filters.type) qs.set("type", filters.type);
  if (filters.locationMode) qs.set("locationMode", filters.locationMode);
  return qs.toString();
}

function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.q) n += 1;
  if (f.city) n += 1;
  if (f.type) n += 1;
  if (f.locationMode) n += 1;
  return n;
}

export default function JobsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async (after: string | null, f: Filters): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const page = await apiFetchPage(`/jobs?${buildQs(f, after)}`, JobsPage, { token });
      setItems((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, []);

  // Debounced refetch when filters change. Reset cursor on every filter edit.
  useEffect(() => {
    const handle = setTimeout(() => {
      void load(null, filters);
    }, 250);
    return (): void => clearTimeout(handle);
  }, [filters, load]);

  const activeCount = useMemo(() => activeFilterCount(filters), [filters]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: nativeTokens.space[4],
          paddingTop: nativeTokens.space[4],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: nativeTokens.space[3],
          }}
        >
          <Text
            style={{
              fontSize: nativeTokens.type.scale.display.size,
              lineHeight: nativeTokens.type.scale.display.line,
              fontWeight: "700",
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
            }}
          >
            {t("jobs.title")}
          </Text>

          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t("jobs.filters")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: nativeTokens.space[2],
              paddingHorizontal: nativeTokens.space[3],
              paddingVertical: nativeTokens.space[2],
              borderRadius: nativeTokens.radius.full,
              borderWidth: 1,
              borderColor: nativeTokens.color.lineHard,
              backgroundColor:
                activeCount > 0 ? nativeTokens.color.brand50 : nativeTokens.color.surface,
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
                fontWeight: "600",
              }}
            >
              {t("jobs.filters")}
            </Text>
            {activeCount > 0 ? (
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  paddingHorizontal: 6,
                  borderRadius: nativeTokens.radius.full,
                  backgroundColor: nativeTokens.color.brand600,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: nativeTokens.color.inkInverse,
                    fontSize: 11,
                    fontWeight: "700",
                    fontFamily: nativeTokens.type.family.sans,
                  }}
                >
                  {activeCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {firstLoad ? (
          <View style={{ gap: nativeTokens.space[3] }}>
            <JobRowSkeleton />
            <JobRowSkeleton />
            <JobRowSkeleton />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(j) => j.id}
            renderItem={({ item }) => <JobRow job={item} />}
            ItemSeparatorComponent={() => <View style={{ height: nativeTokens.space[3] }} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (!loading && hasMore && cursor) void load(cursor, filters);
            }}
            ListEmptyComponent={
              loading ? null : (
                <Surface variant="tinted" padding="6">
                  <Text
                    style={{
                      color: nativeTokens.color.inkMuted,
                      fontSize: nativeTokens.type.scale.body.size,
                      fontFamily: nativeTokens.type.family.sans,
                      textAlign: "center",
                    }}
                  >
                    {t("jobs.emptyTitle")}
                  </Text>
                </Surface>
              )
            }
            ListFooterComponent={
              loading && !firstLoad ? (
                <View style={{ paddingVertical: nativeTokens.space[4] }}>
                  <ActivityIndicator />
                </View>
              ) : null
            }
          />
        )}
      </View>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Filter sheet — controlled inputs, live-commits to the parent on change.
// ────────────────────────────────────────────────────────────────────────

function FilterSheet({
  open,
  onClose,
  filters,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (next: Filters) => void;
}): JSX.Element {
  const { t } = useTranslation();

  const set = <K extends keyof Filters>(key: K, value: Filters[K]): void => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("jobs.filters")}>
      <Field label={t("jobs.search")}>
        <TextInput
          value={filters.q}
          onChangeText={(v) => set("q", v)}
          placeholder={t("jobs.searchPlaceholder")}
          placeholderTextColor={nativeTokens.color.inkSubtle}
          style={inputStyle()}
        />
      </Field>

      <Field label={t("jobs.city")}>
        <TextInput
          value={filters.city}
          onChangeText={(v) => set("city", v)}
          placeholder={t("jobs.cityPlaceholder")}
          placeholderTextColor={nativeTokens.color.inkSubtle}
          style={inputStyle()}
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
  values,
  selected,
  onSelect,
  labelFor,
}: {
  values: T[];
  selected: T | "";
  onSelect: (v: T) => void;
  labelFor: (v: T) => string;
}): JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: nativeTokens.space[2],
      }}
    >
      {values.map((v) => {
        const active = selected === v;
        return (
          <Pressable
            key={v}
            onPress={() => onSelect(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: nativeTokens.space[3],
              paddingVertical: nativeTokens.space[2],
              borderRadius: nativeTokens.radius.full,
              borderWidth: 1,
              borderColor: active ? nativeTokens.color.brand600 : nativeTokens.color.lineHard,
              backgroundColor: active ? nativeTokens.color.brand50 : nativeTokens.color.surface,
            }}
          >
            <Text
              style={{
                color: active ? nativeTokens.color.brand700 : nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
                fontWeight: active ? "700" : "500",
              }}
            >
              {labelFor(v)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function inputStyle(): {
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  paddingHorizontal: number;
  paddingVertical: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  backgroundColor: string;
} {
  return {
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    backgroundColor: nativeTokens.color.surface,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Row + skeleton. Unchanged from the pre-filter iteration.
// ────────────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: Job }): JSX.Element {
  const { t } = useTranslation();
  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(app)/jobs/[id]", params: { id: job.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${job.title} — ${job.company.name}`}
    >
      <Surface variant="card" padding="4">
        <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: nativeTokens.radius.md,
              backgroundColor: nativeTokens.color.surfaceSunken,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {job.company.logoUrl ? (
              <Image
                source={{ uri: job.company.logoUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontWeight: "600",
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {(job.company.name[0] ?? "?").toUpperCase()}
              </Text>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: nativeTokens.space[2],
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: nativeTokens.color.ink,
                    fontSize: nativeTokens.type.scale.h3.size,
                    lineHeight: nativeTokens.type.scale.h3.line,
                    fontWeight: "600",
                    fontFamily: nativeTokens.type.family.sans,
                  }}
                >
                  {job.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: nativeTokens.color.inkMuted,
                    fontSize: nativeTokens.type.scale.small.size,
                    fontFamily: nativeTokens.type.family.sans,
                  }}
                >
                  {job.company.name}
                </Text>
              </View>
              {job.viewer.hasApplied ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: nativeTokens.space[2],
                    paddingVertical: 2,
                    borderRadius: nativeTokens.radius.full,
                    backgroundColor: nativeTokens.color.successSoft,
                  }}
                >
                  <Text
                    style={{
                      color: nativeTokens.color.success,
                      fontSize: 11,
                      fontWeight: "700",
                      fontFamily: nativeTokens.type.family.sans,
                    }}
                  >
                    {t("jobs.appliedBadge")}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={{
                marginTop: nativeTokens.space[1],
                color: nativeTokens.color.inkMuted,
                fontSize: nativeTokens.type.scale.small.size,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {metaParts.join(" · ")}
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function JobRowSkeleton(): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: nativeTokens.radius.md,
            backgroundColor: nativeTokens.color.surfaceSunken,
          }}
        />
        <View style={{ flex: 1, gap: nativeTokens.space[2] }}>
          <View
            style={{
              height: 14,
              width: "66%",
              borderRadius: nativeTokens.radius.sm,
              backgroundColor: nativeTokens.color.surfaceSunken,
            }}
          />
          <View
            style={{
              height: 12,
              width: "40%",
              borderRadius: nativeTokens.radius.sm,
              backgroundColor: nativeTokens.color.surfaceSunken,
            }}
          />
        </View>
      </View>
    </Surface>
  );
}
