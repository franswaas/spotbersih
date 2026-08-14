import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

import api from "./api";
import { UploadResult } from "../types/detection";

type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

// Upload can take a while: the dashboard pushes the image to Cloudinary and
// runs ML inference on a HuggingFace Space that may cold-start.
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

// Vercel serverless functions reject request bodies over ~4.5MB, and phone
// photos easily exceed that — resize/compress before uploading.
const MAX_UPLOAD_WIDTH = 1280;
const UPLOAD_JPEG_QUALITY = 0.7;

async function compressImage(imageUri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: MAX_UPLOAD_WIDTH } }],
      { compress: UPLOAD_JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return imageUri;
  }
}

export async function submitReport(
  imageUri: string,
  latitude: number,
  longitude: number,
  userEmail: string,
): Promise<UploadResult> {
  const compressedUri = await compressImage(imageUri);

  const formData = new FormData();

  if (Platform.OS === "web") {
    const response = await fetch(compressedUri);
    const blob = await response.blob();
    formData.append("image", blob, "image.jpg");
  } else {
    const file: UploadFile = {
      uri: compressedUri,
      name: "image.jpg",
      type: "image/jpeg",
    };
    formData.append("image", file as never);
  }

  formData.append("latitude", latitude.toString());
  formData.append("longitude", longitude.toString());
  formData.append("userEmail", userEmail);

  // Let the runtime set the multipart Content-Type (with boundary) itself —
  // the dashboard rejects requests with a manually-set header.
  const response = await api.post("/api/v1/upload", formData, {
    timeout: UPLOAD_TIMEOUT_MS,
  });

  return response.data;
}
