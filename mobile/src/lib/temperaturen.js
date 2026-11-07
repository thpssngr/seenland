import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { API_URL } from "./config";

// Lädt /alle beim Start und jedes Mal, wenn die App wieder in den Vordergrund kommt.
export function useTemperaturen() {
  const [data, setData] = useState({});
  const [fehler, setFehler] = useState(false);

  const laden = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/alle`);
      setData(await res.json());
      setFehler(false);
    } catch (err) {
      console.error("Fehler beim Abrufen der API:", err);
      setFehler(true);
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
