import { useEffect } from "react";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { ladeAlarme, syncAlarme } from "../lib/alarme";

// Pushes auch anzeigen, wenn die App gerade offen ist
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  // Alarme beim Start still ans Backend spiegeln (stellt sie nach Server-Neustart wieder her)
  useEffect(() => {
    ladeAlarme().then((alarme) => {
      if (alarme.length) syncAlarme(alarme).catch(() => {});
    });
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#030712" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#030712" },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: "Seen" }} />
        <Stack.Screen name="alarme" options={{ title: "Temperatur-Alarme" }} />
        <Stack.Screen name="impressum" options={{ title: "Impressum & Datenschutz" }} />
      </Stack>
    </ThemeProvider>
  );
}
