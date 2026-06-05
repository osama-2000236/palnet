import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { I18nManager, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "./Icon";
import { shadowStyle } from "./shadow";
import { nativeTokens } from "./tokens";

export type ToastKind = "info" | "success" | "error";

export interface ToastProps {
  message: string;
  kind: ToastKind;
  onDismiss(): void;
  dismissLabel?: string;
}

export interface ShowToastInput {
  message: string;
  kind?: ToastKind;
  durationMs?: number;
}

export interface ToastContextValue {
  showToast(input: ShowToastInput): void;
}

export interface ToastProviderProps {
  children: ReactNode;
  dismissLabel?: string;
}

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

const AUTO_DISMISS_MS = 3500;
const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 1;

const BACKGROUND: Record<ToastKind, string> = {
  info: nativeTokens.color.info,
  success: nativeTokens.color.success,
  error: nativeTokens.color.danger,
};

export function Toast({
  message,
  kind,
  onDismiss,
  dismissLabel = "Dismiss notification",
}: ToastProps): JSX.Element {
  return (
    <View
      accessibilityRole={kind === "error" ? "alert" : "text"}
      style={[styles.toast, { backgroundColor: BACKGROUND[kind] }]}
    >
      <Text style={styles.message}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={onDismiss}
        style={({ pressed }) => [styles.dismiss, pressed ? styles.pressed : null]}
      >
        <Icon name="x" size={nativeTokens.space[4]} color={nativeTokens.color.inkInverse} />
      </Pressable>
    </View>
  );
}

export function ToastProvider({
  children,
  dismissLabel = "Dismiss notification",
}: ToastProviderProps): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const logicalEnd = I18nManager.isRTL ? "left" : "right";

  const dismiss = useCallback((id: number): void => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, kind = "info", durationMs = AUTO_DISMISS_MS }: ShowToastInput): void => {
      const id = nextToastId++;
      setItems((prev) => [...prev, { id, message, kind }]);
      if (durationMs > 0) {
        const timer = setTimeout(() => dismiss(id), durationMs);
        timers.current.set(id, timer);
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) {
        clearTimeout(timer);
      }
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          styles.host,
          {
            [logicalEnd]: nativeTokens.space[4],
          },
        ]}
      >
        {items.map((item) => (
          <Toast
            key={item.id}
            message={item.message}
            kind={item.kind}
            dismissLabel={dismissLabel}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const ToastHost = ToastProvider;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    bottom: nativeTokens.space[6],
    width: "86%",
    maxWidth: 360,
    gap: nativeTokens.space[2],
  },
  toast: {
    minHeight: nativeTokens.chrome.minHit,
    borderRadius: nativeTokens.radius.md,
    paddingVertical: nativeTokens.space[3],
    paddingHorizontal: nativeTokens.space[4],
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
    ...shadowStyle("pop"),
  },
  message: {
    flex: 1,
    minWidth: 0,
    color: nativeTokens.color.inkInverse,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
    textAlign: "auto",
  },
  dismiss: {
    width: nativeTokens.space[6] + nativeTokens.space[1],
    height: nativeTokens.space[6] + nativeTokens.space[1],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeTokens.radius.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
