# datei: seen_api.py

from flask import Flask, jsonify
import requests
import os
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

BASE_URL = "https://www.gkd.bayern.de/de/seen/wassertemperatur/isar/{slug}/messwerte"


def scrape_temperature(slug):
    url = BASE_URL.format(slug=slug)
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X)"
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
    except requests.exceptions.RequestException:
        return None

    if response.status_code != 200:
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table", class_="tblsort")
    if not table:
        return None

    rows = table.find_all("tr")
    if len(rows) < 2:
        return None

    first_row = rows[1].find_all("td")
    if len(first_row) < 2:
        return None

    timestamp = first_row[0].get_text(strip=True)
    temperature = first_row[1].get_text(strip=True)

    return {"zeit": timestamp, "temperatur": temperature}


def update_cache():
    global data_cache, last_updated
    print(f"[{datetime.now()}] Aktualisiere Cache...")
    ergebnisse = {}

    def fetch(item):
        name, slug = item
        return name, scrape_temperature(slug)

    with ThreadPoolExecutor(max_workers=4) as executor:
        for name, data in executor.map(fetch, SEEN.items()):
            ergebnisse[name] = data if data else {"fehler": "keine Daten"}

    data_cache = ergebnisse
    last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{datetime.now()}] Cache aktualisiert.")


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

# Initiales Update beim Start
update_cache()

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
