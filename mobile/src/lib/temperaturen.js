import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { API_URL } from "./config";

// Lädt /alle beim Start und jedes Mal, wenn die App wieder in den Vordergrund kommt.
export function useTemperaturen() {
  const [data, setData] = useState({});
  const [fehler, setFehler] = useState(null);

  const laden = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/alle`);
      if (!res.ok) throw new Error(`Server-Fehler (${res.status})`);
      const json = await res.json();
      setData(json);
      // Server erreichbar, aber keine Messwerte (z. B. Quelle nicht erreichbar)
      setFehler(
        Object.values(json).some((e) => e?.temperatur) ? null : "Keine Messwerte vom Server"
      );
    } catch (err) {
      console.error("Fehler beim Abrufen der API:", err);
      setFehler(`Server nicht erreichbar (${err.message})`);
    }
  }, []);

  useEffect(() => {
    laden();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") laden();
    });
    return () => sub.remove();
  }, [laden]);

  return { data, fehler };
}
