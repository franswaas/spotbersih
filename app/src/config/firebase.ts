import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";

// Public client identifiers for the WasteWatch Firebase project — safe to
// commit. Authentication rules are enforced by Firebase, not by secrecy here.
const firebaseConfig = {
  apiKey: "AIzaSyCq1jt0Z13Wp5BEOiisn7uPG8DlnS3Ed_Y",
  authDomain: "wastewatch-94786.firebaseapp.com",
  projectId: "wastewatch-94786",
  storageBucket: "wastewatch-94786.firebasestorage.app",
  messagingSenderId: "788363575197",
  appId: "1:788363575197:web:0e8523eb01b613e5d73974",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// getReactNativePersistence is only exported under the "react-native"
// package-exports condition, so the browser-facing types don't know it.
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence?: (storage: unknown) => unknown;
  }
).getReactNativePersistence;

export const auth =
  Platform.OS === "web" || !getReactNativePersistence
    ? firebaseAuth.getAuth(app)
    : firebaseAuth.initializeAuth(app, {
        persistence: getReactNativePersistence(
          AsyncStorage,
        ) as firebaseAuth.Persistence,
      });
