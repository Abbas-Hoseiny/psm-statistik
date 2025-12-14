# PSM Statistik Dashboard

📊 Interaktives Statistik-Dashboard für die BVL Pflanzenschutzmittel-Datenbank.

**Live:** [st.digitale-psm.de](https://st.digitale-psm.de) (nach GitHub Pages Setup)

## Features

- 📈 **Interaktive Diagramme** mit Apache ECharts
- 🔍 **SQL-Abfragen im Browser** dank SQL.js
- 🎨 **Dark Theme** im PSM Design System
- 📱 **Responsive** für alle Geräte
- ⚡ **Statisch** - läuft komplett im Browser

## Datenquelle

Die Daten werden automatisch von der [pflanzenschutz-db](https://github.com/Abbas-Hoseiny/pflanzenschutz-db) Repository geladen:

```
https://abbas-hoseiny.github.io/pflanzenschutz-db/pflanzenschutz.sqlite.br
```

Die Datenbank wird alle 2 Tage vom BVL API synchronisiert.

## Tech Stack

- **Framework:** [Astro](https://astro.build/)
- **Charts:** [Apache ECharts](https://echarts.apache.org/)
- **Database:** [SQL.js](https://sql.js.org/) (SQLite WASM)
- **Hosting:** GitHub Pages

## Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/Abbas-Hoseiny/psm-statistik.git
cd psm-statistik

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Öffne http://localhost:4321/psm-statistik/

## Build

```bash
npm run build
npm run preview
```

## Custom Domain Setup

1. DNS-Record erstellen:

   ```
   CNAME st.digitale-psm.de -> abbas-hoseiny.github.io
   ```

2. In GitHub Repository Settings → Pages:
   - Source: GitHub Actions
   - Custom domain: `st.digitale-psm.de`

## Seiten

| Seite          | Beschreibung            |
| -------------- | ----------------------- |
| `/`            | Dashboard mit Übersicht |
| `/wirkstoffe/` | Wirkstoff-Statistiken   |
| `/kulturen/`   | Kulturen-Analyse        |
| `/timeline/`   | Zulassungs-Timeline     |

## Lizenz

MIT

---

Teil des [digitale-psm.de](https://digitale-psm.de) Projekts.
