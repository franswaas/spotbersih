import { Text, StyleSheet, ActivityIndicator, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import ScalePressable from "./ScalePressable";
import { colors, radius, spacing } from "../theme";

type Variant = "primary" | "secondary" | "danger";

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  const bg = isPrimary
    ? colors.primary
    : isDanger
      ? colors.danger
      : colors.white;

  const fg = isPrimary || isDanger ? colors.white : colors.primaryDark;

  return (
    <ScalePressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        { backgroundColor: bg },
        variant === "secondary" && styles.secondaryBorder,
        isPrimary && styles.primaryShadow,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Ionicons name={icon} size={18} color={fg} style={styles.icon} />
          ) : null}
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
        </View>
      )}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  secondaryBorder: {
    borderWidth: 1.2,
    borderColor: colors.border,
  },
  primaryShadow: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
