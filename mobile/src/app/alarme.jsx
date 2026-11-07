import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { formatGrad, parseTemp } from "../lib/format";
import { lakeName, lakes } from "../lib/lakes";
import { useTemperaturen } from "../lib/temperaturen";
import {
  gleicherAlarm,
  ladeAlarme,
  MAX_ALARME,
  sendeTestPush,
  speichereAlarme,
  syncAlarme,
} from "../lib/alarme";

const SCHRITT = 0.5;

const beschreibung = (a) =>
  `${a.richtung === "unter" ? "unter" : "über"} ${formatGrad(a.schwelle)}`;

const istErfuellt = (a, temp) =>
  temp != null && (a.richtung === "unter" ? temp < a.schwelle : temp > a.schwelle);

export default function Alarme() {
  const { data } = useTemperaturen();
  const [alarme, setAlarme] = useState([]);
  const params = useLocalSearchParams();
  // Aus der See-Detailansicht kommend ist der See schon vorausgewählt
  const [see, setSee] = useState(
    lakes.some((l) => l.id === params.see) ? params.see : lakes[0].id
  );
  const [richtung, setRichtung] = useState("unter");
  const [schwelle, setSchwelle] = useState(10);
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState(null);

  useEffect(() => {
    ladeAlarme().then(setAlarme);
  }, []);

  // Neue Liste ans Backend senden; nur bei Erfolg lokal übernehmen
  const uebernehmen = async (neu) => {
    setLaeuft(true);
    setMeldung(null);
    try {
      await syncAlarme(neu, { fragen: true });
      await speichereAlarme(neu);
      setAlarme(neu);
    } catch (e) {
      setMeldung({ text: e.message || "Server nicht erreichbar. Bitte später erneut versuchen." });
    } finally {
      setLaeuft(false);
    }
  };

  const hinzufuegen = () => {
    const alarm = { see, richtung, schwelle };
    if (alarme.some((a) => gleicherAlarm(a, alarm))) {
      setMeldung({ text: "Diesen Alarm gibt es schon." });
      return;
    }
    uebernehmen([...alarme, alarm]);
  };

  const testen = async () => {
    setLaeuft(true);
    setMeldung(null);
    try {
      await sendeTestPush();
      setMeldung({ ok: true, text: "Test gesendet – die Benachrichtigung sollte gleich erscheinen." });
    } catch (e) {
      setMeldung({ text: e.message || "Server nicht erreichbar." });
    } finally {
      setLaeuft(false);
    }
  };

  const entfernen = (alarm) => uebernehmen(alarme.filter((a) => !gleicherAlarm(a, alarm)));

  const aendereSchwelle = (delta) =>
    setSchwelle((s) => Math.min(40, Math.max(-5, Math.round((s + delta) * 10) / 10)));

  const tempVon = (id) => parseTemp(data[id]?.temperatur);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Lass dich benachrichtigen, sobald ein See eine bestimmte Wassertemperatur unter- oder
        überschreitet. Die Messwerte werden etwa stündlich aktualisiert.
      </Text>

      {/* Bestehende Alarme */}
      <Text style={styles.section}>Deine Alarme</Text>
      {alarme.length === 0 ? (
        <Text style={styles.muted}>Noch keine Alarme angelegt.</Text>
      ) : (
        alarme.map((a) => {
          const temp = tempVon(a.see);
          return (
            <View key={`${a.see}-${a.richtung}-${a.schwelle}`} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {lakeName(a.see)} · {beschreibung(a)}
                </Text>
                <Text style={styles.muted}>
                  Aktuell: {temp != null ? formatGrad(temp) : "–"}
                  {istErfuellt(a, temp) ? " · bereits erfüllt, meldet sich beim nächsten Mal" : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => entfernen(a)}
                disabled={laeuft}
                hitSlop={10}
                accessibilityLabel={`Alarm ${lakeName(a.see)} ${beschreibung(a)} löschen`}
              >
                <Text style={styles.delete}>✕</Text>
              </Pressable>
            </View>
          );
        })
      )}

      {/* Neuer Alarm */}
      <Text style={styles.section}>Neuer Alarm</Text>
      <View style={styles.chips}>
        {lakes.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => setSee(l.id)}
            style={[styles.chip, see === l.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, see === l.id && styles.chipTextActive]}>{l.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chips}>
        {[
          ["unter", "fällt unter"],
          ["ueber", "steigt über"],
        ].map(([wert, label]) => (
          <Pressable
            key={wert}
            onPress={() => setRichtung(wert)}
            style={[styles.chip, richtung === wert && styles.chipActive]}
          >
            <Text style={[styles.chipText, richtung === wert && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.stepper}>
        <Pressable
          onPress={() => aendereSchwelle(-SCHRITT)}
          style={styles.stepBtn}
          accessibilityLabel="Schwelle verringern"
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.schwelle}>{formatGrad(schwelle)}</Text>
        <Pressable
          onPress={() => aendereSchwelle(SCHRITT)}
          style={styles.stepBtn}
          accessibilityLabel="Schwelle erhöhen"
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={hinzufuegen}
        disabled={laeuft || alarme.length >= MAX_ALARME}
        style={[styles.button, (laeuft || alarme.length >= MAX_ALARME) && { opacity: 0.5 }]}
      >
        {laeuft ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>Alarm hinzufügen</Text>
        )}
      </Pressable>

      <Pressable onPress={testen} disabled={laeuft} style={[styles.secondary, laeuft && { opacity: 0.5 }]}>
        <Text style={styles.secondaryText}>Test-Benachrichtigung senden</Text>
      </Pressable>

      {meldung && (
        <Text style={[styles.error, meldung.ok && styles.success]}>{meldung.text}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 12 },
  intro: { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 20 },
  section: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 16 },
  muted: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "500" },
  delete: { color: "rgba(255,255,255,0.6)", fontSize: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  chipText: { color: "#fff", fontSize: 14 },
  chipTextActive: { color: "#000", fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24 },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { color: "#fff", fontSize: 28, lineHeight: 32 },
  schwelle: { color: "#fff", fontSize: 40, fontWeight: "700", minWidth: 140, textAlign: "center" },
  button: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "600" },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#fff", fontSize: 15 },
  error: { color: "#fca5a5", fontSize: 14, textAlign: "center" },
  success: { color: "#86efac" },
});
