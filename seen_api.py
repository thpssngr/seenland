# datei: seen_api.py

from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup
from flask_caching import Cache
from concurrent.futures import ThreadPoolExecutor, as_completed

app = Flask(__name__)

# Cache-Konfiguration (einfacher In-Memory-Cache)
cache = Cache(app, config={"CACHE_TYPE": "SimpleCache"})

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


@app.route("/temperatur/<see_name>")
@cache.cached(timeout=3600)
def get_temperatur(see_name):
    slug = SEEN.get(see_name.lower())
    if not slug:
        return jsonify({"fehler": "See nicht gefunden"}), 404

    data = scrape_temperature(slug)
    if data is None:
        return jsonify({"fehler": "Daten konnten nicht geladen werden"}), 500

    return jsonify({"see": see_name, **data})


@app.route("/alle")
@cache.cached(timeout=3600)
def get_alle_temperaturen():
    ergebnisse = {}

    def fetch(item):
        name, slug = item
        return name, scrape_temperature(slug)

    with ThreadPoolExecutor(max_workers=4) as executor:
        for name, data in executor.map(fetch, SEEN.items()):
            ergebnisse[name] = data if data else {"fehler": "keine Daten"}

    return jsonify(ergebnisse)


@app.route("/")
def index():
    return "<h1>🚤 Seen-Temperatur API</h1><ul>" + \
           "".join(f"<li><a href='/temperatur/{see}'>{see}</a></li>" for see in SEEN) + \
           "<li><a href='/alle'>Alle Seen</a></li></ul>"


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
