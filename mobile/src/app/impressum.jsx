import { Linking, ScrollView, StyleSheet, Text } from "react-native";

const L = ({ url, children }) => (
  <Text style={styles.link} onPress={() => Linking.openURL(url)}>
    {children}
  </Text>
);

const H1 = ({ children }) => (
  <Text style={styles.h1} adjustsFontSizeToFit numberOfLines={1}>
    {children}
  </Text>
);
const H2 = ({ children }) => <Text style={styles.h2}>{children}</Text>;
const P = ({ children }) => <Text style={styles.p}>{children}</Text>;

export default function Impressum() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <H1>Impressum</H1>
      <H2>Angaben gemäß § 5 DDG</H2>
      <P>
        Sebastian Mauch{"\n"}Höhenstr. 21{"\n"}82229 Seefeld{"\n"}Deutschland
      </P>
      <H2>Kontakt</H2>
      <P>
        E-Mail: <L url="mailto:sebastianmauch@gmail.com">sebastianmauch@gmail.com</L>
      </P>
      <H2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</H2>
      <P>Sebastian Mauch (Anschrift wie oben)</P>
      <H2>Datenquelle</H2>
      <P>
        Die angezeigten Wassertemperaturen stammen vom Gewässerkundlichen Dienst Bayern (
        <L url="https://www.gkd.bayern.de">gkd.bayern.de</L>, Bayerisches Landesamt für Umwelt).
        Alle Angaben ohne Gewähr.
      </P>
      <H2>Spenden</H2>
      <P>
        Einnahmen über den „Buy me a coffee“-Button kommen der Nachbarschaftshilfe Seefeld e.V.
        zugute.
      </P>

      <H1>Datenschutzerklärung</H1>
      <H2>1. Verantwortlicher</H2>
      <P>
        Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist die im Impressum
        genannte Person. Diese App verwendet keine Tracking- oder Analysedienste und legt keine
        Nutzerkonten an.
      </P>

      <H2>2. Abruf der Messwerte</H2>
      <P>
        Die Wassertemperaturen werden von unserem eigenen Backend-Dienst (gehostet bei Render
        Services, Inc., USA) abgerufen. Dabei wird technisch bedingt die IP-Adresse Ihres Geräts an
        diesen Dienst übertragen (Art. 6 Abs. 1 lit. f DSGVO). Es werden dort keine weiteren
        personenbezogenen Daten gespeichert oder ausgewertet.
      </P>

      <H2>3. Temperatur-Alarme (Push-Benachrichtigungen)</H2>
      <P>
        Wenn Sie einen Temperatur-Alarm anlegen und Benachrichtigungen erlauben, übermittelt die App
        einen pseudonymen Push-Token Ihres Geräts zusammen mit den gewählten Alarmen (See, Richtung,
        Temperaturschwelle) an unseren Backend-Dienst (Render Services, Inc., USA). Dort werden diese
        Daten gespeichert, bis Sie die Alarme in der App löschen. Der Versand der Benachrichtigungen
        erfolgt über den Push-Dienst von Expo (650 Industries, Inc., USA) sowie den Apple Push
        Notification Service bzw. Firebase Cloud Messaging (Google). Rechtsgrundlage ist Ihre
        Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie jederzeit durch Löschen aller Alarme oder
        Deaktivieren der Benachrichtigungen widerrufen können. Weitere Informationen:{" "}
        <L url="https://expo.dev/privacy">expo.dev/privacy</L>.
      </P>

      <H2>4. Buy me a coffee</H2>
      <P>
        Der Spenden-Button öffnet die Seite von „Buy Me a Coffee“ (Publisherati LLC, USA) in Ihrem
        Browser. Erst dann verarbeitet der Anbieter Daten in eigener Verantwortung. Es gilt die
        Datenschutzerklärung des Anbieters:{" "}
        <L url="https://www.buymeacoffee.com/privacy-policy">buymeacoffee.com/privacy-policy</L>.
      </P>

      <H2>5. Lokale Speicherung</H2>
      <P>
        Ihr Lieblingssee und Ihre Alarme werden zusätzlich lokal auf Ihrem Gerät gespeichert. Diese
        Daten werden beim Deinstallieren der App gelöscht.
      </P>

      <H2>6. Ihre Rechte</H2>
      <P>
        Sie haben gegenüber dem Verantwortlichen das Recht auf Auskunft (Art. 15 DSGVO),
        Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
        Datenübertragbarkeit (Art. 20) sowie Widerspruch gegen die Verarbeitung (Art. 21). Außerdem
        steht Ihnen ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu, z. B. beim
        Bayerischen Landesamt für Datenschutzaufsicht (BayLDA).
      </P>

      <Text style={styles.stand}>Stand: November 2026</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, gap: 12 },
  h1: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 16,
  },
  h2: { color: "#fff", fontSize: 17, fontWeight: "600", marginTop: 8 },
  p: { color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 22 },
  link: { textDecorationLine: "underline" },
  stand: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 16 },
});
