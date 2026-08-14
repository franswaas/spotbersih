import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { colors } from "./src/theme";

export default function App() {
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
