import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Report } from "../types/report";
import { getReports, deleteLocalReport, clearAllLocalReports } from "../services/reportService";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import DetectionConfidence from "../components/DetectionConfidence";
import FadeInView from "../components/FadeInView";
import ScalePressable from "../components/ScalePressable";
import WasteDistributionMap from "../components/WasteDistributionMap";
import { colors, radius, shadow, spacing, typography } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import type { ReportStatus } from "../types/status";
import { formatReportDate } from "../utils/date";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "ALL", label: "Semua" },
  { key: "RESOLVED", label: "Terdata" },
  { key: "PENDING", label: "Diproses" },
];

type FilterKey = ReportStatus | "ALL";
type ReportsScreenProps = NativeStackScreenProps<RootStackParamList, "Reports">;

export default function ReportsScreen({ navigation }: ReportsScreenProps) {
  const { email } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const mountedRef = useRef(true);

  const loadReports = async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) {
      setLoading(true);
    }

    try {
      const data = await getReports(email || "tamu.edukasi@wastemanagement.id");
      if (mountedRef.current) {
        setReports(data);
      }
    } catch {
      // Ignored
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void loadReports({ showLoading: true });

    const unsubscribe = navigation.addListener("focus", () => {
      void loadReports();
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
  };

  const handleDeleteItem = (id: string, displayId: string) => {
    deleteLocalReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id && r.display_id !== id));
  };

  const handleClearAll = () => {
    clearAllLocalReports();
    setReports([]);
  };

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === "PENDING").length,
      resolved: reports.filter((r) => r.status === "RESOLVED").length,
    }),
    [reports],
  );

  const filtered = useMemo(
    () =>
      filter === "ALL" ? reports : reports.filter((r) => r.status === filter),
    [reports, filter],
  );

  const Header = (
    <View style={{ marginBottom: spacing.md }}>
      <View style={styles.statsRow}>
        <StatCard value={stats.total} label="Total Laporan" tint="#059669" />
        <StatCard value={stats.resolved} label="Terverifikasi" tint="#10B981" />
      </View>

      {/* Gotong Royong Narrative Banner */}
      <View style={styles.communityBanner}>
        <Ionicons name="people" size={18} color="#059669" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.communityBannerTitle}>Warga Bantu Warga: Gerakan Bersih Lingkungan</Text>
          <Text style={styles.communityBannerText}>
            Jika tumpukan sampah di lokasi laporan sudah dibersihkan bersama, silakan hapus laporan tersebut untuk memperbarui peta dan menghemat penyimpanan sistem.
          </Text>
        </View>
      </View>

      <View style={styles.actionFilterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                activeOpacity={0.8}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {reports.length > 0 && (
          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={handleClearAll}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-bin-outline" size={14} color="#EF4444" />
            <Text style={styles.clearAllBtnText}>Bersihkan Semua</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={Header}
        ListFooterComponent={<WasteDistributionMap reports={reports} />}
        ListEmptyComponent={
          <View style={styles.emptyInline}>
            <Ionicons
              name={reports.length === 0 ? "file-tray-outline" : "search-outline"}
              size={56}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {reports.length === 0 ? "Belum Ada Laporan Sampah" : "Tidak Ada Laporan yang Sesuai"}
            </Text>
            <Text style={styles.emptyText}>
              {reports.length === 0
                ? "Kirim laporan pertama Anda dari menu Photo Waste Report atau Live Scanner."
                : "Coba ganti filter pencarian."}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item, index }) => (
          <FadeInView delay={Math.min(index, 6) * 70}>
            <View style={styles.card}>
              <ScalePressable
                onPress={() =>
                  navigation.navigate("ReportDetails", { report: item })
                }
                style={{ flex: 1 }}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Image
                      source={{ uri: item.original_image_url }}
                      style={styles.thumb}
                    />
                    {item.garbage_count > 0 && (
                      <View style={styles.thumbChip}>
                        <Ionicons name="trash" size={9} color={colors.white} />
                        <Text style={styles.thumbChipText}>
                          {item.garbage_count}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.reportId} numberOfLines={1}>
                        Laporan #{item.display_id}
                      </Text>
                    </View>

                    <View style={styles.statusWrap}>
                      <StatusBadge
                        status={item.garbage_detected ? item.status : "NO_GARBAGE"}
                      />
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#059669"
                      />
                      <Text style={[styles.metaText, { color: "#065F46", fontWeight: "600" }]} numberOfLines={1}>
                        {item.address || `${item.latitude}, ${item.longitude}`}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={colors.textMuted}
                      />
                      <Text style={styles.metaText}>
                        {formatReportDate(item.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardConfidence}>
                  <DetectionConfidence
                    detected={item.garbage_detected}
                    value={item.highest_confidence}
                  />
                </View>
              </ScalePressable>

              {/* Delete Button on Card */}
              <TouchableOpacity
                style={styles.deleteCardBtn}
                onPress={() => handleDeleteItem(item.id, item.display_id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </FadeInView>
        )}
      />
    </SafeAreaView>
  );
}

function StatCard({
  value,
  label,
  tint,
}: {
  value: number;
  label: string;
  tint: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    ...shadow.card,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  communityBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: radius.md,
    padding: 12,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  communityBannerTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#065F46",
  },
  communityBannerText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: "#047857",
    marginTop: 2,
  },
  actionFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  chipsRow: {
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  clearAllBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: "relative",
    ...shadow.card,
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  thumbChip: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  thumbChipText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: "700",
  },
  cardBody: {
    flex: 1,
    justifyContent: "center",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportId: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  statusWrap: {
    marginVertical: 4,
    alignSelf: "flex-start",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardConfidence: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  deleteCardBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    padding: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
  },
  emptyInline: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
