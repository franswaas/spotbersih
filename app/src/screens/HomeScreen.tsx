import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";

import FadeInView from "../components/FadeInView";
import WasteDistributionMap from "../components/WasteDistributionMap";
import { getReports, deleteReport, clearAllReports, saveReport } from "../services/reportService";
import { Report } from "../types/report";
import { radius, shadow, spacing } from "../theme";
import type { RootStackParamList } from "../navigation/types";
import { APP_LOGO, ICON_CAMERA, ICON_REPORT } from "../constants/assets";
import { getAiServerUrl, setAiServerUrl } from "../config/aiServer";

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
      tip: "Limbah Berbahaya & Beracun. Pisahkan dan serahkan ke drop point e-waste resmi.",
    };
  }
  if (category === "RECYCLABLE" || l.includes("plastik") || l.includes("botol") || l.includes("kardus") || l.includes("kaleng") || l.includes("kaca") || l.includes("kertas")) {
    return {
      bin: "Tong Kuning (Daur Ulang)",
      binColor: "#D97706",
      tag: "Dapat Didaur Ulang",
      tagBg: "#FEF3C7",
      tagColor: "#92400E",
      tip: "Bilas sisa kotoran, remas agar hemat tempat, lalu salurkan ke Bank Sampah.",
    };
  }
  if (category === "ORGANIC" || l.includes("makanan") || l.includes("daun") || l.includes("sayur") || l.includes("buah")) {
    return {
      bin: "Tong Hijau (Organik)",
      binColor: "#059669",
      tag: "Sampah Organik",
      tagBg: "#D1FAE5",
      tagColor: "#065F46",
      tip: "Dapat diolah menjadi pupuk kompos atau pakan ternak/maggot.",
    };
  }
  return {
    bin: "Tong Abu-Abu (Residu)",
    binColor: "#6B7280",
    tag: "Sampah Residu",
    tagBg: "#F3F4F6",
    tagColor: "#374151",
    tip: "Sampah non-daur ulang. Buang tertutup ke tempat sampah residu.",
  };
}

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 860;

  const [navTab, setNavTab] = useState<"dashboard" | "edukasi" | "riwayat">("dashboard");
  const [activeEduTab, setActiveEduTab] = useState<"recyclable" | "non_recyclable" | "organic" | "hazardous">("recyclable");
  const [scanMode, setScanMode] = useState<"live" | "photo">("live");

  const [reports, setReports] = useState<Report[]>([]);
  const [gpsLocation, setGpsLocation] = useState<GpsData | null>(null);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  const [previewReport, setPreviewReport] = useState<Report | null>(null);

  // Live Camera & AI Connection
  const [aiServerUrl, setAiServerUrlState] = useState(getAiServerUrl());
  const [showServerModal, setShowServerModal] = useState(false);
  const [inputAiUrl, setInputAiUrl] = useState(getAiServerUrl());
  const [testingAiConn, setTestingAiConn] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [serverOnline, setServerOnline] = useState(false);
  const [liveBoxes, setLiveBoxes] = useState<DetectedBox[]>([]);
  const [liveSubmitting, setLiveSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isDetectingRef = useRef(false);

  // Photo Analyzer & Direct Camera Capture
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [photoCamActive, setPhotoCamActive] = useState(false);
  const [photoBoxes, setPhotoBoxes] = useState<DetectedBox[]>([]);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoSubmitting, setPhotoSubmitting] = useState(false);
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);

  const loadReportsData = async () => {
    try {
      const data = await getReports("tamu.edukasi@wastemanagement.id");
      if (isMountedRef.current) setReports(data);
    } catch {}
  };

  const onLocationResolved = async (lat: number, lng: number, accuracy: number, source: string, fromUser = false) => {
    if (!isMountedRef.current) return;
    setGpsLocation({ lat, lng, accuracy, source });
    setFetchingGps(false);
    setShowGpsModal(false);

    if (fromUser) {
      Alert.alert("🟢 Lokasi Berhasil Terkunci!", `Koordinat (${lat}, ${lng}) berhasil dideteksi.`);
    }

    // Accurate street reverse geocoding via OpenStreetMap
    try {
      const geoRes = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { timeout: 4000 }
      );
      if (isMountedRef.current && geoRes.data?.display_name) {
        const addr = geoRes.data.address;
        const road = addr?.road || addr?.suburb || addr?.village || addr?.neighbourhood || "";
        const city = addr?.city || addr?.town || addr?.county || "";
        const niceAddr = [road, city].filter(Boolean).join(", ");
        if (niceAddr) setCustomAddress(niceAddr);
        else setCustomAddress(geoRes.data.display_name.split(",").slice(0, 3).join(","));
      }
    } catch {
      if (!customAddress) setCustomAddress(`Lokasi GPS (${lat}, ${lng})`);
    }
  };

  const activateGps = (fromUser = false) => {
    setFetchingGps(true);
    setGpsErrorMsg(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFetchingGps(false);
      setGpsErrorMsg("Browser Anda tidak mendukung modul geolokasi.");
      if (fromUser) {
        Alert.alert("Perangkat Tidak Mendukung", "Browser Anda tidak memiliki modul geolokasi.");
      }
      return;
    }

    let isDone = false;

    const handleSuccess = (pos: GeolocationPosition, sourceLabel: string) => {
      if (isDone) return;
      isDone = true;
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const accuracy = Math.round(pos.coords.accuracy || 10);
      setGpsErrorMsg(null);
      void onLocationResolved(lat, lng, accuracy, sourceLabel, fromUser);
    };

    // Phase 1: Fast OS / Hardware Device Geolocation (works reliably on Laptop & Mobile)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSuccess(pos, "GPS Asli Perangkat");
      },
      (err1) => {
        console.log("GPS Phase 1 note:", err1.message);
        // Phase 2: High-accuracy satellite GPS query fallback
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handleSuccess(pos, "GPS Satelit Presisi");
          },
          (err2) => {
            console.warn("GPS Phase 2 failed:", err2.message);
            if (isMountedRef.current && !isDone) {
              setFetchingGps(false);
              let msg = "Pastikan GPS di HP / Laptop Anda telah aktif dan browser diberikan izin akses.";
              if (err2.code === 1 || err1.code === 1) {
                msg = "Izin lokasi browser saat ini DIBLOKIR. Klik ikon gembok di samping alamat web URL lalu pilih 'Izinkan Lokasi'.";
              } else if (err2.code === 2 || err1.code === 2) {
                msg = "Sensor lokasi perangkat tidak terbaca. Pastikan GPS di HP menyala atau ketuk langsung titik sampah pada peta.";
              } else if (err2.code === 3 || err1.code === 3) {
                msg = "Waktu pencarian sinyal GPS habis. Coba klik tombol Kunci GPS sekali lagi.";
              }
              setGpsErrorMsg(msg);
              if (fromUser) {
                setShowGpsModal(true);
              }
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 },
    );
  };

  const handleManualCoordinateSelect = (lat: number, lng: number) => {
    void onLocationResolved(lat, lng, 5, "Titik Dipilih dari Peta", true);
  };

  const handleDeleteReport = async (reportId: string) => {
    await deleteReport(reportId);
    await loadReportsData();
    Alert.alert("✨ Titik Sampah Dibersihkan!", "Laporan telah dihapus dari sistem.");
  };

  const checkAiHealth = useCallback(async (targetUrl?: string) => {
    const url = targetUrl || aiServerUrl;
    try {
      const res = await axios.get(`${url}/health`, { timeout: 3500 });
      if (res.data?.status === "online" && isMountedRef.current) {
        setServerOnline(true);
        return true;
      }
    } catch {
      if (isMountedRef.current) setServerOnline(false);
    }
    return false;
  }, [aiServerUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadReportsData();

    // Periodic 3s fast synchronization between Laptop, Mobile (HP), and Tablets
    const syncInterval = setInterval(() => {
      void loadReportsData();
    }, 3000);

    // Initial GPS query
    activateGps(false);

    void checkAiHealth(aiServerUrl);

    if (Platform.OS === "web" && typeof document !== "undefined") {
      if (!document.getElementById("live-laser-styles")) {
        const styleTag = document.createElement("style");
        styleTag.id = "live-laser-styles";
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

    const unsubscribe = navigation.addListener("focus", () => {
      void loadReportsData();
    });

    return () => {
      isMountedRef.current = false;
      clearInterval(syncInterval);
      stopCamera();
      stopPhotoCamera();
      unsubscribe();
    };
  }, [navigation]);

  // Live Camera
  const startCamera = useCallback(async () => {
    if (Platform.OS !== "web") return;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch {
      Alert.alert("Izin Kamera", "Izinkan akses kamera di browser Anda.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    setCameraActive(false);
    setLiveBoxes([]);
  }, []);

  // Photo Mode: Direct Web Camera
  const startPhotoCamera = async () => {
    setImageUri(null);
    setPhotoBoxes([]);
    if (Platform.OS !== "web") return;
    try {
      if (photoStreamRef.current) {
        photoStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      photoStreamRef.current = stream;
      setPhotoCamActive(true);
      setTimeout(() => {
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
          photoVideoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch {
      Alert.alert("Izin Kamera", "Izinkan akses kamera di browser Anda.");
    }
  };

  const stopPhotoCamera = () => {
    if (photoStreamRef.current) {
      photoStreamRef.current.getTracks().forEach((t) => t.stop());
      photoStreamRef.current = null;
    }
    if (photoVideoRef.current) photoVideoRef.current.srcObject = null;
    setPhotoCamActive(false);
  };

  const snapPhotoFromCamera = () => {
    const video = photoVideoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      stopPhotoCamera();
      setImageUri(dataUrl);
      void runPhotoAi(dataUrl);
    }
  };

  useEffect(() => {
    if (!cameraActive || !scanning) {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      return;
    }

    scanTimerRef.current = setInterval(async () => {
      if (isDetectingRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState !== 4) return;

      isDetectingRef.current = true;
      try {
        const offscreen = document.createElement("canvas");
        offscreen.width = 480;
        offscreen.height = 270;
        const ctx = offscreen.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, 480, 270);
          const base64 = offscreen.toDataURL("image/jpeg", 0.50);
          const res = await axios.post(`${aiServerUrl}/detect`, { image: base64, confidence: 0.18 }, { timeout: 1500 });
          if (isMountedRef.current && res.data?.detections) {
            setLiveBoxes(res.data.detections);
          }
        }
      } catch {
      } finally {
        isDetectingRef.current = false;
      }
    }, 200);

    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [cameraActive, scanning]);

  const captureLiveReport = async () => {
    if (!gpsLocation) {
      setShowGpsModal(true);
      Alert.alert(
        "📍 GPS Belum Aktif",
        "Untuk memastikan akurasi data lapangan, sistem memerlukan GPS asli perangkat Anda. Silakan klik 'Kunci GPS Asli' atau ketuk titik sampah pada peta."
      );
      return;
    }

    if (liveBoxes.length === 0) {
      Alert.alert("⚠️ Sampah Belum Terdeteksi", "Arahkan kamera ke objek sampah hingga kotak penanda AI muncul sebelum mengirim laporan.");
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    setLiveSubmitting(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      liveBoxes.forEach((box) => {
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
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    const lat = gpsLocation.lat;
    const lng = gpsLocation.lng;
    const resolvedAddress = customAddress.trim() || `Live Scan (${lat}, ${lng})`;

    await saveReport({
      id: `LOC-${Date.now()}`,
      display_id: `LIVE-${Date.now().toString().slice(-4)}`,
      latitude: lat,
      longitude: lng,
      address: resolvedAddress,
      original_image_url: dataUrl,
      garbage_detected: true,
      garbage_count: liveBoxes.length,
      highest_confidence: Math.max(...liveBoxes.map((b) => b.confidence / 100)),
      status: "RESOLVED",
      created_at: new Date().toISOString(),
      detected_items: liveBoxes.map((b) => ({
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

    await loadReportsData();
    setLiveSubmitting(false);
    Alert.alert("🎉 Laporan Berhasil Dikirim!", `${liveBoxes.length} sampah berhasil dipetakan ke sistem.`);
  };

  // Photo Mode: Gallery Picker
  const pickGalleryPhoto = async () => {
    stopPhotoCamera();
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!res.canceled && res.assets[0]?.uri) {
        const uri = res.assets[0].uri;
        setImageUri(uri);
        void runPhotoAi(uri);
      }
    } catch {
      Alert.alert("Galeri", "Gagal membuka galeri foto.");
    }
  };

  const runPhotoAi = async (uri: string) => {
    setAnalyzingPhoto(true);
    setPhotoBoxes([]);
    try {
      let base64Data = "";
      if (uri.startsWith("data:image/")) {
        base64Data = uri;
      } else if (Platform.OS === "web" && uri.startsWith("blob:")) {
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
      const res = await axios.post(`${aiServerUrl}/detect`, { image: base64Data, confidence: 0.12 }, { timeout: 10000 });
      if (isMountedRef.current && res.data?.detections) {
        setPhotoBoxes(res.data.detections);
      }
    } catch (e) {
      console.warn("runPhotoAi error:", e);
    } finally {
      if (isMountedRef.current) setAnalyzingPhoto(false);
    }
  };

  const submitPhotoReport = async () => {
    if (!gpsLocation) {
      setShowGpsModal(true);
      Alert.alert(
        "📍 GPS Belum Aktif",
        "Untuk memastikan akurasi data lapangan, sistem memerlukan GPS asli perangkat Anda. Silakan klik 'Kunci GPS Asli' atau ketuk titik sampah pada peta."
      );
      return;
    }

    if (photoBoxes.length === 0) {
      Alert.alert("⚠️ Tidak Ada Sampah Terdeteksi", "AI tidak mendeteksi sampah pada foto ini. Gunakan foto dengan sampah yang jelas sebelum mengirim laporan.");
      return;
    }
    if (!imageUri) return;
    setPhotoSubmitting(true);

    let finalImg = imageUri;
    if (Platform.OS === "web" && photoBoxes.length > 0) {
      try {
        const imgEl = new (window as any).Image();
        imgEl.src = imageUri;
        await new Promise((r) => { if (imgEl.complete) r(true); else imgEl.onload = () => r(true); });
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.naturalWidth || 1280;
        canvas.height = imgEl.naturalHeight || 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
          photoBoxes.forEach((box) => {
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
          finalImg = canvas.toDataURL("image/jpeg", 0.88);
        }
      } catch {}
    }

    const lat = gpsLocation.lat;
    const lng = gpsLocation.lng;
    const resolvedAddress = customAddress.trim() || `Foto Sampah (${lat}, ${lng})`;

    await saveReport({
      id: `LOC-${Date.now()}`,
      display_id: `RPT-${Date.now().toString().slice(-4)}`,
      latitude: lat,
      longitude: lng,
      address: resolvedAddress,
      original_image_url: finalImg,
      garbage_detected: true,
      garbage_count: photoBoxes.length,
      highest_confidence: Math.max(...photoBoxes.map((b) => b.confidence / 100)),
      status: "RESOLVED",
      created_at: new Date().toISOString(),
      detected_items: photoBoxes.map((b) => ({
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

    await loadReportsData();
    setPhotoSubmitting(false);
    setImageUri(null);
    setPhotoBoxes([]);
    Alert.alert("🎉 Laporan Berhasil Dikirim!", `${photoBoxes.length} sampah berhasil dipetakan.`);
  };

  const activeBoxes = scanMode === "live" ? liveBoxes : photoBoxes;

  const renderDashboardContent = () => (
    <>
      {/* Scanner & AI Zone */}
      <View style={[styles.leftCol, isMobile && { width: "100%", flex: undefined }]}>
        <View style={styles.paneCard}>
          {/* Scanner Mode Toggle & AI Status */}
          <View style={styles.scannerHeader}>
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, scanMode === "live" && styles.modeTabActive]}
                onPress={() => {
                  setScanMode("live");
                  stopPhotoCamera();
                  if (!cameraActive) void startCamera();
                }}
              >
                <Image
                  source={{ uri: ICON_CAMERA }}
                  style={{ width: 14, height: 14 }}
                  resizeMode="contain"
                />
                <Text style={[styles.modeTabText, scanMode === "live" && styles.modeTabTextActive]}>
                  Live Cam AI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, scanMode === "photo" && styles.modeTabActive]}
                onPress={() => {
                  setScanMode("photo");
                  stopCamera();
                }}
              >
                <Image
                  source={{ uri: ICON_CAMERA }}
                  style={{ width: 14, height: 14 }}
                  resizeMode="contain"
                />
                <Text style={[styles.modeTabText, scanMode === "photo" && styles.modeTabTextActive]}>
                  Jepret / Unggah Foto
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.aiStatusPill}
              onPress={() => {
                setInputAiUrl(aiServerUrl);
                setShowServerModal(true);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.aiStatusDot, { backgroundColor: serverOnline ? "#10B981" : "#F59E0B" }]} />
              <Text style={styles.aiStatusText}>{serverOnline ? "AI Aktif" : "AI Offline"}</Text>
              <Ionicons name="settings-sharp" size={11} color="#065F46" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {/* Viewfinder Display Box */}
          <View style={[styles.viewfinderBox, isMobile && { height: 250 }]}>
            {scanMode === "live" ? (
              <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <video
                  ref={videoRef as never}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraActive ? "block" : "none" }}
                />

                {!cameraActive && (
                  <div style={{ textAlign: "center", color: "#9CA3AF" }}>
                    <Image
                      source={{ uri: ICON_CAMERA }}
                      style={{ width: 44, height: 44, opacity: 0.7, alignSelf: "center" }}
                      resizeMode="contain"
                    />
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: "600" }}>Kamera Belum Aktif</div>
                  </div>
                )}

                {/* Live Laser Scanning Line */}
                {cameraActive && scanning && (
                  <div
                    style={{
                      position: "absolute",
                      left: "2%",
                      right: "2%",
                      height: "3px",
                      backgroundColor: "#10B981",
                      boxShadow: "0 0 16px #10B981, 0 0 32px #10B981",
                      borderRadius: "2px",
                      zIndex: 15,
                      pointerEvents: "none",
                      animation: "liveScanLaser 2.6s ease-in-out infinite",
                    }}
                  />
                )}

                {/* Live Bounding Boxes */}
                {cameraActive &&
                  liveBoxes.map((box) => (
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
                        pointerEvents: "none",
                        boxSizing: "border-box",
                        boxShadow: `0 0 10px ${box.color}66`,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "-2px",
                          top: box.y < 8 ? "4px" : "-24px",
                          backgroundColor: box.color,
                          color: "#FFFFFF",
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          whiteSpace: "nowrap",
                          zIndex: 20,
                        }}
                      >
                        {box.label} [{box.confidence}%]
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* Photo Direct Camera Viewfinder */}
                {photoCamActive && (
                  <video
                    ref={photoVideoRef as never}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                )}

                {/* Static Photo View with Bounding Boxes */}
                {!photoCamActive && imageUri && (
                  <>
                    <img src={imageUri} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {photoBoxes.map((box) => (
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
                          pointerEvents: "none",
                          boxSizing: "border-box",
                          boxShadow: `0 0 10px ${box.color}66`,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: "-2px",
                            top: box.y < 8 ? "4px" : "-24px",
                            backgroundColor: box.color,
                            color: "#FFFFFF",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                            zIndex: 20,
                          }}
                        >
                          {box.label} [{box.confidence}%]
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Blank Placeholder */}
                {!photoCamActive && !imageUri && (
                  <div style={{ textAlign: "center", color: "#9CA3AF" }}>
                    <Image
                      source={{ uri: ICON_CAMERA }}
                      style={{ width: 44, height: 44, opacity: 0.7, alignSelf: "center" }}
                      resizeMode="contain"
                    />
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: "600" }}>Buka Kamera atau Pilih Foto</div>
                  </div>
                )}
              </div>
            )}
          </View>

          {/* Precision Centered Action Toolbar */}
          <View style={styles.actionToolbar}>
            {scanMode === "live" ? (
              <>
                <TouchableOpacity
                  style={[styles.toolBtn, cameraActive ? styles.toolBtnDanger : styles.toolBtnPrimary]}
                  onPress={cameraActive ? stopCamera : startCamera}
                >
                  <Ionicons name={cameraActive ? "stop" : "play"} size={15} color="#FFF" />
                  <Text style={styles.toolBtnText}>{cameraActive ? "Stop" : "Buka Kamera"}</Text>
                </TouchableOpacity>

                {cameraActive && (
                  <TouchableOpacity
                    style={styles.toolBtnSecondary}
                    onPress={() => setScanning((p) => !p)}
                  >
                    <Ionicons name={scanning ? "pause" : "scan"} size={15} color="#065F46" />
                    <Text style={styles.toolBtnTextSec}>{scanning ? "Pause AI" : "Resume AI"}</Text>
                  </TouchableOpacity>
                )}

                {cameraActive && (
                  <TouchableOpacity
                    style={[
                      styles.toolBtnPrimary,
                      liveBoxes.length === 0 && styles.toolBtnDisabled,
                      liveSubmitting && { opacity: 0.7 },
                    ]}
                    onPress={captureLiveReport}
                    disabled={liveSubmitting || liveBoxes.length === 0}
                  >
                    {liveSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Image
                        source={{ uri: ICON_REPORT }}
                        style={{ width: 15, height: 15 }}
                        resizeMode="contain"
                      />
                    )}
                    <Text style={styles.toolBtnText}>
                      {liveBoxes.length > 0 ? `Laporkan (${liveBoxes.length} Sampah)` : "Menunggu Objek..."}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {/* Photo Mode: Live Camera Capture vs Gallery */}
                {photoCamActive ? (
                  <>
                    <TouchableOpacity style={styles.toolBtnPrimary} onPress={snapPhotoFromCamera}>
                      <Image
                        source={{ uri: ICON_CAMERA }}
                        style={{ width: 15, height: 15 }}
                        resizeMode="contain"
                      />
                      <Text style={styles.toolBtnText}>Jepret Foto Sekarang</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.toolBtnDanger} onPress={stopPhotoCamera}>
                      <Ionicons name="close" size={15} color="#FFF" />
                      <Text style={styles.toolBtnText}>Batal</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.toolBtnSecondary} onPress={startPhotoCamera}>
                      <Image
                        source={{ uri: ICON_CAMERA }}
                        style={{ width: 14, height: 14 }}
                        resizeMode="contain"
                      />
                      <Text style={styles.toolBtnTextSec}>Buka Kamera Jepret</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.toolBtnSecondary} onPress={pickGalleryPhoto}>
                      <Ionicons name="images" size={15} color="#065F46" />
                      <Text style={styles.toolBtnTextSec}>Pilih Galeri</Text>
                    </TouchableOpacity>

                    {imageUri && (
                      <TouchableOpacity
                        style={[
                          styles.toolBtnPrimary,
                          photoBoxes.length === 0 && styles.toolBtnDisabled,
                          photoSubmitting && { opacity: 0.7 },
                        ]}
                        onPress={submitPhotoReport}
                        disabled={photoSubmitting || photoBoxes.length === 0}
                      >
                        {photoSubmitting ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Image
                            source={{ uri: ICON_REPORT }}
                            style={{ width: 15, height: 15 }}
                            resizeMode="contain"
                          />
                        )}
                        <Text style={styles.toolBtnText}>
                          {photoBoxes.length > 0 ? `Kirim (${photoBoxes.length} Sampah)` : "Sampah Tak Ditemukan"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}
          </View>

          {/* Location Landmark Text Input */}
          <View style={styles.landmarkWrap}>
            <TextInput
              style={styles.landmarkInput}
              placeholder="Patokan lokasi (cth: Depan Kantin Gedung B, Lapangan)"
              placeholderTextColor="#9CA3AF"
              value={customAddress}
              onChangeText={setCustomAddress}
            />
          </View>

          {/* AI Instant Waste Classification & Disposal Guide */}
          {activeBoxes.length > 0 ? (
            <View style={styles.classificationCard}>
              <View style={styles.classHeader}>
                <Ionicons name="sparkles" size={14} color="#059669" />
                <Text style={styles.classTitle}>
                  Terdeteksi ({activeBoxes.length} Sampah):
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                {activeBoxes.map((box, i) => {
                  const guide = getWasteGuide(box.category, box.label);
                  return (
                    <View key={i} style={styles.boxResultRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <View style={[styles.miniDot, { backgroundColor: box.color }]} />
                          <Text style={styles.boxName}>{box.label}</Text>
                          <Text style={styles.boxConf}>({box.confidence}%)</Text>
                        </View>
                        <Text style={styles.boxTip} numberOfLines={1}>{guide.tip}</Text>
                      </View>

                      <View style={[styles.binMiniBadge, { borderColor: guide.binColor }]}>
                        <Text style={[styles.binMiniText, { color: guide.binColor }]}>{guide.bin}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.cleanGuideCard}>
              <Ionicons name="information-circle-outline" size={16} color="#059669" />
              <Text style={styles.cleanGuideText}>
                Arahkan kamera ke sampah. Tombol laporan akan otomatis aktif setelah objek sampah terdeteksi oleh AI.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Map & Active Community Reports Zone */}
      <View style={[styles.rightCol, isMobile && { width: "100%", flex: undefined, marginTop: 10 }]}>
        <View style={styles.paneCardRight}>
          <WasteDistributionMap
            reports={reports}
            height={isMobile ? 260 : 420}
            userLocation={gpsLocation}
            onCoordinateSelect={handleManualCoordinateSelect}
            onSelectReport={(selected) => setPreviewReport(selected)}
            title="🗺️ Peta Sebaran Sampah Warga"
            subtitle="Pantau titik laporan secara real-time & bersihkan bersama."
          />

          {/* Active Reports List & Quick Clean Action */}
          <View style={styles.communityActionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="people" size={16} color="#065F46" />
              <Text style={styles.commActionTitle}>Laporan Sekitar ({reports.length})</Text>
            </View>
            <Text style={styles.commActionSub}>Klik foto untuk perbesar / bersihkan:</Text>
          </View>

          <ScrollView style={styles.activeReportsScroll} showsVerticalScrollIndicator={true}>
            {reports.length === 0 ? (
              <View style={styles.emptyReportsBox}>
                <Ionicons name="checkmark-circle-outline" size={38} color="#10B981" />
                <Text style={styles.emptyReportsTitle}>Semua Lokasi Bersih!</Text>
                <Text style={styles.emptyReportsDesc}>
                  Tidak ada titik sampah aktif. Lingkungan saat ini bersih dan asri.
                </Text>
              </View>
            ) : (
              reports.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reportRowCard}
                  activeOpacity={0.85}
                  onPress={() => setPreviewReport(item)}
                >
                  <View style={styles.reportThumbWrap}>
                    <Image source={{ uri: item.original_image_url }} style={styles.reportThumb} resizeMode="cover" />
                    <View style={styles.thumbZoomIcon}>
                      <Ionicons name="scan-outline" size={12} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.reportInfo}>
                    <View style={styles.reportIdRow}>
                      <Text style={styles.reportIdText}>#{item.display_id}</Text>
                      <View style={styles.itemCountBadge}>
                        <Text style={styles.itemCountText}>{item.garbage_count} Sampah</Text>
                      </View>
                    </View>
                    <Text style={styles.reportAddress} numberOfLines={2}>
                      📍 {item.address || `${item.latitude}, ${item.longitude}`}
                    </Text>
                  </View>

                  {/* 1-Click Cleaned Delete Button */}
                  <TouchableOpacity
                    style={styles.cleanResolvedBtn}
                    onPress={(e) => {
                      (e as any)?.stopPropagation?.();
                      handleDeleteReport(item.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={13} color="#059669" />
                    <Text style={styles.cleanResolvedBtnText}>Sudah Bersih</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </>
  );

  useEffect(() => {
    if (navTab === "dashboard") {
      if (cameraActive && streamRef.current) {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(console.error);
          }
        }, 60);
      }
      if (photoCamActive && photoStreamRef.current) {
        setTimeout(() => {
          if (photoVideoRef.current) {
            photoVideoRef.current.srcObject = photoStreamRef.current;
            photoVideoRef.current.play().catch(console.error);
          }
        }, 60);
      }
    }
  }, [navTab, cameraActive, photoCamActive]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Top Responsive Navbar */}
      <View style={styles.navbar}>
        <View style={styles.navBrand}>
          <Image
            source={{ uri: APP_LOGO }}
            style={{ width: 32, height: 32, borderRadius: 8 }}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.navTitle}>SpotBersih</Text>
            {!isMobile && <Text style={styles.navSubtitle}>Pantau Sampah, Bersihkan Bersama</Text>}
          </View>
        </View>

        {/* GPS Live Status Indicator */}
        <View style={styles.navGpsWrap}>
          {gpsLocation ? (
            <TouchableOpacity style={styles.navGpsActive} onPress={() => activateGps(true)}>
              <View style={styles.gpsPulseDot} />
              <Text style={styles.navGpsText}>
                {isMobile ? `GPS: ${gpsLocation.lat.toFixed(3)}, ${gpsLocation.lng.toFixed(3)}` : `GPS Aktif: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}`}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.navGpsInactive} onPress={() => activateGps(true)}>
              <Ionicons name="alert-circle" size={13} color="#DC2626" />
              <Text style={styles.navGpsInactiveText}>
                {fetchingGps ? "Mencari GPS..." : isMobile ? "Aktifkan GPS" : "GPS Belum Aktif (Klik Disini)"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Top Switcher Tabs */}
        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[styles.navTabBtn, navTab === "dashboard" && styles.navTabBtnActive]}
            onPress={() => setNavTab("dashboard")}
          >
            <Ionicons name="grid" size={14} color={navTab === "dashboard" ? "#FFF" : "#065F46"} />
            {!isMobile && <Text style={[styles.navTabBtnText, navTab === "dashboard" && styles.navTabBtnTextActive]}>Dashboard</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTabBtn, navTab === "edukasi" && styles.navTabBtnActive]}
            onPress={() => setNavTab("edukasi")}
          >
            <Ionicons name="book" size={14} color={navTab === "edukasi" ? "#FFF" : "#065F46"} />
            {!isMobile && <Text style={[styles.navTabBtnText, navTab === "edukasi" && styles.navTabBtnTextActive]}>Edukasi</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTabBtn, navTab === "riwayat" && styles.navTabBtnActive]}
            onPress={() => setNavTab("riwayat")}
          >
            <Ionicons name="list" size={14} color={navTab === "riwayat" ? "#FFF" : "#065F46"} />
            <Text style={[styles.navTabBtnText, navTab === "riwayat" && styles.navTabBtnTextActive]}>
              {isMobile ? `(${reports.length})` : `Riwayat (${reports.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Responsive Body Container */}
      <View style={styles.mainContainer}>
        {/* ================= TAB 1: DASHBOARD (Persistent) ================= */}
        <View style={{ flex: 1, display: navTab === "dashboard" ? "flex" : "none" }}>
          {isMobile ? (
            <ScrollView contentContainerStyle={styles.mobileDashboardScroll}>
              {renderDashboardContent()}
            </ScrollView>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.splitGrid}>
              {renderDashboardContent()}
            </ScrollView>
          )}
        </View>

        {/* ================= TAB 2: ENSIKLOPEDIA EDUKASI ================= */}
        {navTab === "edukasi" && (
          <ScrollView contentContainerStyle={styles.eduScrollBody}>
            <View style={styles.eduHeaderBanner}>
              <Ionicons name="book-outline" size={24} color="#065F46" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.eduMainTitle}>📚 Katalog Edukasi Pemilahan Sampah</Text>
                <Text style={styles.eduMainSub}>
                  Pelajari 4 kategori sampah utama dan cara penanganan yang tepat untuk mendukung kelestarian lingkungan.
                </Text>
              </View>
            </View>

            {/* Category Tabs */}
            <View style={[styles.categoryTabs, isMobile && { flexWrap: "wrap" }]}>
              <TouchableOpacity
                style={[styles.tabButton, isMobile && { minWidth: "47%" }, activeEduTab === "recyclable" && styles.tabButtonRecyclable]}
                onPress={() => setActiveEduTab("recyclable")}
              >
                <Ionicons name="repeat" size={14} color={activeEduTab === "recyclable" ? "#FFF" : "#059669"} />
                <Text style={[styles.tabText, activeEduTab === "recyclable" && styles.tabTextActive]}>Daur Ulang (Kuning)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, isMobile && { minWidth: "47%" }, activeEduTab === "non_recyclable" && styles.tabButtonNonRecyclable]}
                onPress={() => setActiveEduTab("non_recyclable")}
              >
                <Ionicons name="trash" size={14} color={activeEduTab === "non_recyclable" ? "#FFF" : "#4B5563"} />
                <Text style={[styles.tabText, activeEduTab === "non_recyclable" && styles.tabTextActive]}>Residu (Abu-Abu)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, isMobile && { minWidth: "47%" }, activeEduTab === "organic" && styles.tabButtonOrganic]}
                onPress={() => setActiveEduTab("organic")}
              >
                <Ionicons name="leaf" size={14} color={activeEduTab === "organic" ? "#FFF" : "#047857"} />
                <Text style={[styles.tabText, activeEduTab === "organic" && styles.tabTextActive]}>Organik (Hijau)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, isMobile && { minWidth: "47%" }, activeEduTab === "hazardous" && styles.tabButtonHazardous]}
                onPress={() => setActiveEduTab("hazardous")}
              >
                <Ionicons name="warning" size={14} color={activeEduTab === "hazardous" ? "#FFF" : "#DC2626"} />
                <Text style={[styles.tabText, activeEduTab === "hazardous" && styles.tabTextActive]}>B3 (Merah)</Text>
              </TouchableOpacity>
            </View>

            {/* Active Category Content */}
            {activeEduTab === "recyclable" && (
              <FadeInView style={styles.eduContentCard}>
                <Text style={styles.eduSummary}>
                  Sampah anorganik bernilai ekonomis yang dapat dilebur kembali menjadi produk baru di Bank Sampah.
                </Text>
                <View style={styles.classChips}>
                  {["Botol Plastik", "Tutup Botol", "Gelas Plastik", "Sedotan Plastik", "Kardus & Karton", "Koran & Kertas", "Kaleng Minuman", "Botol Kaca"].map((item, idx) => (
                    <View key={idx} style={[styles.classChip, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={[styles.classChipText, { color: "#065F46" }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </FadeInView>
            )}

            {activeEduTab === "non_recyclable" && (
              <FadeInView style={styles.eduContentCard}>
                <Text style={styles.eduSummary}>
                  Sampah yang sulit didaur ulang dan harus dibuang ke tempat sampah tertutup menuju TPA.
                </Text>
                <View style={styles.classChips}>
                  {["Kantong Kresek", "Stirofoam", "Plastik Bungkus Sachet", "Kemasan Makanan", "Puntung Rokok", "Pembalut & Popok", "Kain Rusak"].map((item, idx) => (
                    <View key={idx} style={[styles.classChip, { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" }]}>
                      <Ionicons name="trash-outline" size={14} color="#4B5563" />
                      <Text style={[styles.classChipText, { color: "#374151" }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </FadeInView>
            )}

            {activeEduTab === "organic" && (
              <FadeInView style={styles.eduContentCard}>
                <Text style={styles.eduSummary}>
                  Sampah hayati yang mudah membusuk secara alami dan dapat diolah menjadi kompos atau pupuk cair.
                </Text>
                <View style={styles.classChips}>
                  {["Sisa Makanan", "Kulit Buah & Sayuran", "Daun Kering & Ranting", "Ampas Kopi & Teh", "Cangkang Telur"].map((item, idx) => (
                    <View key={idx} style={[styles.classChip, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                      <Ionicons name="leaf-outline" size={14} color="#059669" />
                      <Text style={[styles.classChipText, { color: "#065F46" }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </FadeInView>
            )}

            {activeEduTab === "hazardous" && (
              <FadeInView style={styles.eduContentCard}>
                <Text style={styles.eduSummary}>
                  Limbah berbahaya dan beracun yang memerlukan penanganan khusus drop-point resmi.
                </Text>
                <View style={styles.classChips}>
                  {["Baterai Bekas", "Masker Medis", "Elektronik Rusak / E-Waste", "Bohlam Lampu", "Kaleng Cat & Kimia"].map((item, idx) => (
                    <View key={idx} style={[styles.classChip, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                      <Ionicons name="warning-outline" size={15} color="#DC2626" />
                      <Text style={[styles.classChipText, { color: "#991B1B" }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </FadeInView>
            )}
          </ScrollView>
        )}

        {/* ================= TAB 3: RIWAYAT LENGKAP ================= */}
        {navTab === "riwayat" && (
          <ScrollView contentContainerStyle={styles.historyScrollBody}>
            <View style={styles.historyHeaderRow}>
              <View>
                <Text style={styles.historyTitle}>📋 Riwayat Laporan Sampah Warga</Text>
                <Text style={styles.historySub}>Kumpulan seluruh data laporan hasil pemindaian dan peta sebaran.</Text>
              </View>

              {reports.length > 0 && (
                <TouchableOpacity
                  style={styles.clearAllBtn}
                  onPress={async () => {
                    await clearAllReports();
                    setReports([]);
                  }}
                >
                  <Ionicons name="trash-bin" size={14} color="#EF4444" />
                  <Text style={styles.clearAllBtnText}>Bersihkan Semua</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Waste Distribution Map in Riwayat */}
            <WasteDistributionMap
              reports={reports}
              height={400}
              userLocation={gpsLocation}
              onCoordinateSelect={handleManualCoordinateSelect}
              onSelectReport={(selected) => setPreviewReport(selected)}
              title="🗺️ Peta Interaktif Sebaran Sampah Warga"
              subtitle="Pantau persebaran lokasi sampah yang telah dilaporkan warga di sekitar Anda."
            />

            <View style={{ marginTop: spacing.md }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
                Daftar Arsip Foto & Detail Laporan ({reports.length}):
              </Text>
              <View style={styles.historyGrid}>
                {reports.map((item) => (
                  <View key={item.id} style={[styles.historyCard, isMobile && { width: "100%" }]}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setPreviewReport(item)}
                      style={styles.historyImgWrap}
                    >
                      <Image source={{ uri: item.original_image_url }} style={styles.historyImg} resizeMode="cover" />
                      <View style={styles.zoomOverlayBadge}>
                        <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.zoomOverlayText}>🔍 Klik untuk Perbesar</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.historyBody}>
                      <View style={styles.historyCardTop}>
                        <Text style={styles.historyCardId}>#{item.display_id}</Text>
                        <View style={styles.historyCardChip}>
                          <Text style={styles.historyCardChipText}>{item.garbage_count} Sampah</Text>
                        </View>
                      </View>
                      <Text style={styles.historyCardAddr} numberOfLines={2}>
                        📍 {item.address || `${item.latitude}, ${item.longitude}`}
                      </Text>
                      <Text style={styles.historyCardTime}>
                        🕒 {item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "Baru saja"}
                      </Text>

                      <TouchableOpacity
                        style={styles.historyDeleteBtn}
                        onPress={() => handleDeleteReport(item.id)}
                      >
                        <Ionicons name="sparkles" size={13} color="#059669" />
                        <Text style={styles.historyDeleteBtnText}>🧹 Tandai Bersih & Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Real GPS Permission & Activation Modal */}
      <Modal visible={showGpsModal} transparent animationType="fade" onRequestClose={() => setShowGpsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: gpsLocation ? "#D1FAE5" : "#FEE2E2" }]}>
                <Ionicons name="location" size={24} color={gpsLocation ? "#059669" : "#DC2626"} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.modalTitle}>Aktifkan GPS Asli Perangkat</Text>
                <Text style={styles.modalSubtitle}>
                  {gpsLocation
                    ? `🟢 GPS Terkunci: ${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lng.toFixed(5)}`
                    : "Sistem membutuhkan koordinat GPS riil untuk akurasi lapangan."}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGpsModal(false)}><Ionicons name="close" size={20} color="#6B7280" /></TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {gpsLocation && (
                <View style={{ backgroundColor: "#ECFDF5", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 10 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#065F46" }}>
                    📍 Sumber: {gpsLocation.source || "GPS Satelit Terkunci"} (±{gpsLocation.accuracy || 10}m)
                  </Text>
                  <Text style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
                    Alamat: {customAddress || `(${gpsLocation.lat}, ${gpsLocation.lng})`}
                  </Text>
                </View>
              )}

              {fetchingGps && (
                <View style={{ backgroundColor: "#F0FDF4", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#BBF7D0", marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={{ fontSize: 11.5, color: "#166534", fontWeight: "600" }}>Sedang membaca koordinat GPS perangkat Anda...</Text>
                </View>
              )}

              {gpsErrorMsg && (
                <View style={{ backgroundColor: "#FEF2F2", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#FECACA", marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#DC2626" }}>Sinyal GPS Belum Terbaca</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#991B1B", marginTop: 3, lineHeight: 15 }}>{gpsErrorMsg}</Text>
                </View>
              )}

              <Text style={styles.modalStepTitle}>
                {isMobile ? "📱 Panduan GPS di Smartphone (HP):" : "💻 Panduan Lokasi di Laptop / PC:"}
              </Text>
              {isMobile ? (
                <>
                  <Text style={styles.modalStep}>1. Buka menu atas layar HP $\rightarrow$ Nyalakan tombol <Text style={{ fontWeight: "700" }}>Lokasi / GPS</Text>.</Text>
                  <Text style={styles.modalStep}>2. Pada browser (Chrome/Safari), klik ikon <Text style={{ fontWeight: "700" }}>Gembok / Setelan Situs</Text> di samping alamat web.</Text>
                  <Text style={styles.modalStep}>3. Pilih menu <Text style={{ fontWeight: "700" }}>Izin Lokasi</Text> $\rightarrow$ Ubah menjadi <Text style={{ color: "#059669", fontWeight: "700" }}>Izinkan / Allow</Text>.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.modalStep}>1. Klik ikon <Text style={{ fontWeight: "700" }}>Gembok / Setelan Situs</Text> di sebelah kiri alamat web URL $\rightarrow$ Izinkan Lokasi.</Text>
                  <Text style={styles.modalStep}>2. Pastikan Setelan Lokasi Windows / Mac Anda dalam keadaan aktif.</Text>
                  <Text style={styles.modalStep}>3. Atau ketuk langsung titik jalan/gedung pada peta interaktif Leaflet di sebelah kanan.</Text>
                </>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => activateGps(true)}>
                <Ionicons name="navigate" size={15} color="#FFF" />
                <Text style={styles.modalPrimaryBtnText}>{fetchingGps ? "Mencari Sinyal Satelit..." : "🎯 Kunci GPS Asli Sekarang"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowGpsModal(false)}>
                <Ionicons name="map-outline" size={15} color="#065F46" />
                <Text style={[styles.modalSecondaryBtnText, { color: "#065F46" }]}>🗺️ Tandai Manual di Peta / Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI YOLO Server Configuration Modal */}
      <Modal visible={showServerModal} transparent animationType="fade" onRequestClose={() => setShowServerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: serverOnline ? "#D1FAE5" : "#FEF3C7" }]}>
                <Ionicons name={serverOnline ? "hardware-chip" : "cloud-offline"} size={22} color={serverOnline ? "#059669" : "#D97706"} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.modalTitle}>Pengaturan Server AI YOLO</Text>
                <Text style={styles.modalSubtitle}>
                  Status: {serverOnline ? "🟢 Terhubung ke Backend" : "🔴 Terputus / Belum Terhubung"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalStepTitle}>🌐 URL Backend AI Aktif:</Text>
              <TextInput
                style={styles.serverInput}
                value={inputAiUrl}
                onChangeText={setInputAiUrl}
                placeholder="https://xxxx.trycloudflare.com atau http://127.0.0.1:8000"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={{ fontSize: 11, color: "#4B5563", marginTop: 8, lineHeight: 16 }}>
                💡 <Text style={{ fontWeight: "700" }}>Akses dari GitHub Pages / HP:</Text> Browser HTTPS memblokir HTTP biasa. Gunakan URL HTTPS Cloudflare Tunnel aktif laptop Anda.
              </Text>

              <View style={{ marginTop: 10, gap: 6 }}>
                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => setInputAiUrl("https://absent-driving-someone-rural.trycloudflare.com")}
                >
                  <Ionicons name="flash-outline" size={13} color="#059669" />
                  <Text style={styles.presetBtnText}>Gunakan Cloudflare Tunnel Aktif</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetBtn}
                  onPress={() => setInputAiUrl("http://127.0.0.1:8000")}
                >
                  <Ionicons name="laptop-outline" size={13} color="#3B82F6" />
                  <Text style={[styles.presetBtnText, { color: "#1D4ED8" }]}>Gunakan Localhost (127.0.0.1:8000)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                disabled={testingAiConn}
                onPress={async () => {
                  setTestingAiConn(true);
                  const cleaned = inputAiUrl.trim().replace(/\/+$/, "");
                  setAiServerUrl(cleaned);
                  setAiServerUrlState(cleaned);
                  const isOk = await checkAiHealth(cleaned);
                  setTestingAiConn(false);
                  if (isOk) {
                    Alert.alert("✅ Terhubung!", `Berhasil terhubung ke server AI di: ${cleaned}`);
                    setShowServerModal(false);
                  } else {
                    Alert.alert(
                      "⚠️ Tidak Dapat Terhubung",
                      `Gagal menghubungi ${cleaned}/health. Pastikan server AI dan Cloudflare Tunnel sedang berjalan di laptop Anda.`
                    );
                  }
                }}
              >
                {testingAiConn ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={15} color="#FFF" />
                    <Text style={styles.modalPrimaryBtnText}>Simpan & Tes Koneksi</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowServerModal(false)}>
                <Ionicons name="close-circle-outline" size={15} color="#6B7280" />
                <Text style={[styles.modalSecondaryBtnText, { color: "#6B7280" }]}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  navbar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadow.card,
    zIndex: 30,
  },
  navBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#065F46",
  },
  navSubtitle: {
    fontSize: 10,
    color: "#6B7280",
  },
  navGpsWrap: {
    marginHorizontal: 4,
  },
  navGpsActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  gpsPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  navGpsText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065F46",
  },
  navGpsInactive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  navGpsInactiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  navTabs: {
    flexDirection: "row",
    gap: 4,
  },
  navTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#F1F5F9",
  },
  navTabBtnActive: {
    backgroundColor: "#059669",
  },
  navTabBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  navTabBtnTextActive: {
    color: "#FFFFFF",
  },
  mainContainer: {
    flex: 1,
  },
  splitGrid: {
    flex: 1,
    flexDirection: "row",
    padding: 10,
    gap: 10,
  },
  mobileDashboardScroll: {
    padding: 8,
    gap: 8,
  },
  leftCol: {
    flex: 5.5,
  },
  rightCol: {
    flex: 6.5,
  },
  paneCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...shadow.card,
    display: "flex",
    flexDirection: "column",
  },
  paneCardRight: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...shadow.card,
    display: "flex",
    flexDirection: "column",
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modeTabs: {
    flexDirection: "row",
    gap: 5,
  },
  modeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: "#F1F5F9",
  },
  modeTabActive: {
    backgroundColor: "#059669",
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  aiStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  aiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#065F46",
  },
  viewfinderBox: {
    width: "100%",
    height: 290,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  actionToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
  },
  toolBtnPrimary: {
    backgroundColor: "#059669",
  },
  toolBtnDanger: {
    backgroundColor: "#DC2626",
  },
  toolBtnDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  toolBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
  },
  toolBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  toolBtnTextSec: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#065F46",
  },
  landmarkWrap: {
    marginTop: 6,
  },
  landmarkInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  classificationCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flex: 1,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  classTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#065F46",
  },
  boxResultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 6,
    borderRadius: radius.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  boxName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },
  boxConf: {
    fontSize: 10,
    color: "#6B7280",
  },
  boxTip: {
    fontSize: 9.5,
    color: "#6B7280",
    marginTop: 1,
  },
  binMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    backgroundColor: "#FFF",
    marginLeft: 4,
  },
  binMiniText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  cleanGuideCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: radius.sm,
    marginTop: 6,
    flex: 1,
  },
  cleanGuideText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600",
    flex: 1,
    lineHeight: 15,
  },
  communityActionHeader: {
    marginTop: 6,
    marginBottom: 4,
  },
  commActionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
  },
  commActionSub: {
    fontSize: 10.5,
    color: "#6B7280",
  },
  activeReportsScroll: {
    flex: 1,
    minHeight: 180,
    maxHeight: 480,
  },
  emptyReportsBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  emptyReportsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
    marginTop: 4,
  },
  emptyReportsDesc: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  reportRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 6,
    borderRadius: radius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reportThumbWrap: {
    position: "relative",
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  reportThumb: {
    width: "100%",
    height: "100%",
  },
  thumbZoomIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 3,
    padding: 2,
  },
  reportInfo: {
    flex: 1,
    marginLeft: 8,
  },
  reportIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reportIdText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#111827",
  },
  itemCountBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  itemCountText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#991B1B",
  },
  reportAddress: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 1,
  },
  cleanResolvedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  cleanResolvedBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#065F46",
  },
  eduScrollBody: {
    padding: spacing.sm,
    maxWidth: 850,
    width: "100%",
    alignSelf: "center",
  },
  eduHeaderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  eduMainTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065F46",
  },
  eduMainSub: {
    fontSize: 11.5,
    color: "#047857",
    marginTop: 2,
  },
  categoryTabs: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabButtonRecyclable: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  tabButtonNonRecyclable: {
    backgroundColor: "#4B5563",
    borderColor: "#4B5563",
  },
  tabButtonOrganic: {
    backgroundColor: "#047857",
    borderColor: "#047857",
  },
  tabButtonHazardous: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  eduContentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...shadow.card,
  },
  eduSummary: {
    fontSize: 12.5,
    color: "#374151",
    marginBottom: spacing.sm,
    fontWeight: "500",
  },
  classChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  classChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  classChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  historyScrollBody: {
    padding: spacing.sm,
    maxWidth: 850,
    width: "100%",
    alignSelf: "center",
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  historySub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  clearAllBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#EF4444",
  },
  historyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  historyCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...shadow.card,
  },
  historyImgWrap: {
    position: "relative",
    width: "100%",
    height: 230,
    backgroundColor: "#0F172A",
  },
  historyImg: {
    width: "100%",
    height: "100%",
  },
  zoomOverlayBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoomOverlayText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  historyBody: {
    padding: 10,
  },
  historyCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyCardId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  historyCardChip: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyCardChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#991B1B",
  },
  historyCardAddr: {
    fontSize: 11,
    color: "#4B5563",
    marginTop: 4,
    lineHeight: 15,
  },
  historyCardTime: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 3,
  },
  historyDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginTop: 8,
  },
  historyDeleteBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  lightboxCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    maxWidth: 720,
    width: "100%",
    maxHeight: "92%",
    overflow: "hidden",
    ...shadow.card,
  },
  lightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  lightboxAddress: {
    fontSize: 11.5,
    color: "#4B5563",
    marginTop: 2,
  },
  lightboxCloseBtn: {
    padding: 4,
  },
  lightboxImgContainer: {
    width: "100%",
    height: 380,
    backgroundColor: "#0B0F19",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImg: {
    width: "100%",
    height: "100%",
  },
  lightboxFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  lightboxFooterText: {
    fontSize: 10.5,
    color: "#6B7280",
    flex: 1,
  },
  lightboxDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#A7F3D0",
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
    maxWidth: 480,
    width: "100%",
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
  },
  modalBody: {
    backgroundColor: "#F9FAFB",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalStepTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 5,
  },
  modalStep: {
    fontSize: 11.5,
    color: "#4B5563",
    lineHeight: 17,
    marginBottom: 3,
  },
  modalActions: {
    gap: spacing.xs,
  },
  modalPrimaryBtn: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  modalPrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSecondaryBtn: {
    backgroundColor: "#ECFDF5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  modalSecondaryBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#065F46",
  },
  serverInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: "#111827",
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  presetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },
});
