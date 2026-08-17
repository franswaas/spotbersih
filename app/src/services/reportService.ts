import { Platform } from "react-native";
import axios from "axios";
import { Report } from "../types/report";
import type { ReportStatus } from "../types/status";
import { getAiServerUrl } from "../config/aiServer";

const LOCAL_STORAGE_KEY = "SMART_WASTE_LOCAL_REPORTS_V1";

export function saveLocalReport(report: Report) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      const existing: Report[] = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      const updated = [report, ...existing.filter((r) => r.id !== report.id && r.display_id !== report.display_id)];
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
    } catch (e) {
      console.warn("Could not save report locally:", e);
    }
  }
}

export function deleteLocalReport(reportId: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      const existing: Report[] = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
      const filtered = existing.filter((r) => r.id !== reportId && r.display_id !== reportId);
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

/**
 * Synchronized Report Fetcher across Laptop, Mobile (HP), and Tablets
 * Queries the shared backend database while maintaining local offline mirror
 */
export async function getReports(userEmail?: string): Promise<Report[]> {
  const serverUrl = getAiServerUrl();
  const localReports = getLocalReports();

  try {
    const res = await axios.get(`${serverUrl}/reports?_t=${Date.now()}`, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
      timeout: 4500,
    });
    if (res.data?.status === "success" && Array.isArray(res.data?.reports)) {
      let serverReports: Report[] = res.data.reports;

      // Auto-heal: If local device has unsynced offline reports, push them to server
      const unsynced = localReports.filter(
        (l) => !serverReports.some((s) => s.id === l.id || s.display_id === l.display_id)
      );
      if (unsynced.length > 0) {
        for (const un of unsynced) {
          try {
            await axios.post(`${serverUrl}/reports`, un, { timeout: 8000 });
            serverReports = [un, ...serverReports];
          } catch {}
        }
      }

      // Authoritative update: server list is the single source of truth
      if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverReports.slice(0, 200)));
      }
      return serverReports;
    }
  } catch (e) {
    // Backend offline or unreachable, fallback to local storage
  }

  return localReports;
}

/**
 * Saves report to local storage AND synchronizes to centralized backend server
 */
export async function saveReport(report: Report): Promise<void> {
  // 1. Immediately save locally for zero-latency UI response
  saveLocalReport(report);

  // 2. Synchronize to shared backend server with generous timeout
  const serverUrl = getAiServerUrl();
  try {
    await axios.post(`${serverUrl}/reports`, report, { timeout: 12000 });
  } catch (e) {
    console.warn("Could not sync report to backend server, saved locally:", e);
  }
}

/**
 * Deletes report locally AND synchronizes deletion to backend server
 */
export async function deleteReport(reportId: string): Promise<void> {
  // 1. Delete locally
  deleteLocalReport(reportId);

  // 2. Delete on shared server
  const serverUrl = getAiServerUrl();
  try {
    await axios.post(`${serverUrl}/reports/delete`, { id: reportId, display_id: reportId }, { timeout: 4500 });
  } catch {
    try {
      await axios.delete(`${serverUrl}/reports/${encodeURIComponent(reportId)}`, { timeout: 4500 });
    } catch (e) {
      console.warn("Could not sync report deletion to backend server:", e);
    }
  }
}

/**
 * Clears all reports locally and on backend server
 */
export async function clearAllReports(): Promise<void> {
  clearAllLocalReports();
  const serverUrl = getAiServerUrl();
  try {
    await axios.post(`${serverUrl}/reports/clear`, {}, { timeout: 4500 });
  } catch (e) {
    console.warn("Could not sync clear reports to backend server:", e);
  }
}
