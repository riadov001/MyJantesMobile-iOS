import { Stack } from "expo-router";
import React from "react";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="new-quote" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="quote-detail" options={{ headerShown: false }} />
      <Stack.Screen name="invoice-detail" options={{ headerShown: false }} />
      <Stack.Screen name="reservation-detail" options={{ headerShown: false }} />
      <Stack.Screen name="chat-detail" options={{ headerShown: false }} />
      <Stack.Screen name="chatbot" options={{ headerShown: false }} />
      <Stack.Screen name="admin-users" options={{ headerShown: false }} />
      <Stack.Screen name="admin-clients" options={{ headerShown: false }} />
    </Stack>
  );
}
