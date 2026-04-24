import {
  Switch as NativeSwitch,
  type SwitchProps as NativeSwitchProps,
} from "react-native";

import { nativeTokens } from "./tokens";

export interface SwitchProps
  extends Omit<
    NativeSwitchProps,
    "ios_backgroundColor" | "thumbColor" | "trackColor"
  > {}

export function Switch(props: SwitchProps): JSX.Element {
  return (
    <NativeSwitch
      {...props}
      ios_backgroundColor={nativeTokens.color.lineHard}
      thumbColor={nativeTokens.color.surface}
      trackColor={{
        false: nativeTokens.color.lineHard,
        true: nativeTokens.color.brand400,
      }}
    />
  );
}
