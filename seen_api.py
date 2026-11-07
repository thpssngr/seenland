# datei: seen_api.py

from flask import Flask, jsonify, request
import requests
import os
import json
import re
import threading
from bs4 import BeautifulSoup
from flask_cors import CORS
from concurrent.futures import ThreadPoolExecutor, as_completed
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

app = Flask(__name__)

# CORS nur für das Frontend erlauben
CORS(app, origins=["https://seenland-frontend.vercel.app"])

# Globaler Cache für Hintergrund-Updates
data_cache = {}
last_updated = None

SEEN = {
    "pilsensee": "pilsensee-16628055",
    "woerthsee": "woerthsee-16651003",
    "ammersee": "stegen-16602008",
    "starnbergersee": "starnberg-16663002"
}

NAMEN = {
    "pilsensee": "Pilsensee",
    "woerthsee": "Wörthsee",
    "ammersee": "Ammersee",
    "starnbergersee": "Starnberger See"
}

# Ohne "?method=tabellen" liefert der GKD inzwischen nur die Grafik ohne Messwert-Tabelle
# Ohne "?method=tabellen" liefert der GKD nur die Grafik ohne Messwert-Tabelle
BASE_URL = "https://www.gkd.bayern.de/de/seen/wassertemperatur/isar/{slug}/messwerte?method=tabellen"
# Vollständige Browser-Kopfzeilen: unvollständige User-Agents werden gern geblockt
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
}
DATUM_MUSTER = re.compile(r"(\d{2}\.\d{2}\.\d{4})(?:\s+(\d{2}:\d{2}))?")
UHRZEIT_MUSTER = re.compile(r"\d{2}:\d{2}")
ZAHL_MUSTER = re.compile(r"-?\d+(?:[.,]\d+)?")

# --- Temperatur-Alarme (Push über Expo) ---
# Struktur: { "<ExpoPushToken>": [ {"see", "richtung", "schwelle", "ausgeloest"}, ... ] }
# Hinweis: Auf Render Free geht die Datei bei Redeploys verloren. Die App sendet ihre
# Alarme bei jedem Start erneut, dadurch stellt sich der Bestand selbst wieder her.
ALARME_DATEI = os.environ.get("ALARME_DATEI", "alarme.json")
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
MAX_ALARME_PRO_GERAET = 20
# Erst wenn die Temperatur wieder um diesen Wert auf der anderen Seite der Schwelle liegt,
# kann der Alarm erneut auslösen (verhindert Push-Flut bei Schwankungen um die Schwelle).
HYSTERESE = 0.5

alarme = {}
alarme_lock = threading.Lock()


def scrape_temperature(slug):
    return scrape_url(slug, BASE_URL.format(slug=slug))


def scrape_url(slug, url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now()}] {slug}: Abruf fehlgeschlagen ({url}): {e}")
        return None

    if response.status_code != 200:
        print(f"[{datetime.now()}] {slug}: HTTP {response.status_code} von {url}")
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    # Alle Tabellenzeilen durchsuchen: Datum (+ Uhrzeit, ggf. in eigener Zelle) und
    # danach der erste Zahlenwert. Der neueste Zeitpunkt gewinnt.
    neuester = None
    for row in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True) for c in row.find_all(["td", "th"])]
        messung = parse_zeile(cells)
        if messung and (neuester is None or messung[0] > neuester[0]):
            neuester = messung
    if neuester:
        zeitpunkt, temp = neuester
        return {"zeit": zeitpunkt.strftime("%d.%m.%Y %H:%M"), "temperatur": f"{temp:g}"}

    # Diagnose fürs Render-Log: Titel und sichtbarer Text (z. B. Sperr- oder Captcha-Seite)
    titel = soup.title.get_text(strip=True) if soup.title else "-"
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = " ".join(soup.get_text(" ").split())
    print(f"[{datetime.now()}] {slug}: keine Messwerte in {url} "
          f"(HTTP {response.status_code}, {len(response.text)} Zeichen). "
          f"Titel: {titel} | Text: {text[:600]}")
    return None


def zahl(text):
    text = text.replace("°C", "").replace("°", "").strip()
    if not ZAHL_MUSTER.fullmatch(text):
        return None
    return float(text.replace(",", "."))


def parse_zeile(cells):
    """Liefert (datetime, temperatur) für eine Tabellenzeile oder None."""
    for i, cell in enumerate(cells):
        m = DATUM_MUSTER.match(cell)
        if not m:
            continue
        datum, uhrzeit, rest = m.group(1), m.group(2), cells[i + 1:]
        if not uhrzeit and rest and UHRZEIT_MUSTER.fullmatch(rest[0]):
            uhrzeit, rest = rest[0], rest[1:]
        if not uhrzeit:
            return None
        for c in rest:
            temp = zahl(c)
            if temp is not None:
                if not -5 <= temp <= 40:
                    return None
                return datetime.strptime(f"{datum} {uhrzeit}", "%d.%m.%Y %H:%M"), temp
        return None
    return None


def update_cache():
    global data_cache, last_updated
    print(f"[{datetime.now()}] Aktualisiere Cache...")
    ergebnisse = {}

    def fetch(item):
        name, slug = item
        return name, scrape_temperature(slug)

    with ThreadPoolExecutor(max_workers=2) as executor:
        for name, data in executor.map(fetch, SEEN.items()):
            if data:
                ergebnisse[name] = data
            elif "temperatur" in data_cache.get(name, {}):
                # Abruf gescheitert: letzten bekannten Wert behalten statt "keine Daten"
                ergebnisse[name] = data_cache[name]
            else:
                ergebnisse[name] = {"fehler": "keine Daten"}

    data_cache = ergebnisse
    last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{datetime.now()}] Cache aktualisiert.")
    pruefe_alarme()


def parse_temperatur(wert):
    try:
        return float(str(wert).replace(",", "."))
    except (TypeError, ValueError):
        return None


def aktuelle_temperatur(see):
    return parse_temperatur((data_cache.get(see) or {}).get("temperatur"))


def bedingung_erfuellt(alarm, temp):
    if alarm["richtung"] == "unter":
        return temp < alarm["schwelle"]
    return temp > alarm["schwelle"]


def wieder_scharf(alarm, temp):
    if alarm["richtung"] == "unter":
        return temp >= alarm["schwelle"] + HYSTERESE
    return temp <= alarm["schwelle"] - HYSTERESE


def lade_alarme():
    global alarme
    try:
        with open(ALARME_DATEI, encoding="utf-8") as f:
            alarme = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        alarme = {}


def speichere_alarme():
    tmp = ALARME_DATEI + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(alarme, f, ensure_ascii=False)
    os.replace(tmp, ALARME_DATEI)


def format_grad(wert):
    return f"{wert:g}".replace(".", ",") + " °C"


def sende_pushes(nachrichten):
    """Sendet Nachrichten an den Expo Push Service. Gibt ungültige Tokens zurück."""
    ungueltig = set()
    for i in range(0, len(nachrichten), 100):  # Expo erlaubt max. 100 pro Request
        batch = nachrichten[i:i + 100]
        try:
            res = requests.post(EXPO_PUSH_URL, json=batch, timeout=10)
            tickets = res.json().get("data", [])
        except (requests.exceptions.RequestException, ValueError) as e:
            print(f"[{datetime.now()}] Push-Versand fehlgeschlagen: {e}")
            continue
        for nachricht, ticket in zip(batch, tickets):
            if ticket.get("details", {}).get("error") == "DeviceNotRegistered":
                ungueltig.add(nachricht["to"])
    return ungueltig


def pruefe_alarme():
    nachrichten = []
    with alarme_lock:
        for token, liste in alarme.items():
            for alarm in liste:
                temp = aktuelle_temperatur(alarm["see"])
                if temp is None:
                    continue
                if not alarm["ausgeloest"] and bedingung_erfuellt(alarm, temp):
                    alarm["ausgeloest"] = True
                    verb = "unter" if alarm["richtung"] == "unter" else "über"
                    nachrichten.append({
                        "to": token,
                        "title": f"{NAMEN[alarm['see']]}: {format_grad(temp)}",
                        "body": f"Die Wassertemperatur liegt jetzt {verb} {format_grad(alarm['schwelle'])}.",
                        "sound": "default",
                        "data": {"see": alarm["see"]},
                    })
                elif alarm["ausgeloest"] and wieder_scharf(alarm, temp):
                    alarm["ausgeloest"] = False
        speichere_alarme()

    if not nachrichten:
        return
    print(f"[{datetime.now()}] Sende {len(nachrichten)} Push-Nachricht(en)...")
    ungueltig = sende_pushes(nachrichten)
    if ungueltig:
        with alarme_lock:
            for token in ungueltig:
                alarme.pop(token, None)
            speichere_alarme()


def validiere_alarm(a):
    if not isinstance(a, dict):
        return None
    see = a.get("see")
    richtung = a.get("richtung")
    schwelle = a.get("schwelle")
    if see not in SEEN or richtung not in ("unter", "ueber"):
        return None
    if isinstance(schwelle, bool) or not isinstance(schwelle, (int, float)):
        return None
    if not -5 <= schwelle <= 40:
        return None
    return {"see": see, "richtung": richtung, "schwelle": round(float(schwelle), 1)}


def keep_alive():
    """Selbst-Ping, um Render Free Tier am Schlafen zu hindern (15 Min Inaktivität)"""
    url = os.environ.get("RENDER_EXTERNAL_URL", "https://seenland.onrender.com")
    try:
        print(f"[{datetime.now()}] Sende Keep-Alive an {url}...")
        requests.get(url, timeout=5)
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now()}] Keep-Alive fehlgeschlagen: {e}")


@app.route("/temperatur/<see_name>")
def get_temperatur(see_name):
    name = see_name.lower()
    if name not in SEEN:
        return jsonify({"fehler": "See nicht gefunden"}), 404

    data = data_cache.get(name)
    if not data or "fehler" in data:
        return jsonify({"fehler": "Daten konnten nicht geladen werden"}), 500

    return jsonify({
        "see": see_name,
        **data,
        "aktualisiert": last_updated
    })


@app.route("/alle")
def get_alle_temperaturen():
    # Direktes Mapping zurückgeben, um Frontend-Kompatibilität zu wahren
    return jsonify(data_cache)


@app.route("/alarme", methods=["PUT"])
def set_alarme():
    """Ersetzt alle Alarme eines Geräts. Leere Liste = Gerät abmelden."""
    body = request.get_json(silent=True) or {}
    token = body.get("token")
    liste = body.get("alarme")
    if not isinstance(token, str) or not token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
        return jsonify({"fehler": "Ungültiger Push-Token"}), 400
    if not isinstance(liste, list) or len(liste) > MAX_ALARME_PRO_GERAET:
        return jsonify({"fehler": "Ungültige Alarmliste"}), 400

    neu = []
    for a in liste:
        alarm = validiere_alarm(a)
        if alarm is None:
            return jsonify({"fehler": "Ungültiger Alarm", "alarm": a}), 400
        neu.append(alarm)

    with alarme_lock:
        bisher = {(a["see"], a["richtung"], a["schwelle"]): a["ausgeloest"]
                  for a in alarme.get(token, [])}
        for alarm in neu:
            key = (alarm["see"], alarm["richtung"], alarm["schwelle"])
            if key in bisher:
                alarm["ausgeloest"] = bisher[key]
            else:
                # Ist die Bedingung schon erfüllt, erst nach erneutem Überschreiten melden
                temp = aktuelle_temperatur(alarm["see"])
                alarm["ausgeloest"] = temp is not None and bedingung_erfuellt(alarm, temp)
        if neu:
            alarme[token] = neu
        else:
            alarme.pop(token, None)
        speichere_alarme()

    return jsonify({"alarme": neu})


@app.route("/alarme/test", methods=["POST"])
def test_push():
    """Schickt sofort eine Test-Benachrichtigung an das Gerät (prüft die ganze Push-Kette)."""
    token = (request.get_json(silent=True) or {}).get("token")
    if not isinstance(token, str) or not token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
        return jsonify({"fehler": "Ungültiger Push-Token"}), 400
    try:
        res = requests.post(EXPO_PUSH_URL, json=[{
            "to": token,
            "title": "Seenland",
            "body": "Test-Benachrichtigung: Push funktioniert.",
            "sound": "default",
        }], timeout=10)
        ticket = (res.json().get("data") or [{}])[0]
    except (requests.exceptions.RequestException, ValueError) as e:
        return jsonify({"fehler": f"Expo Push Service nicht erreichbar: {e}"}), 502
    if ticket.get("status") != "ok":
        return jsonify({"fehler": ticket.get("message", "Push wurde abgelehnt")}), 502
    return jsonify({"ok": True})


@app.route("/")
def index():
    return "<h1>🚤 Seen-Temperatur API</h1><ul>" + \
           "".join(f"<li><a href='/temperatur/{see}'>{see}</a></li>" for see in SEEN) + \
           "<li><a href='/alle'>Alle Seen</a></li></ul>"


# Scheduler initialisieren (wird beim Import ausgeführt, wichtig für Production/Gunicorn)
scheduler = BackgroundScheduler()
scheduler.add_job(func=update_cache, trigger="interval", minutes=10)
scheduler.add_job(func=keep_alive, trigger="interval", minutes=14)
scheduler.start()

# Gespeicherte Alarme laden, dann initiales Update beim Start
lade_alarme()
update_cache()

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
