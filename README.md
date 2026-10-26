# PSM Statistik

Statistik-Dashboard für die Pflanzenschutzmittel-Datenbank des BVL (Bundesamt für Verbraucherschutz und Lebensmittelsicherheit).

**Live:** [st.digitale-psm.de](https://st.digitale-psm.de) · Teil von [Digitale PSM](https://digitale-psm.de) ([Quellcode der App](https://github.com/Abbas-Hoseiny/psm))

## Was es zeigt

| Seite          | Inhalt                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| `/`            | Kennzahlen, Top-Kulturen, Anwendungsbereiche, Erstzulassungen          |
| `/wirkstoffe/` | Wirkstoffe nach Kategorie und nach Anzahl zugelassener Mittel, Tabelle |
| `/kulturen/`   | Kulturen und Kulturgruppen nach Anwendungsgebieten, Tabelle mit Suche  |
| `/timeline/`   | Erstzulassung, Zulassungsende und Bestand der heute zugelassenen Mittel |

## So funktioniert es

- Die Seite ist statisch. Beim Aufruf lädt der Browser die komplette BVL-Datenbank als
  SQLite-Datei (ZIP, rund 12 MB, entpackt rund 110 MB) und fragt sie mit [SQL.js](https://sql.js.org/)
  direkt im Browser ab. Es gibt keinen Server, der Abfragen sieht.
- SQL.js wird mit der Seite gebündelt, nicht von einem CDN geladen.
- Diagramme: [Apache ECharts](https://echarts.apache.org/), Framework: [Astro](https://astro.build/).

## Datenquelle

Die Datenbank kommt aus [pflanzenschutz-db](https://github.com/Abbas-Hoseiny/pflanzenschutz-db):
eine Pipeline, die alle zwei Tage die BVL-API abruft und die Daten als SQLite veröffentlicht.

```
https://abbas-hoseiny.github.io/pflanzenschutz-db/pflanzenschutz.sqlite.zip
```

Zählregeln:

- Mittel-Zahlen beziehen sich auf heute zugelassene Mittel. Abgelaufene Mittel enthält die BVL-Datenbank nicht.
- Kulturen und Schaderreger, die in einem Anwendungsgebiet ausdrücklich ausgenommen sind (`ausgenommen = 'J'`), zählen nicht.
- Codes werden über die BVL-Kodelisten übersetzt: 948 Kulturen, 947 Schadorganismen, 4 Anwendungsbereich.
- Die BVL liefert Datumswerte als UTC-Zeitpunkt der Mitternacht deutscher Zeit; für Jahr und Tag wird das berücksichtigt.

## Lokale Entwicklung

```bash
git clone https://github.com/Abbas-Hoseiny/psm-statistik.git
cd psm-statistik
npm install
npm run dev      # http://localhost:4321/
npm run build    # Ausgabe in dist/
npm run preview
```

Deploy: Jeder Push auf `main` baut die Seite per GitHub Actions und veröffentlicht sie über GitHub Pages
unter der eigenen Domain `st.digitale-psm.de`.

## Lizenz

MIT, siehe [LICENSE](LICENSE). Entwickelt von [Abbas Hoseiny](https://hoseiny.de).
