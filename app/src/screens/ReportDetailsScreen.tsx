import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Report } from "../types/report";
import { deleteLocalReport } from "../services/reportService";
import StatusBadge from "../components/StatusBadge";
import StatusTimeline from "../components/StatusTimeline";
import DetectionConfidence from "../components/DetectionConfidence";
import FadeInView from "../components/FadeInView";
import { colors, radius, shadow, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { formatReportDate } from "../utils/date";

type ReportDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ReportDetails"
>;

export default function ReportDetailsScreen({
  route,
  navigation,
}: ReportDetailsScreenProps) {
  const { report } = route.params;

  const imageUrl = report.original_image_url;
  const hasCoordinates = report.latitude !== null && report.longitude !== null;

  const handleDelete = () => {
    deleteLocalReport(report.id);
    navigation.goBack();
  };

  const openMap = () => {
    if (!hasCoordinates) {
      return;
    }

    const url = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Tidak dapat membuka peta", "Aplikasi peta tidak tersedia."),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Report #{report.display_id}</Text>
          <StatusBadge
            status={report.garbage_detected ? report.status : "NO_GARBAGE"}
          />
        </View>

        <FadeInView style={styles.imageCard}>
          {imageUrl ? (
            Platform.OS === "web" ? (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  backgroundColor: "#0B0F19",
                  borderRadius: "16px",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={imageUrl}
                  alt="Report Photo"
                  style={{
                    width: "100%",
                    maxHeight: "440px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />

                {report.detected_items.map((item) => (
                  item.x !== undefined && (
                    <div
                      key={item.id}
                      style={{
                        position: "absolute",
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        width: `${item.width}%`,
                        height: `${item.height}%`,
                        border: `3px solid ${item.color || "#10B981"}`,
                        borderRadius: "6px",
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        boxSizing: "border-box",
                        pointerEvents: "none",
                        boxShadow: `0 0 10px ${item.color || "#10B981"}66`,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "-2px",
                          top: (item.y ?? 0) < 8 ? "4px" : "-26px",
                          backgroundColor: item.color || "#10B981",
                          color: "#FFFFFF",
                          fontSize: "12px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                          zIndex: 20,
                        }}
                      >
                        {item.label} [{Math.round(item.confidence * 100)}%]
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            )
          ) : (
            <View style={styles.imageMissing}>
              <Ionicons
                name="image-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={styles.imageMissingText}>Image not available</Text>
            </View>
          )}
        </FadeInView>

        <View style={styles.detectionCard}>
          <DetectionConfidence
            detected={report.garbage_detected}
            value={report.highest_confidence}
          />
          <Text style={styles.explainer}>
            {report.garbage_detected
              ? "How sure the app is that garbage is present."
              : "No garbage was detected — showing the original photo."}
          </Text>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{report.garbage_count}</Text>
              <Text style={styles.statLabel}>Items found</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {report.garbage_detected ? "Yes" : "No"}
              </Text>
              <Text style={styles.statLabel}>Garbage present</Text>
            </View>
          </View>

          {report.detected_items.length > 0 && (
            <>
              <View style={[styles.divider, { marginTop: spacing.md }]} />
              <Text style={styles.itemsLabel}>Detected items</Text>
              {report.detected_items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemConfidence}>
                    {Math.round(item.confidence * 100)}%
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>STATUS</Text>
        <View style={styles.statusCard}>
          {report.garbage_detected ? (
            <>
              <StatusTimeline status={report.status} />
              <View style={styles.officerNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.officerNoteText}>
                  Updates will appear here as your report is reviewed.
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.officerNoteBare}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.textMuted}
              />
              <Text style={styles.officerNoteText}>
                No garbage was detected, so this isn't tracked as an actionable
                complaint — there's nothing for staff to resolve.
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>LOCATION</Text>
        <View style={styles.infoCard}>
          {report.address ? (
            <>
              <InfoRow icon="business" label="Area" value={report.address} />
              <View style={styles.divider} />
            </>
          ) : null}
          <InfoRow
            icon="navigate"
            label="Coordinates"
            value={
              hasCoordinates
                ? `${report.latitude?.toFixed(5)}, ${report.longitude?.toFixed(5)}`
                : "Not available"
            }
          />
          <View style={styles.divider} />
          <InfoRow
            icon="time"
            label="Reported"
            value={formatReportDate(report.created_at)}
          />
        </View>

        {hasCoordinates && (
          <TouchableOpacity
            style={styles.mapButton}
            activeOpacity={0.85}
            onPress={openMap}
            accessibilityRole="button"
            accessibilityLabel="View report location on map"
          >
            <Ionicons name="map" size={18} color={colors.primary} />
            <Text style={styles.mapButtonText}>Buka di Google Maps</Text>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Delete / Resolve Report Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          activeOpacity={0.85}
          onPress={handleDelete}
        >
          <Ionicons name="sparkles" size={18} color="#059669" />
          <Text style={styles.deleteButtonText}>🧹 Sampah Sudah Bersih? Hapus Laporan</Text>
        </TouchableOpacity>
        <Text style={styles.deleteExplainerText}>
          Tandai bahwa area ini telah dibersihkan oleh warga/petugas untuk memperbarui peta dan menghemat penyimpanan data sistem.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelWrap}>
        <Ionicons name={icon} size={16} color={colors.textMuted} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    letterSpacing: -0.3,
  },
  imageCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg + 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  image: {
    width: "100%",
    height: 320,
  },
  imageMissing: {
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  imageMissingText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  detectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg + 2,
    padding: spacing.lg + 2,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  explainer: {
    ...typography.supporting,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statSep: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  statValue: {
    ...typography.sectionTitle,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemsLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  itemLabel: {
    flex: 1,
    ...typography.supporting,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.sm,
    textTransform: "capitalize",
  },
  itemConfidence: {
    ...typography.supporting,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textTransform: "uppercase",
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg + 2,
    padding: spacing.lg + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  officerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  officerNoteBare: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  officerNoteText: {
    flex: 1,
    ...typography.supporting,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg + 2,
    padding: spacing.lg + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  infoLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(15,138,76,0.1)",
  },
  mapButtonText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.primary,
    marginHorizontal: spacing.sm,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
    marginHorizontal: spacing.sm,
  },
  deleteExplainerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 16,
  },
});
