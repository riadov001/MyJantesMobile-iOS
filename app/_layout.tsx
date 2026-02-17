import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import { Image } from "expo-image";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: Colors.text },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="legal" options={{ presentation: "modal", headerShown: true, title: "Mentions Légales" }} />
      <Stack.Screen name="privacy" options={{ presentation: "modal", headerShown: true, title: "Politique de Confidentialité" }} />
      <Stack.Screen name="support" options={{ presentation: "formSheet", sheetAllowedDetents: [0.75], sheetGrabberVisible: true, headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Simulate a small delay for the splash screen
      const timer = setTimeout(() => {
        setAppReady(true);
        SplashScreen.hideAsync();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!appReady) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoWrapper}>
          <Image
            source={require("@/assets/images/logo_rounded.png")}
            style={styles.splashLogo}
            contentFit="cover"
          />
        </View>
        <View style={styles.versionBottom}>
          <Text style={styles.versionTextSplash}>v1.3.6</Text>
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
          <KeyboardProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: {
    width: 180,
    height: 180,
    backgroundColor: "#000000",
    borderRadius: 32,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  splashLogo: {
    width: "100%",
    height: "100%",
  },
  versionBottom: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  versionTextSplash: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    opacity: 0.6,
  },
});
