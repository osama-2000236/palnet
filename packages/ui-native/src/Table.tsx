import type { ReactNode } from "react";
import { View } from "react-native";

export interface TableProps {
  children: ReactNode;
}

export function Table({ children }: TableProps) {
  return <View>{children}</View>;
}
