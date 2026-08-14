import { Platform } from "react-native";
import api from "./api";
import { Report } from "../types/report";
import type { ReportStatus } from "../types/status";

const LOCAL_STORAGE_KEY = "SMART_WASTE_LOCAL_REPORTS_V1";

type DashboardStatus = "PENDING" | "PROCESSED" | "FAILED";

interface DashboardDetectedItem {
  id: string;
  label: string;
  confidence: number;
}

interface DashboardReport {
  id: string;
  imageUrl: string;
  status: DashboardStatus;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  detectedItemsCount: number;
  createdAt: string;
  detectedItems: DashboardDetectedItem[];
}

const STATUS_MAP: Record<DashboardStatus, ReportStatus> = {
  PENDING: "PENDING",
  PROCESSED: "RESOLVED",
  FAILED: "REJECTED",
};

function toDisplayId(id: string): string {
  const lastSegment = id.split("/").pop() ?? id;
  const withoutExtension = lastSegment.replace(/\.[a-z0-9]+$/i, "");
  return withoutExtension.slice(-6).toUpperCase();
}

function toReport(raw: DashboardReport): Report {
  const detectedItems = raw.detectedItems ?? [];

  return {
    id: raw.id,
    display_id: toDisplayId(raw.id),
    latitude: raw.latitude,
    longitude: raw.longitude,
    address: raw.address,
    original_image_url: raw.imageUrl,
    garbage_detected: raw.detectedItemsCount > 0,
    garbage_count: raw.detectedItemsCount,
    highest_confidence: detectedItems.reduce(
      (max, item) => Math.max(max, item.confidence),
      0,
    ),
    status: STATUS_MAP[raw.status] ?? "PENDING",
    created_at: raw.createdAt,
    detected_items: detectedItems.map((item) => ({
      id: item.id,
      label: item.label,
      confidence: item.confidence,
    })),
  };
}

export function saveLocalReport(report: Report) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      const existing = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      const updated = [report, ...existing.filter((r: Report) => r.id !== report.id)];
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
    } catch (e) {
      console.warn("Could not save report locally:", e);
    }
  }
}

export function deleteLocalReport(reportId: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      const existing = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      const filtered = existing.filter((r: Report) => r.id !== reportId && r.display_id !== reportId);
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("Could not delete report locally:", e);
    }
  }
}

export function clearAllLocalReports() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear reports locally:", e);
    }
  }
}

export function getLocalReports(): Report[] {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      return JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }
  return [];
}

export async function getReports(userEmail: string): Promise<Report[]> {
  return getLocalReports();
}
