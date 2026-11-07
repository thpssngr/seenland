# seenland

Backend (Flask) für die Seenland-Webseite und -App: liest die Wassertemperaturen bayerischer Seen
vom GKD Bayern und stellt sie als JSON bereit.

## Endpunkte

| Methode | Pfad                  | Beschreibung                                              |
|---------|-----------------------|-----------------------------------------------------------|
| GET     | `/alle`               | Temperaturen aller Seen                                   |
| GET     | `/temperatur/<see>`   | Temperatur eines Sees                                     |
| PUT     | `/alarme`             | Temperatur-Alarme eines Geräts setzen (App, Push via Expo) |

`PUT /alarme` erwartet
`{"token": "ExponentPushToken[...]", "alarme": [{"see": "pilsensee", "richtung": "unter", "schwelle": 10}]}`
(`richtung`: `unter` | `ueber`). Eine leere Liste meldet das Gerät ab. Gespeichert wird in
`alarme.json` (Pfad über `ALARME_DATEI` änderbar).

Die mobile App liegt in [`mobile/`](mobile/README.md).
