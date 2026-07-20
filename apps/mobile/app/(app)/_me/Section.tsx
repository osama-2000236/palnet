import { Surface } from "@baydar/ui-native";
import type { ReactNode } from "react";
import { Text } from "react-native";

import { useStyles } from "./styles";

export function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  const styles = useStyles();
  return (
    <Surface variant="card" padding="4" style={styles.section}>
      <Text selectable style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Surface>
  );
}
