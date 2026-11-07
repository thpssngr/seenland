import { Image, ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { formatGrad, messzeitraum } from "../../lib/format";
import { lakes } from "../../lib/lakes";
import { useTemperaturen } from "../../lib/temperaturen";

export default function SeeDetail() {
  const { id } = useLocalSearchParams();
  const lake = lakes.find((l) => l.id === id);
  const { data } = useTemperaturen();

  if (!lake) {
    return <Text style={styles.p}>See nicht gefunden.</Text>;
  }

  const messung = data[lake.id];
  const zeitraum = messzeitraum(messung?.zeit);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ title: lake.name }} />

      {/* Kopf: Foto mit Seeumriss und aktueller Temperatur */}
      <ImageBackground source={lake.image} style={styles.hero} resizeMode="cover">
        <LinearGradient
          colors={["rgba(3,7,18,0.55)", "rgba(3,7,18,0.85)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.outlineBox}>
          <Image source={lake.outline} style={styles.outline} resizeMode="contain" />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.temp}>
            {messung?.temperatur ? formatGrad(messung.temperatur) : "– °C"}
          </Text>
          {zeitraum ? (
            <Text style={styles.muted}>
              Gemessen am {messung.zeit.split(" ")[0]}, {zeitraum}
            </Text>
          ) : null}
        </View>
      </ImageBackground>

      <View style={styles.body}>
        <Text style={styles.h2}>Steckbrief</Text>
        <View style={styles.card}>
          {lake.steckbrief.map(([label, wert], i) => (
            <View key={label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{wert}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Wissenswertes</Text>
        {lake.info.map((satz) => (
          <Text key={satz} style={styles.p}>
            • {satz}
          </Text>
        ))}

        <Text style={styles.h2}>Messstelle</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{lake.messstelle.name}</Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.label}>Messstellen-Nr.</Text>
            <Text style={styles.value}>{lake.messstelle.nr}</Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.label}>Betreiber</Text>
            <Text style={styles.value}>Gewässerkundlicher Dienst Bayern</Text>
          </View>
        </View>
        <Text style={styles.small}>
          Die Wassertemperatur wird stündlich gemessen. Die Werte sind ungeprüfte Rohdaten.
        </Text>

        <Pressable style={styles.secondary} onPress={() => Linking.openURL(lake.messstelle.url)}>
          <Text style={styles.secondaryText}>Messstelle beim GKD Bayern ansehen ↗</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => router.push({ pathname: "/alarme", params: { see: lake.id } })}
        >
          <Text style={styles.buttonText}>🔔 Alarm für {lake.name} anlegen</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 360, alignItems: "center", paddingTop: 24, paddingBottom: 20 },
  outlineBox: { flex: 1, width: "100%", alignItems: "center", marginBottom: 12 },
  outline: { width: "60%", height: "100%", opacity: 0.9 },
  heroText: { alignItems: "center" },
  temp: { color: "#fff", fontSize: 56, fontWeight: "700" },
  muted: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  body: { padding: 20, gap: 10 },
  h2: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 12 },
  card: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, paddingHorizontal: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, gap: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.15)" },
  label: { color: "rgba(255,255,255,0.6)", fontSize: 15 },
  value: { color: "#fff", fontSize: 15, flexShrink: 1, textAlign: "right" },
  p: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22 },
  small: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryText: { color: "#fff", fontSize: 15 },
  button: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "600" },
});
