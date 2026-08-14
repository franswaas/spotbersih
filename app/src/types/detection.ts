// Response of the dashboard's POST /api/v1/upload endpoint.
// When nothing is detected the image is discarded server-side and no
// report is created, so status tells the whole story.
export interface UploadResult {
  status: "success" | "no_waste_detected";
  image_url?: string;
  detected_items_count: number;
  message?: string;
}
