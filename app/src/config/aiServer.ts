export const STORAGE_KEY_AI_URL = "SPOTBERSIH_AI_SERVER_URL";

// Default Cloudflare tunnel URL or local port 8000
const DEFAULT_LOCAL_URL = "http://127.0.0.1:8000";
// Current active Cloudflare tunnel or fallback
const DEFAULT_PUBLIC_URL = "https://absent-driving-someone-rural.trycloudflare.com";

export function getAiServerUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Check custom user-defined URL from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AI_URL);
      if (saved && saved.trim()) {
        return saved.trim().replace(/\/+$/, "");
      }
    } catch {}

    // 2. If running locally on localhost / 127.0.0.1, use local port 8000
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "") {
      return DEFAULT_LOCAL_URL;
    }
  }

  // 3. Check environment variable if configured in build
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_AI_SERVER_URL) {
    return process.env.EXPO_PUBLIC_AI_SERVER_URL.trim().replace(/\/+$/, "");
  }

  // 4. Default public HTTPS tunnel fallback for GitHub Pages
  return DEFAULT_PUBLIC_URL;
}

export function setAiServerUrl(url: string | null): void {
  if (typeof window !== "undefined") {
    try {
      if (!url || !url.trim()) {
        localStorage.removeItem(STORAGE_KEY_AI_URL);
      } else {
        localStorage.setItem(STORAGE_KEY_AI_URL, url.trim().replace(/\/+$/, ""));
      }
    } catch (e) {
      console.warn("Failed to save AI server URL to localStorage:", e);
    }
  }
}
