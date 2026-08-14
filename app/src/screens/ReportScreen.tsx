import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Alert,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import axios from "axios";

import { submitReport as uploadReport } from "../services/detectionService";
import { saveLocalReport } from "../services/reportService";
import { UploadResult } from "../types/detection";
import { useAuth } from "../context/AuthContext";
import FadeInView from "../components/FadeInView";
import { colors, radius, shadow, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";

const LOCAL_YOLO_URL = "http://127.0.0.1:8000";

interface DetectedBox {
  id: string;
  label: string;
  category: "RECYCLABLE" | "NON_RECYCLABLE" | "HAZARDOUS" | "ORGANIC";
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface GpsData {
  lat: number;
  lng: number;
  accuracy: number;
  source?: string;
}

function getWasteGuide(category: string, label: string) {
  const l = label.toLowerCase();
  if (category === "HAZARDOUS" || l.includes("baterai") || l.includes("battery") || l.includes("elektronik") || l.includes("lamp")) {
    return {
      bin: "Tong Merah (B3)",
      binColor: "#EF4444",
      tag: "B3 Berbahaya",
      tagBg: "#FEE2E2",
      tagColor: "#991B1B",
      tip: "Limbah Berbahaya & Beracun. Pisahkan dan serahkan ke drop point e-waste resmi / dinas kebersihan.",
    };
  }
  if (category === "RECYCLABLE" || l.includes("plastik") || l.includes("botol") || l.includes("kardus") || l.includes("kaleng") || l.includes("kaca") || l.includes("kertas")) {
    return {
      bin: "Tong Kuning (Daur Ulang)",
      binColor: "#D97706",
      tag: "Dapat Didaur Ulang",
      tagBg: "#FEF3C7",
      tagColor: "#92400E",
      tip: "Bilas sisa cairan/kotoran, remas agar hemat tempat, lalu salurkan ke Bank Sampah atau TPS 3R.",
    };
  }
  if (category === "ORGANIC" || l.includes("makanan") || l.includes("daun") || l.includes("sayur") || l.includes("buah")) {
    return {
      bin: "Tong Hijau (Organik)",
      binColor: "#059669",
      tag: "Sampah Organik",
      tagBg: "#D1FAE5",
      tagColor: "#065F46",
      tip: "Dapat diolah menjadi pupuk kompos atau pakan maggot BSF.",
    };
  }
  return {
    bin: "Tong Abu-Abu (Residu)",
    binColor: "#6B7280",
    tag: "Sampah Residu",
    tagBg: "#F3F4F6",
    tagColor: "#374151",
    tip: "Sampah non-daur ulang. Buang tertutup ke tempat sampah residu untuk diteruskan ke TPA.",
  };
}

type ReportScreenProps = NativeStackScreenProps<RootStackParamList, "Report">;

export default function ReportScreen({ navigation }: ReportScreenProps) {
  const { email } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  // User True GPS Coordinates
  const [gpsLocation, setGpsLocation] = useState<GpsData | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [customAddress, setCustomAddress] = useState("");

  const mountedRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Request High Accuracy Device GPS
  const activateHighAccuracyGps = (showGuideOnError = true) => {
    setFetchingGps(true);
    setGpsError(null);

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mountedRef.current) {
            const lat = Number(pos.coords.latitude.toFixed(6));
            const lng = Number(pos.coords.longitude.toFixed(6));
            const accuracy = Math.round(pos.coords.accuracy);

            setGpsLocation({ lat, lng, accuracy, source: "Hardware GPS / Satelit" });
            setGpsError(null);
            setFetchingGps(false);
            setShowGpsModal(false);

            if (!customAddress) {
              setCustomAddress(`GPS Presisi: ${lat}, ${lng}`);
            }
          }
        },
        async (err) => {
          if (mountedRef.current) {
            setFetchingGps(false);

            let msg = "Gagal mengambil koordinat lokasi.";
            if (err.code === 1) {
              msg = "Izin lokasi browser saat ini diblokir (Denied).";
              if (showGuideOnError) {
                setShowGpsModal(true);
              }
            } else if (err.code === 2) {
              msg = "Sinyal GPS perangkat tidak terdeteksi. Coba gunakan lokasi jaringan.";
              if (showGuideOnError) {
                setShowGpsModal(true);
              }
            } else if (err.code === 3) {
              msg = "Waktu pencarian satelit GPS habis.";
              if (showGuideOnError) {
                setShowGpsModal(true);
              }
            }

            setGpsError(msg);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        },
      );
    } else {
      setGpsError("Browser tidak mendukung geolokasi.");
      setFetchingGps(false);
    }
  };

  // Fallback: Fetch Real Regional Geolocation via IP Service
  const fetchIpGeolocation = async () => {
    setFetchingGps(true);
    try {
      const res = await axios.get("https://ipapi.co/json/", { timeout: 6000 });
      if (res.data && res.data.latitude && res.data.longitude && mountedRef.current) {
        const lat = Number(res.data.latitude.toFixed(6));
        const lng = Number(res.data.longitude.toFixed(6));
        const city = res.data.city || res.data.region || "Lokasi Anda";

        setGpsLocation({ lat, lng, accuracy: 100, source: `Jaringan ISP (${city})` });
        setGpsError(null);
        setShowGpsModal(false);

        if (!customAddress) {
          setCustomAddress(`${city} (${lat}, ${lng})`);
        }
      }
    } catch {
      Alert.alert("Gagal Membaca Jaringan", "Pastikan koneksi internet aktif untuk mendapatkan lokasi.");
    } finally {
      if (mountedRef.current) {
        setFetchingGps(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    activateHighAccuracyGps(false);

    return () => {
      mountedRef.current = false;
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const openCameraViewfinder = async () => {
    if (!gpsLocation) {
      activateHighAccuracyGps(false);
    }

    if (Platform.OS === "web") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        streamRef.current = stream;
        setIsCameraActive(true);
        setImageUri(null);
        setResult(null);
        setDetectedBoxes([]);
        setHasScanned(false);

        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
        }, 100);
      } catch {
        Alert.alert(
          "Izin Kamera Dibutuhkan",
          "Silakan izinkan akses kamera di browser Anda untuk mengambil foto.",
        );
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const offscreen = document.createElement("canvas");
      offscreen.width = video.videoWidth || 1280;
      offscreen.height = video.videoHeight || 720;
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
        const dataUrl = offscreen.toDataURL("image/jpeg", 0.85);

        stopCameraStream();
        setImageUri(dataUrl);
        void analyzeSelectedPhoto(dataUrl);
      }
    } catch (err) {
      console.error(err);
      stopCameraStream();
    }
  };

  const analyzeSelectedPhoto = async (uri: string) => {
    setAnalyzingImage(true);
    setDetectedBoxes([]);
    setHasScanned(false);

    try {
      let base64Data = "";
      if (Platform.OS === "web" && uri.startsWith("blob:")) {
        const response = await fetch(uri);
        const blob = await response.blob();
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        base64Data = uri;
      }

      const res = await axios.post(
        `${LOCAL_YOLO_URL}/detect`,
        {
          image: base64Data,
          confidence: 0.25,
        },
        { timeout: 6000 },
      );

      if (mountedRef.current && res.data?.detections) {
        setDetectedBoxes(res.data.detections);
      }
    } catch (err) {
      console.warn("AI analysis skipped/offline:", err);
    } finally {
      if (mountedRef.current) {
        setAnalyzingImage(false);
        setHasScanned(true);
      }
    }
  };

  const pickImage = async () => {
    stopCameraStream();
    if (!gpsLocation) {
      activateHighAccuracyGps(false);
    }

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        const uri = res.assets[0].uri;
        setImageUri(uri);
        setResult(null);
        void analyzeSelectedPhoto(uri);
      }
    } catch {
      Alert.alert("Gagal Membuka Galeri", "Silakan coba pilih foto kembali.");
    }
  };

  const submitReport = async () => {
    if (!imageUri) {
      Alert.alert("Foto Kosong", "Silakan ambil atau pilih foto sampah terlebih dahulu.");
      return;
    }

    // Strictly require real GPS
    if (!gpsLocation) {
      setShowGpsModal(true);
      return;
    }

    setLoading(true);

    const lat = gpsLocation.lat;
    const lng = gpsLocation.lng;
    const resolvedAddress = customAddress.trim() || `Lat: ${lat}, Long: ${lng}`;
    const userEmail = email || "tamu.edukasi@wastemanagement.id";

    // Burn bounding boxes into final saved snapshot image if detected
    let finalImageToSave = imageUri;
    if (Platform.OS === "web" && detectedBoxes.length > 0) {
      try {
        const imgEl = new (window as any).Image();
        imgEl.src = imageUri;
        await new Promise((resolve) => {
          if (imgEl.complete) resolve(true);
          else {
            imgEl.onload = () => resolve(true);
            imgEl.onerror = () => resolve(true);
          }
        });

        const canvas = document.createElement("canvas");
        canvas.width = imgEl.naturalWidth || 1280;
        canvas.height = imgEl.naturalHeight || 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

          detectedBoxes.forEach((box) => {
            const bx = (box.x / 100) * canvas.width;
            const by = (box.y / 100) * canvas.height;
            const bw = (box.width / 100) * canvas.width;
            const bh = (box.height / 100) * canvas.height;

            ctx.strokeStyle = box.color || "#10B981";
            ctx.lineWidth = Math.max(4, Math.round(canvas.width * 0.0035));
            ctx.strokeRect(bx, by, bw, bh);

            const tagText = `${box.label} [${box.confidence}%]`;
            const fontSize = Math.max(14, Math.round(canvas.width * 0.015));
            ctx.font = `bold ${fontSize}px sans-serif`;
            const textMetrics = ctx.measureText(tagText);
            const tagW = textMetrics.width + 16;
            const tagH = fontSize + 10;
            const tagY = by < tagH + 6 ? by + 4 : by - tagH - 4;

            ctx.fillStyle = box.color || "#10B981";
            ctx.fillRect(bx, tagY, tagW, tagH);

            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(tagText, bx + 8, tagY + fontSize + 1);
          });

          finalImageToSave = canvas.toDataURL("image/jpeg", 0.88);
        }
      } catch (e) {
        console.warn("Composite drawing skipped:", e);
      }
    }

    try {
      const response = await uploadReport(finalImageToSave, lat, lng, userEmail);

      // Save to local report history with true GPS & bounding box coordinates
      saveLocalReport({
        id: `LOC-${Date.now()}`,
        display_id: `RPT-${Date.now().toString().slice(-4)}`,
        latitude: lat,
        longitude: lng,
        address: resolvedAddress,
        original_image_url: finalImageToSave,
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

      if (mountedRef.current) {
        setResult(response);
      }
    } catch {
      // Local fallback save with true GPS & bounding box coordinates
      saveLocalReport({
        id: `LOC-${Date.now()}`,
        display_id: `RPT-${Date.now().toString().slice(-4)}`,
        latitude: lat,
        longitude: lng,
        address: resolvedAddress,
        original_image_url: finalImageToSave,
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

      if (mountedRef.current) {
        setResult({
          status: detectedBoxes.length > 0 ? "success" : "no_waste_detected",
          detected_items_count: detectedBoxes.length,
          image_url: finalImageToSave,
          message:
            detectedBoxes.length > 0
              ? `Berhasil mencatat ${detectedBoxes.length} sampah.`
              : "Tidak ada sampah terdeteksi.",
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const reset = () => {
    stopCameraStream();
    setImageUri(null);
    setDetectedBoxes([]);
    setHasScanned(false);
    setResult(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.pageHeader}>
          <Text style={styles.kicker}>Laporan & Pemindaian AI</Text>
          <Text style={styles.pageTitle}>Photo Waste Report & Analyzer</Text>
          <Text style={styles.pageSubtitle}>
            Ambil foto sampah untuk dianalisis jenisnya secara otomatis oleh AI dan dipetakan lokasinya.
          </Text>
        </View>

        {/* High Accuracy GPS Status Card */}
        <View style={[styles.gpsCard, !gpsLocation && styles.gpsCardWarning]}>
          <View style={styles.gpsRow}>
            <Ionicons
              name={gpsLocation ? "navigate-circle" : "alert-circle"}
              size={26}
              color={gpsLocation ? "#059669" : "#DC2626"}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.gpsLabel, !gpsLocation && { color: "#991B1B" }]}>
                {gpsLocation ? "🟢 GPS Terkunci (Presisi)" : "🔴 GPS Belum Terhubung"}
              </Text>
              <Text style={[styles.gpsCoords, !gpsLocation && { color: "#DC2626", fontWeight: "600" }]}>
                {fetchingGps
                  ? "Sedang mencari sinyal satelit GPS..."
                  : gpsLocation
                  ? `Lat: ${gpsLocation.lat}, Long: ${gpsLocation.lng} (${gpsLocation.source || "Presisi"})`
                  : gpsError || "Koordinat lokasi presisi belum terkunci."}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.gpsActionBtn, !gpsLocation && styles.gpsActionBtnWarn]}
              onPress={() => activateHighAccuracyGps(true)}
              disabled={fetchingGps}
              activeOpacity={0.8}
            >
              {fetchingGps ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="locate" size={16} color="#FFF" />
                  <Text style={styles.gpsActionBtnText}>
                    {gpsLocation ? "Kunci Ulang" : "Aktifkan GPS"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Editable Custom Location/Address */}
          <View style={styles.addressInputWrapper}>
            <Text style={styles.addressInputLabel}>Keterangan / Patokan Lokasi Tambahan:</Text>
            <TextInput
              style={styles.addressTextInput}
              placeholder="Contoh: Depan Kantin Gedung B, Taman Kampus"
              placeholderTextColor="#9CA3AF"
              value={customAddress}
              onChangeText={setCustomAddress}
            />
          </View>
        </View>

        {/* Photo Viewfinder / Preview Container */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewLabel}>
              {isCameraActive ? "Kamera Aktif (Bidik Sampah)" : "Pratinjau Foto & Deteksi AI"}
            </Text>
            {analyzingImage ? (
              <View style={styles.analyzingBadge}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.analyzingText}>AI Sedang Memindai Objek...</Text>
              </View>
            ) : hasScanned ? (
              <View style={[styles.analyzingBadge, { backgroundColor: detectedBoxes.length > 0 ? "#ECFDF5" : "#F3F4F6" }]}>
                <Ionicons
                  name={detectedBoxes.length > 0 ? "checkmark-circle" : "information-circle"}
                  size={14}
                  color={detectedBoxes.length > 0 ? "#059669" : "#6B7280"}
                />
                <Text style={[styles.analyzingText, { color: detectedBoxes.length > 0 ? "#059669" : "#6B7280" }]}>
                  {detectedBoxes.length > 0 ? `${detectedBoxes.length} Sampah Terdeteksi` : "Area Bersih"}
                </Text>
              </View>
            ) : null}
          </View>

          {isCameraActive ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 380,
                backgroundColor: "#0B0F19",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
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
                  backgroundColor: "#000",
                }}
              />

              {/* Shutter Overlay Controls */}
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 0,
                  right: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  zIndex: 20,
                }}
              >
                <button
                  type="button"
                  onClick={stopCameraStream}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.65)",
                    color: "#FFF",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  style={{
                    backgroundColor: "#10B981",
                    color: "#FFF",
                    border: "4px solid rgba(255,255,255,0.85)",
                    width: "62px",
                    height: "62px",
                    borderRadius: "31px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
                  }}
                >
                  <Ionicons name="camera" size={28} color="#FFF" />
                </button>
              </div>
            </div>
          ) : imageUri ? (
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: "300px",
                maxHeight: "420px",
                backgroundColor: "#0B0F19",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={imageUri}
                alt="Waste Preview"
                style={{
                  width: "100%",
                  maxHeight: "420px",
                  objectFit: "contain",
                  display: "block",
                }}
              />

              {/* Bounding Boxes on Captured/Uploaded Photo */}
              {detectedBoxes.map((box) => (
                <div
                  key={box.id}
                  style={{
                    position: "absolute",
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    border: `3px solid ${box.color}`,
                    borderRadius: "6px",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    boxSizing: "border-box",
                    pointerEvents: "none",
                    boxShadow: `0 0 10px ${box.color}66`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "-2px",
                      top: box.y < 8 ? "4px" : "-26px",
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
            <View style={styles.placeholder}>
              <Ionicons
                name="image-outline"
                size={56}
                color={colors.textMuted}
              />
              <Text style={styles.placeholderText}>Belum Ada Foto Dipilih</Text>
              <Text style={styles.placeholderHint}>
                Jepret foto lewat kamera atau pilih dari galeri untuk analisis AI instan
              </Text>
            </View>
          )}
        </View>

        {/* Detailed AI Scan Analysis Breakdown & Disposal Guide */}
        {detectedBoxes.length > 0 && (
          <FadeInView style={styles.aiBreakdownCard}>
            <View style={styles.aiBreakdownHeader}>
              <Ionicons name="scan-circle" size={22} color="#059669" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.aiBreakdownTitle}>
                  Hasil Analisis AI & Panduan Pengolahan ({detectedBoxes.length} Benda)
                </Text>
                <Text style={styles.aiBreakdownSubtitle}>
                  Informasi detail jenis sampah, tingkat keyakinan AI, dan panduan pemilahan:
                </Text>
              </View>
            </View>

            <View style={styles.wasteCardsList}>
              {detectedBoxes.map((box, idx) => {
                const guide = getWasteGuide(box.category, box.label);
                return (
                  <View key={box.id || idx} style={styles.wasteItemCard}>
                    <View style={styles.wasteItemTop}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={[styles.itemColorDot, { backgroundColor: box.color }]} />
                        <Text style={styles.wasteItemName}>{box.label}</Text>
                      </View>
                      <View style={styles.confBadge}>
                        <Ionicons name="sparkles" size={11} color="#059669" />
                        <Text style={styles.confBadgeText}>{box.confidence}% Akurat</Text>
                      </View>
                    </View>

                    <View style={styles.wasteItemMetaRow}>
                      <View style={[styles.tagPill, { backgroundColor: guide.tagBg }]}>
                        <Text style={[styles.tagPillText, { color: guide.tagColor }]}>
                          {guide.tag}
                        </Text>
                      </View>
                      <View style={[styles.binPill, { borderColor: guide.binColor }]}>
                        <Ionicons name="trash" size={12} color={guide.binColor} />
                        <Text style={[styles.binPillText, { color: guide.binColor }]}>
                          {guide.bin}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tipBox}>
                      <Ionicons name="information-circle-outline" size={14} color="#4B5563" />
                      <Text style={styles.tipText}>{guide.tip}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </FadeInView>
        )}

        {/* If scanned but clean area */}
        {hasScanned && detectedBoxes.length === 0 && (
          <FadeInView style={styles.cleanAreaCard}>
            <Ionicons name="checkmark-circle" size={28} color="#059669" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cleanAreaTitle}>Area Bersih / Tidak Terdeteksi Sampah</Text>
              <Text style={styles.cleanAreaText}>
                AI tidak menemukan objek sampah pada foto ini. Tetap jaga kebersihan lingkungan!
              </Text>
            </View>
          </FadeInView>
        )}

        {/* Photo Selection Buttons */}
        <Text style={styles.sectionLabel}>Ambil / Pilih Foto</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.button}
            onPress={openCameraViewfinder}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Kamera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={20} color={colors.primary} />
            <Text style={styles.buttonTextSecondary}>Galeri</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Action Button */}
        {imageUri && !result && (
          <TouchableOpacity
            style={[styles.submitActionBtn, loading && { opacity: 0.7 }]}
            onPress={submitReport}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.submitActionBtnText}>
              {loading ? "Menyimpan Laporan..." : "Kirim Laporan Sampah"}
            </Text>
          </TouchableOpacity>
        )}

        {result && (
          <FadeInView style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={
                  result.status === "success"
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={24}
                color={
                  result.status === "success" ? colors.primary : colors.danger
                }
              />
              <Text
                style={[
                  styles.resultStatus,
                  {
                    color:
                      result.status === "success"
                        ? colors.primary
                        : colors.danger,
                  },
                ]}
              >
                {result.status === "success"
                  ? "Laporan Berhasil Dicatat!"
                  : "Tidak Ada Sampah Terdeteksi"}
              </Text>
            </View>

            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultKey}>Total Sampah Terhitung:</Text>
                <Text style={styles.resultVal}>
                  {result.detected_items_count ?? detectedBoxes.length} Benda
                </Text>
              </View>
              {gpsLocation && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultKey}>Titik Koordinat GPS:</Text>
                  <Text style={styles.resultVal}>
                    {gpsLocation.lat}, {gpsLocation.lng} ({gpsLocation.source})
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.resetActionBtn}
              onPress={reset}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.resetActionBtnText}>Kirim Laporan Lainnya</Text>
            </TouchableOpacity>
          </FadeInView>
        )}

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
                    Diperlukan untuk mencatat lokasi titik sampah
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowGpsModal(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.guideStepTitle}>📌 Cara Mengaktifkan Izin Lokasi di Browser:</Text>

                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                  <Text style={styles.stepText}>
                    Lihat ke <Text style={{ fontWeight: "700" }}>Address Bar</Text> di bagian atas browser Anda (di sebelah tulisan <Text style={{ fontWeight: "700" }}>localhost:3000</Text>).
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                  <Text style={styles.stepText}>
                    Klik ikon <Text style={{ fontWeight: "700" }}>Setelan / Gembok / Slider (Settings icon)</Text> di samping URL.
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                  <Text style={styles.stepText}>
                    Pada menu <Text style={{ fontWeight: "700" }}>Location / Lokasi</Text>, ubah dari <Text style={{ color: "#DC2626", fontWeight: "700" }}>Blocked</Text> menjadi <Text style={{ color: "#059669", fontWeight: "700" }}>Allow / Izinkan</Text>.
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => activateHighAccuracyGps(true)}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  pageHeader: {
    marginBottom: spacing.md,
  },
  kicker: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  gpsCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    ...shadow.card,
  },
  gpsCardWarning: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gpsLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },
  gpsCoords: {
    fontSize: 13,
    fontWeight: "700",
    color: "#047857",
    marginTop: 2,
  },
  gpsActionBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  gpsActionBtnWarn: {
    backgroundColor: "#DC2626",
  },
  gpsActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addressInputWrapper: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
  },
  addressInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  addressTextInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadow.card,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  analyzingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "#ECFDF5",
  },
  analyzingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  placeholder: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontWeight: "600",
  },
  placeholderHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  aiBreakdownCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  aiBreakdownHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aiBreakdownTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  aiBreakdownSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  wasteCardsList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  wasteItemCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  wasteItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  wasteItemName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111827",
  },
  confBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  wasteItemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 6,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  binPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  binPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: 4,
  },
  tipText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: "#4B5563",
    flex: 1,
  },
  cleanAreaCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  cleanAreaTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#065F46",
  },
  cleanAreaText: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    ...shadow.card,
  },
  buttonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: "700",
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadow.card,
  },
  buttonTextSecondary: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
  submitActionBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    ...shadow.card,
  },
  submitActionBtnText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: "700",
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: "700",
  },
  resultDetails: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  resultKey: {
    fontSize: 13,
    color: colors.textMuted,
  },
  resultVal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  resetActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.sm,
  },
  resetActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
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
