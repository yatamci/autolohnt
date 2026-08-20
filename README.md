# 🚗 AutoLohnt

AutoLohnt ist eine Web-App zur wirtschaftlichen Bewertung von Autos.

Die Anwendung hilft bei der Frage:

> Reparieren, weiterfahren oder verkaufen?

Dabei können unter anderem berücksichtigt werden:

- Kaufpreis
- Kaufdatum
- Kilometerstand beim Kauf
- aktueller Kilometerstand
- jährliche Fahrleistung
- Kraftstoffverbrauch
- Kraftstoffpreis
- Versicherung
- Kfz-Steuer
- bisherige Reparaturkosten
- aktueller Fahrzeugwert
- geplante Haltedauer
- Budget für das nächste Auto
- Fahrprofil
- Bedeutung von Verbrauch
- Bedeutung von Leistung
- Bedeutung von Sicherheit
- Bedeutung von Komfort
- Bedeutung geringer Reparaturkosten
- Bedeutung eines jüngeren Baujahres

Außerdem können Fahrzeuge miteinander verglichen und lokal gespeichert werden.

---

# 📁 Projektstruktur

```text
autolohnt/
│
├── index.html
├── styles.css
├── app.js
│
├── api/
│   └── vehicle-search.js
│
├── data/
│   └── vehicle-data.json
│
├── package.json
├── vercel.json
└── README.md