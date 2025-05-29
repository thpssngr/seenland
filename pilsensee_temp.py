# datei: pilsensee_temp.py

import requests
from bs4 import BeautifulSoup

def get_pilsensee_temperature():
    url = "https://www.gkd.bayern.de/de/seen/wassertemperatur/isar/pilsensee-16628055/messwerte"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113 Safari/537.36"
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Fehler beim Laden der Seite: Status {response.status_code}")

    soup = BeautifulSoup(response.text, "html.parser")

    table = soup.find("table", class_="tblsort")
    if not table:
        raise Exception("Messwert-Tabelle mit Klasse 'tblsort' nicht gefunden")

    rows = table.find_all("tr")
    if len(rows) < 2:
        raise Exception("Keine Datenzeilen gefunden")

    # Erste Datenzeile (nach dem Header)
    first_data_row = rows[1].find_all("td")
    if len(first_data_row) < 2:
        raise Exception("Nicht genügend Spalten in erster Zeile")

    timestamp = first_data_row[0].get_text(strip=True)
    temperature = first_data_row[1].get_text(strip=True)

    return f"{timestamp}: {temperature} °C"

if __name__ == "__main__":
    try:
        result = get_pilsensee_temperature()
        print("🌊 Aktuelle Wassertemperatur Pilsensee:", result)
    except Exception as e:
        print("❌ Fehler:", e)
