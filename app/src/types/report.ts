import type { ReportStatus } from "./status";

export interface DetectedItem {
  id: string;
  label: string;
  confidence: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
}

// App-side view of a dashboard WasteReport. Image URLs are absolute
// (Cloudinary), and the dashboard's PENDING/PROCESSED/FAILED statuses are
// mapped to the app's PENDING/RESOLVED/REJECTED in reportService.
export interface Report {
  id: string;
  display_id: string;

  latitude: number | null;
  longitude: number | null;
  address: string | null;

  original_image_url: string;

  garbage_detected: boolean;
  garbage_count: number;

  highest_confidence: number;

  status: ReportStatus;

  created_at: string;

  detected_items: DetectedItem[];
}
