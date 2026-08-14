// The app talks to the deployed municipal dashboard, which owns the
// database, image storage, and ML inference. All reports created here
// show up in the dashboard; the app only ever sees the signed-in
// citizen's own reports (see /api/v1/mycomplaints).
export const BASE_URL = "https://waste-detection-nexty.vercel.app";

if (__DEV__) {
  console.log("[api] BASE_URL:", BASE_URL);
}
