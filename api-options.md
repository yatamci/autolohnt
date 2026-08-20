<!-- api-options.md -->

# Kostenlose Fahrzeug-APIs

## 1. api4cars / CarAPI — beste Option für Deutschland

https://api4cars.com/

https://api4cars.com/api-docs

Laut Anbieter:
- 500 API-Anfragen/Monat kostenlos
- HSN/TSN-Suche
- Hersteller-/Modellsuche
- JSON
- Fahrzeugdaten wie Modell, PS, Hubraum, Kraftstoff und Baujahr

Beispiel:

GET /carapi/v1/vehicle?hsn=0005&tsn=AAN

Für AutoLohnt wäre das meine erste Wahl.

---

## 2. CarAPI / carapi.app — gute Modell-/Typ-Suche

https://carapi.app/

https://carapi.app/api

Die kostenlose Datenbank kann ohne Account genutzt werden.

Einschränkung des kostenlosen Datensatzes laut Dokumentation:
2015–2020.

Deshalb eher als Ergänzung für Modell-/Hersteller-Suche verwenden.

---

## 3. KBAAPI / RegCheck

https://www.kbaapi.de/

HSN/TSN bzw. KBA-Nummer:

/CheckGermany

Laut Anbieter:
- kostenloses Konto
- 10 kostenlose Credits

Gut zum Testen, aber für eine größere öffentliche Anwendung vermutlich zu knapp.

---

## 4. VehDB

https://vehdb.com/cars-api

Laut Anbieter:
- 100 kostenlose API-Anfragen/Monat
- sehr große internationale Fahrzeugdatenbank
- Hersteller
- Modell
- Baujahr
- Motor
- Verbrauch
- Karosserie
- Antrieb

Sehr interessant als internationale Ergänzung, aber nicht speziell für deutsche HSN/TSN.

---

# Empfehlung für AutoLohnt

HSN/TSN:
api4cars

Modellname:
api4cars + CarAPI

Internationale technische Fahrzeugdaten:
VehDB

---

# WICHTIG

API-Keys niemals in index.html oder app.js speichern.

Für Vercel sollte später folgende Struktur verwendet werden:

Browser
↓
/api/vehicle-search
↓
Vercel Serverless Function
↓
API mit geheimem API-Key
↓
JSON
↓
Browser

Die API-Keys gehören in die Vercel Environment Variables.