import { View, Text, StyleSheet } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { radius, spacing, statusStyle, typography } from "../theme";
import type { ReportStatus } from "../types/status";

export default function StatusBadge({
  status,
}: {
  status: ReportStatus | "NO_GARBAGE";
}) {
  const s = statusStyle(status);

  return (
    <View
      style={[styles.badge, { backgroundColor: s.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${s.label}`}
    >
      <Ionicons name={s.icon} size={13} color={s.fg} style={styles.icon} />
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minWidth: 0,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  icon: {
    marginRight: spacing.xs + 1,
  },
  text: {
    ...typography.label,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
