import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BMC_URL } from "../lib/config";
import { formatGrad, heute, messzeitraum } from "../lib/format";
import { lakes, sortByFavorite } from "../lib/lakes";
import { useTemperaturen } from "../lib/temperaturen";

const FAVORIT_KEY = "seenland_favorit";
const FAVORIT_HINWEIS_KEY = "seenland_favorit_hinweis";

export default function Seenland() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data, fehler } = useTemperaturen();
  const [favorite, setFavorite] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const pendingLake = useRef(null);

  const orderedLakes = useMemo(() => sortByFavorite(favorite), [favorite]);

  const firstZeit = Object.values(data).find((e) => e?.zeit)?.zeit;
  const timestamp = messzeitraum(firstZeit);

  // Favorit laden; Hinweis nur beim ersten Start ohne gesetzten Favoriten zeigen
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(FAVORIT_KEY);
      if (stored && lakes.some((l) => l.id === stored)) {
        setFavorite(stored);
      } else if (!(await AsyncStorage.getItem(FAVORIT_HINWEIS_KEY))) {
        setShowHint(true);
      }
    })();
  }, []);

  const dismissHint = () => {
    setShowHint(false);
    AsyncStorage.setItem(FAVORIT_HINWEIS_KEY, "1");
  };

  // Hinweis nach einiger Zeit von selbst ausblenden
  useEffect(() => {
    if (!showHint) return;
    const id = setTimeout(dismissHint, 8000);
    return () => clearTimeout(id);
  }, [showHint]);

  const goTo = (i, animated = true) => {
    listRef.current?.scrollToIndex({ index: i, animated });
    setIndex(i);
  };

  // Nach dem Umsortieren (Favorit) oder Tippen auf eine Push: zur gewünschten Karte springen
  useEffect(() => {
    if (!pendingLake.current) return;
    const i = orderedLakes.findIndex((l) => l.id === pendingLake.current);
    pendingLake.current = null;
    if (i >= 0) goTo(i, false);
  }, [orderedLakes]);

  // Tippen auf eine Alarm-Benachrichtigung öffnet den betreffenden See
  // (Platform.OS ist zur Laufzeit konstant → Hook-Reihenfolge bleibt stabil; im Web gibt es die API nicht)
  const lastResponse = Platform.OS === "web" ? null : Notifications.useLastNotificationResponse();
  useEffect(() => {
    const see = lastResponse?.notification.request.content.data?.see;
    const i = orderedLakes.findIndex((l) => l.id === see);
    if (i < 0) return;
    pendingLake.current = see; // falls der Favorit erst danach geladen wird und umsortiert
    goTo(i, false);
  }, [lastResponse]);

  // Genau ein Favorit: nochmaliges Tippen entfernt ihn, ein anderer See übernimmt ihn.
  // Die Liste springt nach dem Umsortieren ohne Animation zur selben Karte.
  const toggleFavorite = (id) => {
    if (showHint) dismissHint();
    const next = favorite === id ? null : id;
    if (next) AsyncStorage.setItem(FAVORIT_KEY, next);
    else AsyncStorage.removeItem(FAVORIT_KEY);
    pendingLake.current = id;
    setFavorite(next);
  };

  const onScrollEnd = (e) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const temperaturText = (id) => {
    const t = data[id]?.temperatur;
    if (t) return formatGrad(t);
    if (fehler || data[id]?.fehler) return "– °C";
    return "Lade...";
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={orderedLakes}
        keyExtractor={(l) => l.id}
        extraData={[favorite, showHint, data, fehler, insets]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => {
          const fav = favorite === item.id;
          return (
            <ImageBackground source={item.image} style={{ width, height }} resizeMode="cover">
              <LinearGradient
                colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.7)"]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[styles.page, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 110 }]}
              >
                {/* Umriss oben, Temperatur & Seename unten – ohne Überlappung */}
                <View style={styles.outlineBox}>
                  <Image source={item.outline} style={styles.outline} resizeMode="contain" />
                </View>
                <Text style={styles.temp} adjustsFontSizeToFit numberOfLines={1}>
                  {temperaturText(item.id)}
                </Text>
                <View style={styles.nameRow}>
                  <Text style={styles.name} adjustsFontSizeToFit numberOfLines={1}>
                    {item.name.toUpperCase()}
                  </Text>
                  <Pressable
                    onPress={() => toggleFavorite(item.id)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityState={{ selected: fav }}
                    accessibilityLabel={
                      fav ? `${item.name} als Favorit entfernen` : `${item.name} als Favorit markieren`
                    }
                  >
                    <Text style={[styles.star, fav && styles.starActive]}>{fav ? "★" : "☆"}</Text>
                  </Pressable>
                </View>
                <Text style={styles.zeitraum}>
                  {timestamp ? `Messzeitraum: ${timestamp}` : " "}
                </Text>
                {showHint && (
                  <Pressable onPress={dismissHint} style={styles.hint}>
                    <Text style={styles.hintText}>
                      Tippe auf ☆ und dein Lieblingssee erscheint immer zuerst
                    </Text>
                  </Pressable>
                )}
              </View>
            </ImageBackground>
          );
        }}
      />

      {/* Header oben */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]} pointerEvents="box-none">
        <Text style={styles.title}>SEENLAND</Text>
        <Pressable
          onPress={() => router.push("/alarme")}
          style={[styles.bell, { top: insets.top + 12 }]}
          hitSlop={12}
          accessibilityLabel="Temperatur-Alarme"
        >
          <Text style={styles.bellText}>🔔</Text>
        </Pressable>
      </View>

      {/* Unten: Leiste (Datum – Punkte – BMC) + Fußnote */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.bar}>
          <View style={styles.barSide}>
            <Text style={styles.small}>{heute()}</Text>
            <Text style={styles.smaller}>lfu.bayern.de</Text>
          </View>
          <View style={styles.dots}>
            {orderedLakes.map((l, i) => (
              <Pressable
                key={l.id}
                onPress={() => goTo(i)}
                hitSlop={8}
                accessibilityLabel={l.name}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
          <View style={[styles.barSide, { alignItems: "flex-end" }]}>
            <Pressable onPress={() => Linking.openURL(BMC_URL)} style={styles.bmc}>
              <Text style={styles.bmcText} numberOfLines={1}>
                ☕ Buy me a coffee
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.footnote}>
          Einnahmen kommen der Nachbarschaftshilfe Seefeld e.V. zugute.{" "}
          <Link href="/impressum" style={styles.link}>
            Impressum
          </Link>
        </Text>
      </View>
    </View>
  );
}

const shadow = {
  textShadowColor: "rgba(0,0,0,0.5)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  page: { flex: 1, alignItems: "center" },
  outlineBox: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", paddingBottom: 16 },
  outline: { width: "70%", height: "100%", opacity: 0.5 },
  temp: { fontSize: 88, fontWeight: "700", color: "#fff", paddingHorizontal: 16, ...shadow },
  header: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: 6, color: "#fff", ...shadow },
  bell: { position: "absolute", right: 20, padding: 4 },
  bellText: { fontSize: 24 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24 },
  name: { flexShrink: 1, fontSize: 28, fontWeight: "600", letterSpacing: 4, color: "rgba(255,255,255,0.9)", ...shadow },
  star: { fontSize: 30, color: "rgba(255,255,255,0.6)", ...shadow },
  starActive: { color: "#fde047" },
  zeitraum: { fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 4 },
  hint: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintText: { fontSize: 12, color: "#1f2937" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  barSide: { flex: 1 },
  small: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  smaller: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  dots: { flexDirection: "row", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 24, backgroundColor: "#fff" },
  bmc: { backgroundColor: "#FFDD00", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  bmcText: { fontSize: 11, fontWeight: "600", color: "#000" },
  footnote: { marginTop: 12, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)" },
  link: { textDecorationLine: "underline" },
});
