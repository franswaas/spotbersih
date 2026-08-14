import { View, Text, StyleSheet } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, statusStyle } from "../theme";
import type { ReportStatus } from "../types/status";

const STEPS = [
  { key: "PENDING", label: "Pending", icon: "time" as const },
  { key: "IN_PROGRESS", label: "In Progress", icon: "sync" as const },
  { key: "RESOLVED", label: "Resolved", icon: "checkmark-done" as const },
];

const ORDER: Record<Exclude<ReportStatus, "REJECTED">, number> = {
  PENDING: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
};

// Read-only progress indicator. Status itself is changed by officers via the
// dashboard, never from the app.
export default function StatusTimeline({ status }: { status: ReportStatus }) {
  if (status === "REJECTED") {
    const s = statusStyle(status);
    return (
      <View style={[styles.rejected, { backgroundColor: s.bg }]}>
        <Ionicons name={s.icon} size={20} color={s.fg} />
        <View style={{ marginLeft: spacing.md }}>
          <Text style={[styles.rejectedTitle, { color: s.fg }]}>Rejected</Text>
          <Text style={styles.rejectedNote}>
            This complaint was reviewed and closed without action.
          </Text>
        </View>
      </View>
    );
  }

  const current = ORDER[status];

  return (
    <View style={styles.row}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        const leftOn = i > 0 && current >= i;
        const rightOn = i < STEPS.length - 1 && current > i;
        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.connectorRow}>
              <View
                style={[
                  styles.connector,
                  { backgroundColor: leftOn ? colors.primary : colors.border },
                  i === 0 && styles.transparent,
                ]}
              />
              <View
                style={[
                  styles.circle,
                  done
                    ? {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      }
                    : {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Ionicons
                  name={step.icon}
                  size={18}
                  color={done ? colors.white : colors.textMuted}
                />
              </View>
              <View
                style={[
                  styles.connector,
                  { backgroundColor: rightOn ? colors.primary : colors.border },
                  i === STEPS.length - 1 && styles.transparent,
                ]}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: done ? colors.text : colors.textMuted },
                i === current && styles.labelCurrent,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  step: {
    flex: 1,
    alignItems: "center",
  },
  connectorRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  connector: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  transparent: {
    backgroundColor: "transparent",
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  labelCurrent: {
    color: colors.primaryDark,
  },
  rejected: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.rejectedSoft,
  },
  rejectedTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  rejectedNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
});
