import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import ReportScreen from "../screens/ReportScreen";
import LiveScannerScreen from "../screens/LiveScannerScreen";
import ReportsScreen from "../screens/ReportsScreen";
import ReportDetailsScreen from "../screens/ReportDetailsScreen";
import { colors } from "../theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: "#064E3B" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#F0FDF4" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="LiveScanner"
          component={LiveScannerScreen}
          options={{ title: "Live AI Camera Scanner" }}
        />

        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{ title: "Photo Waste Report & Analyzer" }}
        />

        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: "My Reports History" }}
        />

        <Stack.Screen
          name="ReportDetails"
          component={ReportDetailsScreen}
          options={{ title: "Report Details" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
