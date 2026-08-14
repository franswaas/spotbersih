import { View, Text, StyleSheet } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import ConfidenceBar from "./ConfidenceBar";
import { colors, spacing } from "../theme";

interface Props {
  detected: boolean;
  value: number;
}

// Shows the AI confidence bar only when garbage was actually detected.
// When nothing is found, confidence is 0 — so we show a clear "No garbage
// detected" note instead of a misleading 0% "Low" bar.
export default function DetectionConfidence({ detected, value }: Props) {
  if (detected) {
    return <ConfidenceBar value={value} />;
  }

  return (
    <View style={styles.row}>
      <Ionicons
        name="shield-checkmark-outline"
        size={16}
        color={colors.textMuted}
      />
      <Text style={styles.text}>No garbage detected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginLeft: spacing.xs + 2,
  },
});
