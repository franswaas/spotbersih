import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Report } from "../types/report";
import { colors, radius, shadow, spacing } from "../theme";

interface WasteDistributionMapProps {
  reports: Report[];
  onSelectReport?: (report: Report) => void;
  title?: string;
  subtitle?: string;
  height?: number;
  userLocation?: { lat: number; lng: number } | null;
}

export default function WasteDistributionMap({
  reports,
  onSelectReport,
  title = "🗺️ Peta Sebaran Titik Sampah Warga",
  subtitle = "Pantau titik lokasi sampah yang dilaporkan secara real-time untuk memudahkan aksi gotong royong.",
  height = 220,
  userLocation,
}: WasteDistributionMapProps) {
  const [internalPos, setInternalPos] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);

  const userPos = userLocation || internalPos;

  // Single GPS fetch only if not provided from parent
  const fetchUserGps = () => {
    if (userLocation) return;
    setFetchingGps(true);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setInternalPos({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
          setFetchingGps(false);
        },
        () => {
          setFetchingGps(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
      );
    } else {
      setFetchingGps(false);
    }
  };

  useEffect(() => {
    if (!userLocation) fetchUserGps();
  }, [userLocation]);

  // Filter reports that have valid numeric coordinates
  const mappedReports = useMemo(
    () =>
      reports.filter(
        (r) =>
          typeof r.latitude === "number" &&
          typeof r.longitude === "number" &&
          !isNaN(r.latitude) &&
          !isNaN(r.longitude) &&
          (r.latitude !== 0 || r.longitude !== 0),
      ),
    [reports],
  );

  // Generate Leaflet Interactive Map HTML
  const mapHtml = useMemo(() => {
    const centerLat = userPos ? userPos.lat : mappedReports.length > 0 ? mappedReports[0].latitude : -7.7591;
    const centerLng = userPos ? userPos.lng : mappedReports.length > 0 ? mappedReports[0].longitude : 110.3646;

    const userPosJson = JSON.stringify(userPos);
    const markersJson = JSON.stringify(
      mappedReports.map((r) => ({
        id: r.id,
        display_id: r.display_id,
        lat: r.latitude,
        lng: r.longitude,
        address: r.address || "Lokasi Sampah",
        count: r.garbage_count,
        image: r.original_image_url,
        items: r.detected_items.map((i) => i.label).slice(0, 2).join(", "),
      })),
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #E5E7EB;
          }
          .custom-pin {
            background-color: #EF4444;
            color: #FFFFFF;
            border-radius: 20px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            border: 2px solid #FFFFFF;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          }
          .user-pin {
            background-color: #2563EB;
            color: #FFFFFF;
            border-radius: 20px;
            padding: 5px 10px;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 0 15px rgba(37, 99, 235, 0.7), 0 4px 10px rgba(0,0,0,0.35);
            border: 2.5px solid #FFFFFF;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
            animation: pulseGps 2s infinite;
          }
          @keyframes pulseGps {
            0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
            70% { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
            100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          }
          .leaflet-popup-content {
            margin: 0;
            line-height: 1.4;
          }
          .popup-card {
            width: 220px;
          }
          .popup-img {
            width: 100%;
            height: 110px;
            object-fit: cover;
            background: #111827;
          }
          .popup-body {
            padding: 10px 12px 12px;
          }
          .popup-title {
            font-size: 13px;
            font-weight: 800;
            color: #111827;
            margin: 0 0 2px;
          }
          .popup-address {
            font-size: 11px;
            color: #4B5563;
            margin: 0 0 6px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .popup-count {
            display: inline-block;
            background: #FEE2E2;
            color: #991B1B;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            borderRadius: 4px;
          }
          .gps-center-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 1000;
            background: #FFFFFF;
            border: 1.5px solid #D1D5DB;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            color: #1F2937;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .gps-center-btn:hover {
            background: #F3F4F6;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var reports = ${markersJson};
          var userPos = ${userPosJson};
          var defaultCenter = [${centerLat}, ${centerLng}];
          var map = L.map('map', { zoomControl: true }).setView(defaultCenter, 14);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          var group = [];

          // 1. Render User Current Location Pin if GPS Active
          if (userPos && userPos.lat && userPos.lng) {
            var userPinHtml = '<div class="user-pin">🔵 Posisi Anda</div>';
            var userIcon = L.divIcon({
              className: 'leaflet-user-marker',
              html: userPinHtml,
              iconSize: [100, 28],
              iconAnchor: [50, 14]
            });

            var userMarker = L.marker([userPos.lat, userPos.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
            userMarker.bindPopup('<div style="padding: 10px; font-size: 12px; font-weight: 700; color: #1E40AF;">📍 Posisi Perangkat Anda (Saat Ini)</div>');
            group.push([userPos.lat, userPos.lng]);

            // Subtle radius ring around user
            L.circle([userPos.lat, userPos.lng], {
              color: '#2563EB',
              fillColor: '#3B82F6',
              fillOpacity: 0.12,
              radius: 200
            }).addTo(map);

            // Add floating button to center to user
            var btn = document.createElement('button');
            btn.className = 'gps-center-btn';
            btn.innerHTML = '🎯 Ke Posisi Saya';
            btn.onclick = function() {
              map.setView([userPos.lat, userPos.lng], 16);
            };
            document.body.appendChild(btn);
          }

          // 2. Render Waste Report Markers
          reports.forEach(function(r) {
            if (r.lat && r.lng) {
              var pinHtml = '<div class="custom-pin">🗑️ ' + r.display_id + '</div>';
              var customIcon = L.divIcon({
                className: 'leaflet-data-marker',
                html: pinHtml,
                iconSize: [80, 26],
                iconAnchor: [40, 13]
              });

              var marker = L.marker([r.lat, r.lng], { icon: customIcon }).addTo(map);
              group.push([r.lat, r.lng]);

              var popupContent = '<div class="popup-card">' +
                (r.image ? '<img src="' + r.image + '" class="popup-img" />' : '') +
                '<div class="popup-body">' +
                  '<div class="popup-title">Laporan #' + r.display_id + '</div>' +
                  '<div class="popup-address">📍 ' + r.address + '</div>' +
                  '<span class="popup-count">' + (r.count > 0 ? r.count + ' Sampah Terdeteksi' : 'Area Bersih') + '</span>' +
                '</div>' +
              '</div>';

              marker.bindPopup(popupContent);
            }
          });

          if (group.length > 1) {
            map.fitBounds(group, { padding: [40, 40] });
          } else if (group.length === 1) {
            map.setView(group[0], 15);
          }
        </script>
      </body>
      </html>
    `;
  }, [mappedReports, userPos]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={styles.countBadge}>
            <Ionicons name="trash" size={12} color="#DC2626" />
            <Text style={styles.countBadgeText}>{mappedReports.length} Titik Sampah</Text>
          </View>
          {userPos ? (
            <View style={styles.userPosBadge}>
              <View style={styles.userPosDot} />
              <Text style={styles.userPosBadgeText}>GPS Anda Aktif</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.activateGpsBadge}
              onPress={fetchUserGps}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={11} color="#2563EB" />
              <Text style={styles.activateGpsBadgeText}>
                {fetchingGps ? "Mencari GPS..." : "Tampilkan Posisi Saya"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Container Window */}
      <View style={[styles.mapWindow, { height }]}>
        {Platform.OS === "web" ? (
          <iframe
            srcDoc={mapHtml}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: "block",
            }}
            title="Waste Distribution Map"
          />
        ) : (
          <View style={styles.fallbackBox}>
            <Ionicons name="map-outline" size={48} color={colors.textMuted} />
            <Text style={styles.fallbackText}>Peta Interaktif Web</Text>
          </View>
        )}

        {/* Floating Quick Filter Legend */}
        <View style={styles.legendOverlay}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#2563EB" }]} />
            <Text style={styles.legendText}>Posisi Anda</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.legendText}>Titik Sampah</Text>
          </View>
        </View>
      </View>

      {mappedReports.length === 0 && (
        <View style={styles.emptyNote}>
          <Ionicons name="sparkles" size={16} color="#059669" />
          <Text style={styles.emptyNoteText}>
            Belum ada laporan sampah di sekitar Anda. Lingkungan terlihat bersih dan asri!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#991B1B",
  },
  userPosBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  userPosDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  userPosBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1E40AF",
  },
  activateGpsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#93C5FD",
  },
  activateGpsBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  mapWindow: {
    width: "100%",
    height: 350,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    position: "relative",
    marginTop: spacing.xs,
  },
  fallbackBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
  },
  legendOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    ...shadow.card,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  emptyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  emptyNoteText: {
    fontSize: 11.5,
    color: "#065F46",
    fontWeight: "600",
    flex: 1,
  },
});
