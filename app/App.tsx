import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";

import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { colors } from "./src/theme";

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...FontAwesome.font,
  });

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar
          style="light"
          backgroundColor={colors.primary}
          translucent={false}
        />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
