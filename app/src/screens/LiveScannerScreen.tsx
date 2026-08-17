import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  Animated,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import axios from "axios";

import { useAuth } from "../context/AuthContext";
import { submitReport as uploadReport } from "../services/detectionService";
import { saveReport } from "../services/reportService";
import { colors, radius, shadow, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

type LiveScannerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "LiveScanner"
>;

interface DetectedBox {
  id: string;
  class_name?: string;
  label: string;
  category: "RECYCLABLE" | "NON_RECYCLABLE" | "HAZARDOUS" | "ORGANIC";
  confidence: number;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage (0-100)
  height: number; // percentage (0-100)
  color: string;
  missCount?: number;
}

import { getAiServerUrl } from "../config/aiServer";

const LOCAL_YOLO_URL = getAiServerUrl();
const MAX_MISS_FRAMES = 2;

export default function LiveScannerScreen({
  navigation,
}: LiveScannerScreenProps) {
  const { email } = useAuth();
  const [cameraActive, setCameraActive] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);
  const [wasteStatusText, setWasteStatusText] = useState<string>(
    "Connecting to Smart AI Engine...",
  );
  const [wasteFound, setWasteFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isDetectingRef = useRef(false);
  const trackedBoxesRef = useRef<DetectedBox[]>([]);

  // Animated laser bar
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Check Unified AI Server Status
  useEffect(() => {
    isMountedRef.current = true;

    const checkServer = async () => {
      try {
        const res = await axios.get(`${LOCAL_YOLO_URL}/health`, {
          timeout: 2000,
        });
        if (res.data?.status === "online" && isMountedRef.current) {
          setServerOnline(true);
          setWasteStatusText("🟢 Smart AI Waste Detection Engine Active");
        }
      } catch {
        if (isMountedRef.current) {
          setServerOnline(false);
          setWasteStatusText("AI Engine Ready");
        }
      }
    };

    void checkServer();

    if (Platform.OS === "web" && typeof document !== "undefined") {
      if (!document.getElementById("live-laser-anim-styles")) {
        const styleTag = document.createElement("style");
        styleTag.id = "live-laser-anim-styles";
        styleTag.innerHTML = `
          @keyframes liveScanLaser {
            0% { top: 6%; opacity: 0.8; }
            50% { top: 92%; opacity: 1; }
            100% { top: 6%; opacity: 0.8; }
          }
        `;
        document.head.appendChild(styleTag);
      }
    }

    void requestGpsLocation(false);

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [laserAnim]);

  const [showGpsModal, setShowGpsModal] = useState(false);

  const requestGpsLocation = async (showGuideOnError = false) => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (isMountedRef.current) {
            setGpsLocation({
              lat: Number(pos.coords.latitude.toFixed(5)),
              lng: Number(pos.coords.longitude.toFixed(5)),
            });
            setShowGpsModal(false);
          }
        },
        async (err) => {
          if (isMountedRef.current && showGuideOnError) {
            setShowGpsModal(true);
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      );
    } else {
      if (showGuideOnError) {
        setShowGpsModal(true);
      }
    }
  };

  const fetchIpGeolocation = async () => {
    try {
      const res = await axios.get("https://ipapi.co/json/", { timeout: 6000 });
      if (res.data && res.data.latitude && res.data.longitude && isMountedRef.current) {
        setGpsLocation({
          lat: Number(res.data.latitude.toFixed(5)),
          lng: Number(res.data.longitude.toFixed(5)),
        });
        setShowGpsModal(false);
      }
    } catch {
      Alert.alert("Gagal Membaca Jaringan", "Pastikan koneksi internet aktif untuk mendapatkan lokasi.");
    }
  };

  const startCamera = useCallback(async () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Live Web Cam",
        "Real-time webcam mode is optimized for Web browsers.",
      );
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      Alert.alert(
        "Camera Permission Denied",
        "Please allow camera permissions in your browser to use the Live AI Scanner.",
      );
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
    }
    trackedBoxesRef.current = [];
    setCameraActive(false);
    setDetectedBoxes([]);
    setWasteFound(false);
    setWasteStatusText("Camera offline");
  }, []);

  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  useEffect(() => {
    if (cameraActive) {
      void startCamera();
    }
  }, [facingMode, startCamera]);

  useEffect(() => {
    if (Platform.OS === "web") {
      void startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!cameraActive || !scanning) {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
      return;
    }

    scanTimerRef.current = setInterval(() => {
      void sendFrameToYoloBackend();
    }, 200);

    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    };
  }, [cameraActive, scanning]);

  // Smooth tracker
  const updateTrackedBoxes = (newBoxes: DetectedBox[]) => {
    const prevBoxes = trackedBoxesRef.current;
    const updated: DetectedBox[] = [];

    if (newBoxes.length > 0) {
      const validNewBoxes = newBoxes.filter((b) => b.width < 75 && b.height < 75);
      validNewBoxes.forEach((nBox) => {
        const match = prevBoxes.find(
          (p) =>
            Math.abs(p.x - nBox.x) < 25 &&
            Math.abs(p.y - nBox.y) < 25 &&
            p.label === nBox.label,
        );

        if (match) {
          const smoothX = Math.round((match.x * 0.35 + nBox.x * 0.65) * 10) / 10;
          const smoothY = Math.round((match.y * 0.35 + nBox.y * 0.65) * 10) / 10;
          const smoothW = Math.round((match.width * 0.35 + nBox.width * 0.65) * 10) / 10;
          const smoothH = Math.round((match.height * 0.35 + nBox.height * 0.65) * 10) / 10;

          updated.push({
            ...nBox,
            x: smoothX,
            y: smoothY,
            width: smoothW,
            height: smoothH,
            missCount: 0,
          });
        } else {
          updated.push({
            ...nBox,
            missCount: 0,
          });
        }
      });

      prevBoxes.forEach((pBox) => {
        const isMatched = updated.some((u) => u.label === pBox.label);
        if (!isMatched && (pBox.missCount || 0) < MAX_MISS_FRAMES) {
          updated.push({
            ...pBox,
            missCount: (pBox.missCount || 0) + 1,
          });
        }
      });
    } else {
      prevBoxes.forEach((pBox) => {
        const misses = (pBox.missCount || 0) + 1;
        if (misses < MAX_MISS_FRAMES) {
          updated.push({
            ...pBox,
            missCount: misses,
          });
        }
      });
    }

    trackedBoxesRef.current = updated;

    if (isMountedRef.current) {
      setDetectedBoxes([...updated]);
      if (updated.length > 0) {
        setWasteFound(true);
        const top = updated[0];
        setWasteStatusText(`🗑️ ${top.label} DETECTED (${top.confidence}%)`);
      } else {
        setWasteFound(false);
        setWasteStatusText("✅ Target Area Clean — No Waste Detected");
      }
    }
  };

  // Send current video frame to unified ensemble backend
  const sendFrameToYoloBackend = async () => {
    if (isDetectingRef.current) return;

    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    isDetectingRef.current = true;

    try {
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = 480;
      offscreenCanvas.height = 360;
      const ctx = offscreenCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 480, 360);
      const dataUrl = offscreenCanvas.toDataURL("image/jpeg", 0.65);

      const response = await axios.post(
        `${LOCAL_YOLO_URL}/detect`,
        {
          image: dataUrl,
          confidence: 0.35,
        },
        { timeout: 1200 },
      );

      if (isMountedRef.current && response.data) {
        const rawDetections: DetectedBox[] = response.data.detections || [];
        updateTrackedBoxes(rawDetections);
        setServerOnline(true);
      }
    } catch {
      // Offline fallback
    } finally {
      isDetectingRef.current = false;
    }
  };

  const captureAndReportNow = async () => {
    if (!gpsLocation) {
      Alert.alert(
        "📍 GPS Belum Aktif",
        "Laporan pemindaian memerlukan koordinat GPS asli Anda. Silakan klik tombol 'Aktifkan GPS' di pojok atas layar terlebih dahulu.",
      );
      void requestGpsLocation(true);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      Alert.alert("Camera Error", "No camera stream available.");
      return;
    }

    setSubmitting(true);

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = video.videoWidth || 1280;
    offscreenCanvas.height = video.videoHeight || 720;
    const ctx = offscreenCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

      // Draw AI Bounding Boxes directly onto the report snapshot image
      detectedBoxes.forEach((box) => {
        const bx = (box.x / 100) * offscreenCanvas.width;
        const by = (box.y / 100) * offscreenCanvas.height;
        const bw = (box.width / 100) * offscreenCanvas.width;
        const bh = (box.height / 100) * offscreenCanvas.height;

        // Draw bounding box rectangle
        ctx.strokeStyle = box.color || "#10B981";
        ctx.lineWidth = Math.max(4, Math.round(offscreenCanvas.width * 0.0035));
        ctx.strokeRect(bx, by, bw, bh);

        // Draw label background tag
        const tagText = `${box.label} [${box.confidence}%]`;
        const fontSize = Math.max(14, Math.round(offscreenCanvas.width * 0.015));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(tagText);
        const tagW = textMetrics.width + 16;
        const tagH = fontSize + 10;
        const tagY = by < tagH + 6 ? by + 4 : by - tagH - 4;

        ctx.fillStyle = box.color || "#10B981";
        ctx.fillRect(bx, tagY, tagW, tagH);

        // Draw label text
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(tagText, bx + 8, tagY + fontSize + 1);
      });
    }
    const dataUrl = offscreenCanvas.toDataURL("image/jpeg", 0.88);
    const lat = gpsLocation.lat;
    const lng = gpsLocation.lng;
    const userEmail = email || "tamu.edukasi@wastemanagement.id";

    try {
      const res = await uploadReport(dataUrl, lat, lng, userEmail);

      // Save to centralized database
      await saveReport({
        id: `LOC-${Date.now()}`,
        display_id: `LIVE-${Date.now().toString().slice(-4)}`,
        latitude: lat,
        longitude: lng,
        address: `Live Scan GPS: ${lat}, ${lng}`,
        original_image_url: dataUrl,
        garbage_detected: detectedBoxes.length > 0,
        garbage_count: detectedBoxes.length,
        highest_confidence:
          detectedBoxes.length > 0
            ? Math.max(...detectedBoxes.map((b) => b.confidence / 100))
            : 0.85,
        status: "RESOLVED",
        created_at: new Date().toISOString(),
        detected_items: detectedBoxes.map((b) => ({
          id: b.id,
          label: b.label,
          confidence: b.confidence / 100,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          color: b.color,
        })),
      });

      Alert.alert(
        res.status === "success"
          ? "🎉 Laporan Berhasil Dikirim!"
          : "ℹ️ Pemindaian Selesai",
        res.status === "success"
          ? `Sampah berhasil dicatat dan masuk ke riwayat laporan.`
          : `Tidak ada sampah terdeteksi pada jepretan ini.`,
      );
    } catch {
      // Local fallback save
      await saveReport({
        id: `LOC-${Date.now()}`,
        display_id: `LIVE-${Date.now().toString().slice(-4)}`,
        latitude: lat,
        longitude: lng,
        address: "Lokasi Live Scanner",
        original_image_url: dataUrl,
        garbage_detected: detectedBoxes.length > 0,
        garbage_count: detectedBoxes.length,
        highest_confidence:
          detectedBoxes.length > 0
            ? Math.max(...detectedBoxes.map((b) => b.confidence / 100))
            : 0.85,
        status: "RESOLVED",
        created_at: new Date().toISOString(),
        detected_items: detectedBoxes.map((b) => ({
          id: b.id,
          label: b.label,
          confidence: b.confidence / 100,
        })),
      });

      Alert.alert(
        "🎉 Laporan Berhasil Dicatat!",
        "Laporan pengujian Anda telah tersimpan dan dapat dilihat di Riwayat Laporan.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI Waste Detection Scanner</Text>
            <Text style={styles.headerSubtitle}>
              {serverOnline
                ? "🟢 Smart Multi-Model Ensemble AI Engine: Active"
                : "Connecting to AI inference engine..."}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: cameraActive
                    ? wasteFound
                      ? "#10B981"
                      : "#6B7280"
                    : "#6B7280",
                },
              ]}
            />
            <Text style={styles.statusText}>
              {cameraActive
                ? wasteFound
                  ? "WASTE DETECTED"
                  : "AREA CLEAN"
                : "OFFLINE"}
            </Text>
          </View>
        </View>

        {/* Viewfinder Window */}
        <View style={styles.viewfinderContainer}>
          {Platform.OS === "web" ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0F172A",
              }}
            >
              <video
                ref={videoRef as never}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: cameraActive ? "block" : "none",
                  backgroundColor: "#000",
                }}
              />

              {/* Smooth Web Bounding Boxes */}
              {cameraActive &&
                detectedBoxes.map((box) => (
                  <div
                    key={box.id}
                    style={{
                      position: "absolute",
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                      border: `2.5px solid ${box.color}`,
                      borderRadius: "6px",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      pointerEvents: "none",
                      boxSizing: "border-box",
                      transition:
                        "left 0.18s cubic-bezier(0.25, 1, 0.5, 1), top 0.18s cubic-bezier(0.25, 1, 0.5, 1), width 0.18s ease-out, height 0.18s ease-out",
                      boxShadow: `0 0 12px ${box.color}66`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: box.y < 8 ? "4px" : "-26px",
                        left: "-2px",
                        backgroundColor: box.color,
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
                      {box.label} [{box.confidence}%]
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <View style={styles.placeholderBox}>
              <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
              <Text style={styles.placeholderText}>
                Camera preview active on web browser
              </Text>
            </View>
          )}

          {/* HUD Target Overlays */}
          {cameraActive && (
            <View style={styles.hudOverlay} pointerEvents="none">
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              {scanning && (
                <div
                  style={{
                    position: "absolute",
                    left: "3%",
                    right: "3%",
                    height: "3px",
                    backgroundColor: "#10B981",
                    boxShadow: "0 0 16px #10B981, 0 0 32px #10B981",
                    borderRadius: "2px",
                    zIndex: 15,
                    pointerEvents: "none",
                    animation: "liveScanLaser 2.8s ease-in-out infinite",
                  }}
                />
              )}

              <View style={styles.crosshair}>
                <View style={styles.crosshairH} />
                <View style={styles.crosshairV} />
              </View>
            </View>
          )}

          {/* Live Badges */}
          <View style={styles.hudTopBar}>
            <View style={styles.hudPill}>
              <Ionicons name="scan-outline" size={14} color="#FFF" />
              <Text style={styles.hudPillText}>AI Waste Tracker</Text>
            </View>

            {gpsLocation ? (
              <View style={styles.hudPill}>
                <Ionicons name="location-sharp" size={14} color="#10B981" />
                <Text style={styles.hudPillText}>
                  {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.hudPill, { backgroundColor: "rgba(239, 68, 68, 0.85)" }]}
                onPress={() => void requestGpsLocation(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="warning" size={14} color="#FFF" />
                <Text style={styles.hudPillText}>GPS Mati (Klik Aktifkan)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Real-time Classification Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleWrap}>
              <Ionicons
                name={wasteFound ? "trash-bin" : "shield-checkmark"}
                size={22}
                color={wasteFound ? "#10B981" : "#10B981"}
              />
              <Text style={styles.summaryTitle}>{wasteStatusText}</Text>
            </View>
          </View>

          {detectedBoxes.length > 0 ? (
            <View style={styles.itemsList}>
              {detectedBoxes.map((b) => (
                <View key={b.id} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: b.color }]}
                    />
                    <Text style={styles.itemName}>{b.label}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <View
                      style={[
                        styles.badgeType,
                        { backgroundColor: b.color + "22" },
                      ]}
                    >
                      <Text style={[styles.badgeTypeText, { color: b.color }]}>
                        {b.category.replace("_", " ")}
                      </Text>
                    </View>
                    <Text style={styles.itemConf}>{b.confidence}%</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyGuideText}>
              Arahkan kamera ke sampah (botol plastik, kertas/tisu, kardus, plastik bungkus, kaleng, atau sisa makanan). Sistem otomatis mendeteksi dan mengkategorikannya secara real-time.
            </Text>
          )}

          {/* Quick Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { opacity: submitting ? 0.7 : 1 },
              wasteFound && { backgroundColor: colors.primary },
            ]}
            onPress={captureAndReportNow}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Ionicons
              name={submitting ? "hourglass-outline" : "send"}
              size={18}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.submitButtonText}>
              {submitting
                ? "Submitting Report..."
                : "⚡ Log & Submit Current Frame Report"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Controls Toolbar */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={cameraActive ? stopCamera : () => void startCamera()}
          >
            <Ionicons
              name={cameraActive ? "stop-circle" : "play-circle"}
              size={20}
              color={cameraActive ? "#EF4444" : colors.primary}
            />
            <Text style={styles.controlBtnText}>
              {cameraActive ? "Stop Camera" : "Start Camera"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setScanning((prev) => !prev)}
          >
            <Ionicons
              name={scanning ? "pause" : "scan"}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.controlBtnText}>
              {scanning ? "Pause AI" : "Resume AI"}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Interactive GPS Activation Guide Modal */}
      <Modal
        visible={showGpsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGpsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="location" size={28} color="#DC2626" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Aktifkan GPS / Lokasi</Text>
                <Text style={styles.modalSubtitle}>
                  Diperlukan untuk mencatat titik koordinat sampah
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGpsModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.guideStepTitle}>📌 Cara Mengizinkan Lokasi di Browser:</Text>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepText}>
                  Lihat ke <Text style={{ fontWeight: "700" }}>Address Bar</Text> di samping URL <Text style={{ fontWeight: "700" }}>localhost:3000</Text>.
                </Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <Text style={styles.stepText}>
                  Klik ikon <Text style={{ fontWeight: "700" }}>Setelan / Gembok / Slider</Text> di kiri URL.
                </Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                <Text style={styles.stepText}>
                  Ubah izin <Text style={{ fontWeight: "700" }}>Location</Text> menjadi <Text style={{ color: "#059669", fontWeight: "700" }}>Allow / Izinkan</Text>.
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => requestGpsLocation(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={18} color="#FFF" />
                <Text style={styles.modalPrimaryBtnText}>Coba Kunci GPS Lagi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={fetchIpGeolocation}
                activeOpacity={0.85}
              >
                <Ionicons name="globe-outline" size={18} color="#059669" />
                <Text style={styles.modalSecondaryBtnText}>Gunakan Lokasi Jaringan (Otomatis)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.5,
  },
  viewfinderContainer: {
    width: "100%",
    minHeight: 480,
    height: 520,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#0B0F19",
    position: "relative",
    ...shadow.card,
  },
  placeholderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  placeholderText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#10B981",
  },
  cornerTopLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserBeam: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: "#10B981",
  },
  crosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 30,
    height: 30,
    marginLeft: -15,
    marginTop: -15,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    width: 20,
    height: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  crosshairV: {
    position: "absolute",
    height: 20,
    width: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  hudTopBar: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 12,
  },
  hudPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  hudPillText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 5,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  summaryTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 8,
  },
  itemsList: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 6,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeType: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeTypeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  itemConf: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    width: 34,
    textAlign: "right",
  },
  emptyGuideText: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginVertical: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: radius.md,
    ...shadow.card,
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxWidth: 520,
    width: "100%",
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalBody: {
    backgroundColor: "#F9FAFB",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  guideStepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
    flex: 1,
  },
  modalActions: {
    gap: spacing.sm,
  },
  modalPrimaryBtn: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSecondaryBtn: {
    backgroundColor: "#ECFDF5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
  },
});
