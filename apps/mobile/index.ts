import { StyleSheet } from "react-native";

declare const require: (id: string) => void;

const runtimeStyleSheet = StyleSheet as typeof StyleSheet & {
  setFlag?: (flag: string, value: unknown) => void;
};

runtimeStyleSheet.setFlag?.("darkMode", "class");

require("expo-router/entry");
