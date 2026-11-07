import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { API_URL } from "./config";

const ALARME_KEY = "seenland_alarme";
export const MAX_ALARME = 20;

// Die Alarme liegen lokal auf dem Gerät (Quelle der Wahrheit) und werden
// ans Backend gespiegelt. So überleben sie auch einen Datenverlust auf dem Server.
export async function ladeAlarme() {
  try {
    return JSON.parse((await AsyncStorage.getItem(ALARME_KEY)) ?? "[]");
  } catch {
    return [];
  }
}

export async function speichereAlarme(alarme) {
  await AsyncStorage.setItem(ALARME_KEY, JSON.stringify(alarme));
}

export const gleicherAlarm = (a, b) =>
  a.see === b.see && a.richtung === b.richtung && a.schwelle === b.schwelle;

async function pushToken({ fragen }) {
  if (!Device.isDevice) {
    throw new Error("Push-Benachrichtigungen funktionieren nur auf einem echten Gerät.");
  }
  if (Platform.OS === "android") {
    // Kanal muss vor der Berechtigungsabfrage existieren (Android 13+)
    await Notifications.setNotificationChannelAsync("default", {
      name: "Temperatur-Alarme",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && fragen) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== "granted") {
    throw new Error(
      "Benachrichtigungen sind nicht erlaubt. Bitte in den Einstellungen für Seenland aktivieren."
    );
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error("EAS projectId fehlt in app.json (einmalig `npx eas-cli init` ausführen).");
  }
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

// Überträgt die komplette Alarmliste ans Backend.
// fragen=true: Berechtigung bei Bedarf anfragen (nur nach Nutzeraktion).
export async function syncAlarme(alarme, { fragen = false } = {}) {
  const token = await pushToken({ fragen });
  const res = await fetch(`${API_URL}/alarme`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      alarme: alarme.map(({ see, richtung, schwelle }) => ({ see, richtung, schwelle })),
    }),
  });
  if (!res.ok) {
    throw new Error("Der Server hat die Alarme nicht angenommen.");
  }
}
