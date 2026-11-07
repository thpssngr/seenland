# Seenland – Mobile App

Expo-/React-Native-App (iOS & Android) zur Webseite
[seenland-frontend](https://github.com/thpssngr/seenland-frontend). Nutzt dasselbe Backend
(`seen_api.py`, gehostet auf Render).

## Funktionen

- **Seen**: Wassertemperatur von Pilsensee, Wörthsee, Ammersee und Starnberger See zum Durchwischen,
  Messzeitraum, Favorit (★ – erscheint immer zuerst), Hinweis beim ersten Start, Buy-me-a-coffee,
  Impressum. Daten werden beim Öffnen der App automatisch neu geladen.
- **Temperatur-Alarme** (🔔 oben rechts): „Benachrichtige mich, wenn der Pilsensee unter 10 °C
  fällt“ bzw. „über 22 °C steigt“. Schwelle in 0,5-°C-Schritten, bis zu 20 Alarme.
  Tippen auf die Benachrichtigung öffnet den betreffenden See.

## Wie die Alarme funktionieren

1. Die App holt sich einen Expo-Push-Token und schickt ihn mit allen Alarmen per `PUT /alarme`
   ans Backend.
2. Das Backend prüft nach jedem Scrape (alle 10 Min.) die Schwellen und verschickt über den
   Expo Push Service eine Benachrichtigung, **sobald** die Schwelle unter- bzw. überschritten wird.
   Danach ist der Alarm stumm, bis die Temperatur wieder 0,5 °C auf der anderen Seite liegt
   (verhindert Push-Flut bei Schwankungen).
3. Ist die Bedingung beim Anlegen schon erfüllt, meldet sich der Alarm erst beim nächsten Mal.
4. Die Alarme liegen zusätzlich lokal auf dem Gerät und werden bei jedem App-Start erneut
   gesendet. Geht `alarme.json` auf Render verloren (Redeploy), stellt sich der Bestand so selbst
   wieder her.

## Lokal starten

```bash
cd mobile
npm install
npx expo start
```

QR-Code mit **Expo Go** scannen. Die Seen-Ansicht funktioniert dort sofort.

## Push-Benachrichtigungen einrichten (einmalig)

Push braucht ein EAS-Projekt; auf Android funktioniert Push **nicht** in Expo Go (seit SDK 53),
sondern nur in einem eigenen Build.

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # trägt extra.eas.projectId in app.json ein
npx eas-cli@latest build --profile preview --platform android   # installierbare APK
```

- **Android**: Für den Push-Versand braucht Expo einen FCM-Schlüssel (Firebase-Projekt →
  Service-Account-Key in den EAS-Credentials hinterlegen, `npx eas-cli@latest credentials`).
- **iOS**: Apple-Developer-Account nötig; die Push-Zertifikate legt `eas build` automatisch an.

Bundle-ID/Package ist `de.thpssngr.seenland` (in `app.json` anpassbar, **vor** dem ersten
Store-Upload).

## Struktur

```
src/app/_layout.jsx     Navigation (Stack), Push-Handler, Alarm-Sync beim Start
src/app/index.jsx       Seen-Karussell
src/app/alarme.jsx      Temperatur-Alarme verwalten
src/app/impressum.jsx   Impressum & Datenschutz (an App angepasst)
src/lib/                API-URL, Seen-Daten, Formatierung, Alarm-Logik
assets/images/          Seebilder & Umrisse (aus seenland-frontend übernommen)
```
