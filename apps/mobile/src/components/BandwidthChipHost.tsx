import { nextBandwidthMode } from "@baydar/shared";
import { useBandwidth } from "@baydar/shared/react";
import { BandwidthChip, nativeTokens } from "@baydar/ui-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { persistBandwidthOverride } from "@/lib/bandwidth";

/**
 * The mode chip, wired to the store and the catalog.
 *
 * Mounted once in the root layout rather than in each screen's header, for the
 * reason `PARITY.md` already records: web's chrome is one sticky header and
 * mobile screens each own theirs, so the persistent element lives beside the
 * offline banner — the app's other always-on status surface.
 */
export function BandwidthChipHost(): JSX.Element {
  const { t } = useTranslation();
  const { mode } = useBandwidth();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { top: insets.top + nativeTokens.space[2] }]}
    >
      <BandwidthChip
        mode={mode}
        label={t(`connection.modeHelp.${mode}`)}
        labels={{
          light: t("connection.mode.light"),
          normal: t("connection.mode.normal"),
          full: t("connection.mode.full"),
        }}
        onPress={() => void persistBandwidthOverride(nextBandwidthMode(mode))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    end: nativeTokens.space[4],
    // Above nav, below sheets and modals — the offline banner's layer.
    zIndex: nativeTokens.z.dropdown,
  },
});
