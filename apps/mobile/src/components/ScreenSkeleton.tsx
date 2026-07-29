// Screen-level loading skeletons. DESIGN.md §12: skeleton items for anything
// that fetches, three minimum, 1.2s shimmer (owned by Skeleton.tsx).
//
// Shape follows the screen — a profile hero is not a list row — so there are
// four of these rather than one generic block:
//   ProfileScreenSkeleton  cover + avatar + identity + tabs   (me, /in/[handle])
//   DetailScreenSkeleton   logo + title + body + list rows    (company, job)
//   CardStackSkeleton      page heading + stacked cards       (premium, karama,
//                                                              billing, edit)
//   ListSkeleton           three rows, nothing else           (blocked)
//
// Skeleton bars hide themselves from accessibility, so each root here carries
// the one "loading" announcement a screen reader needs. Drop that and the
// screens go silent — the bare StateMessage these replaced at least spoke.

import {
  RecordCardSkeleton,
  Skeleton,
  Surface,
  nativeTokens,
  useThemeTokens,
} from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { View, type ViewProps } from "react-native";

function useLoadingA11y(): Pick<ViewProps, "accessibilityRole" | "accessibilityLabel"> {
  const { t } = useTranslation();
  return { accessibilityRole: "progressbar", accessibilityLabel: t("common.loading") };
}

// Matches the `scrollBody` every one of these screens uses for its real content.
const BODY = { padding: nativeTokens.space[4], gap: nativeTokens.space[4] } as const;

function TextCard(): JSX.Element {
  return (
    <Surface variant="card" padding="5" style={{ gap: nativeTokens.space[2] }}>
      <Skeleton width="46%" height={nativeTokens.space[4]} kind="pill" />
      <Skeleton width="92%" height={nativeTokens.space[3]} kind="pill" />
      <Skeleton width="72%" height={nativeTokens.space[3]} kind="pill" />
    </Surface>
  );
}

function ButtonRow(): JSX.Element {
  return (
    <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
      <Skeleton width="44%" height={nativeTokens.space[10]} radius={nativeTokens.radius.md} />
      <Skeleton width="34%" height={nativeTokens.space[10]} radius={nativeTokens.radius.md} />
    </View>
  );
}

function Rows(): JSX.Element {
  return (
    <View style={{ gap: nativeTokens.space[3] }}>
      <RecordCardSkeleton variant="row" testID="skeleton-row" />
      <RecordCardSkeleton variant="row" testID="skeleton-row" />
      <RecordCardSkeleton variant="row" testID="skeleton-row" />
    </View>
  );
}

function TabStrip(): JSX.Element {
  return (
    <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
      {(["22%", "26%", "21%", "19%"] as const).map((width) => (
        <Skeleton key={width} width={width} height={nativeTokens.space[8]} kind="pill" />
      ))}
    </View>
  );
}

export function ProfileScreenSkeleton(): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <View {...useLoadingA11y()} style={BODY}>
      <Surface variant="hero" padding="0">
        {/* Flat band, not a shimmer bar: the real cover is an illustration, and
            a pulsing full-width slab reads as a broken image. */}
        <View style={{ height: nativeTokens.space[24], backgroundColor: c.surfaceSunken }} />
        <View
          style={{
            marginTop: -nativeTokens.space[10],
            paddingHorizontal: nativeTokens.space[4],
            paddingBottom: nativeTokens.space[4],
            alignItems: "flex-start",
            gap: nativeTokens.space[2],
          }}
        >
          <Skeleton kind="circle" width={nativeTokens.space[24]} height={nativeTokens.space[24]} />
          <Skeleton width="58%" height={nativeTokens.space[6]} kind="pill" />
          <Skeleton width="82%" height={nativeTokens.space[4]} kind="pill" />
          <Skeleton width="36%" height={nativeTokens.space[3]} kind="pill" />
        </View>
        <View
          style={{ paddingHorizontal: nativeTokens.space[4], paddingBottom: nativeTokens.space[4] }}
        >
          <ButtonRow />
        </View>
      </Surface>
      <TabStrip />
      <TextCard />
      <TextCard />
    </View>
  );
}

export function DetailScreenSkeleton(): JSX.Element {
  return (
    <View {...useLoadingA11y()} style={BODY}>
      <Surface variant="hero" padding="5" style={{ gap: nativeTokens.space[3] }}>
        <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
          <Skeleton
            width={nativeTokens.space[12]}
            height={nativeTokens.space[12]}
            radius={nativeTokens.radius.lg}
          />
          <View style={{ flex: 1, gap: nativeTokens.space[2] }}>
            <Skeleton width="76%" height={nativeTokens.space[5]} kind="pill" />
            <Skeleton width="52%" height={nativeTokens.space[3]} kind="pill" />
            <Skeleton width="64%" height={nativeTokens.space[3]} kind="pill" />
          </View>
        </View>
        <ButtonRow />
      </Surface>
      <TextCard />
      <Rows />
    </View>
  );
}

export function CardStackSkeleton(): JSX.Element {
  return (
    <View {...useLoadingA11y()} style={BODY}>
      <View style={{ gap: nativeTokens.space[2] }}>
        <Skeleton width="28%" height={nativeTokens.space[3]} kind="pill" />
        <Skeleton width="62%" height={nativeTokens.space[6]} kind="pill" />
        <Skeleton width="84%" height={nativeTokens.space[4]} kind="pill" />
      </View>
      <TextCard />
      <TextCard />
      <TextCard />
    </View>
  );
}

export function ListSkeleton(): JSX.Element {
  return (
    <View {...useLoadingA11y()}>
      <Rows />
    </View>
  );
}
