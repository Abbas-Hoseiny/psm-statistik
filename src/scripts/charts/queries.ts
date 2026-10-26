/**
 * SQL-Queries für PSM Statistik
 * Vordefinierte Abfragen für Dashboard-Visualisierungen
 *
 * Grundregeln (Stand der BVL-Daten, geprüft 10/2026):
 * - Kulturen und Schaderreger mit ausgenommen = 'J' sind Ausnahmen innerhalb eines
 *   Anwendungsgebiets (AWG) und zählen nicht als Anwendung.
 * - Codes werden über die BVL-Kodelisten in deutsche Namen übersetzt:
 *   948 = Kulturen/Objekte, 947 = Schadorganismen, 4 = Anwendungsbereich.
 * - Mittel-Zählungen beziehen sich auf heute zugelassene Mittel (bvl_mittel).
 * - Datumswerte liefert die BVL als UTC-Zeitpunkt der Mitternacht deutscher Zeit
 *   (22:00Z/23:00Z am Vortag); '+12 hours' ergibt den richtigen Kalendertag.
 */
import { query, queryOne, formatBvlDate } from "../db";

const YEAR = (col: string) => `strftime('%Y', ${col}, '+12 hours')`;

/** Kulturgruppen; die Pipeline füllte die Spalte gruppe zeitweise nicht, daher Rückfall auf payload_json */
export const KULTUR_GRUPPEN_CTE = `
  gruppen AS (
    SELECT DISTINCT
      COALESCE(gruppe, json_extract(payload_json, '$.kultur_gruppe')) AS gruppe,
      kultur
    FROM bvl_kultur_gruppe
  ),
  mitglied AS (
    SELECT gruppe, kultur FROM gruppen
    UNION
    SELECT DISTINCT gruppe, gruppe FROM gruppen
  )`;

/** Oberbegriff „Kultur / Objekt“ ohne eigene Aussage */
export const KULTUR_GRUPPE_OBERBEGRIFF = "XXXXX";

// ═══════════════════════════════════════════════════════════════════════════
// ÜBERSICHTS-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface OverviewStats {
  totalMittel: number;
  totalWirkstoffe: number;
  totalAwg: number;
  totalKulturen: number;
  totalSchadorg: number;
  lastUpdate: string;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const [mittel, wirkstoffe, awg, kulturen, schadorg, stand] =
    await Promise.all([
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM bvl_mittel"),
      queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM bvl_wirkstoff"
      ),
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM bvl_awg"),
      queryOne<{ count: number }>(
        "SELECT COUNT(DISTINCT kultur) as count FROM bvl_awg_kultur WHERE ausgenommen = 'N'"
      ),
      queryOne<{ count: number }>(
        "SELECT COUNT(DISTINCT schadorg) as count FROM bvl_awg_schadorg WHERE ausgenommen = 'N'"
      ),
      queryOne<{ stand: string }>("SELECT stand FROM bvl_stand LIMIT 1"),
    ]);

  return {
    totalMittel: mittel?.count ?? 0,
    totalWirkstoffe: wirkstoffe?.count ?? 0,
    totalAwg: awg?.count ?? 0,
    totalKulturen: kulturen?.count ?? 0,
    totalSchadorg: schadorg?.count ?? 0,
    lastUpdate: formatBvlDate(stand?.stand),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WIRKSTOFF-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface WirkstoffKategorie {
  kategorie: string;
  anzahl: number;
}

export async function getWirkstoffeNachKategorie(): Promise<
  WirkstoffKategorie[]
> {
  return query<WirkstoffKategorie>(`
    SELECT 
      COALESCE(kategorie, 'Unbekannt') as kategorie,
      COUNT(*) as anzahl
    FROM bvl_wirkstoff
    GROUP BY kategorie
    ORDER BY anzahl DESC
  `);
}

export interface TopWirkstoff {
  wirkstoffname: string;
  anzahl_produkte: number;
}

/** Wirkstoffe nach Anzahl heute zugelassener Mittel */
export async function getTopWirkstoffe(limit = 15): Promise<TopWirkstoff[]> {
  return query<TopWirkstoff>(
    `
    SELECT 
      w.wirkstoffname,
      COUNT(DISTINCT m.kennr) as anzahl_produkte
    FROM bvl_wirkstoff w
    JOIN bvl_wirkstoff_gehalt g ON w.wirknr = g.wirknr
    JOIN bvl_mittel m ON m.kennr = g.kennr
    GROUP BY w.wirknr, w.wirkstoffname
    ORDER BY anzahl_produkte DESC
    LIMIT ?
  `,
    [limit]
  );
}

export interface WirkstoffRow {
  wirknr: string;
  wirkstoffname: string;
  kategorie: string | null;
  genehmigt: string | null;
  produkte: number;
}

export async function getWirkstoffTabelle(): Promise<WirkstoffRow[]> {
  return query<WirkstoffRow>(`
    SELECT 
      w.wirknr,
      w.wirkstoffname,
      w.kategorie,
      w.genehmigt,
      COUNT(DISTINCT m.kennr) as produkte
    FROM bvl_wirkstoff w
    LEFT JOIN bvl_wirkstoff_gehalt g ON w.wirknr = g.wirknr
    LEFT JOIN bvl_mittel m ON m.kennr = g.kennr
    GROUP BY w.wirknr
    ORDER BY produkte DESC, w.wirkstoffname
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// KULTUR-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface TopKultur {
  kultur: string;
  anzahl_awg: number;
}

/** Kulturen nach Anzahl Anwendungsgebiete, mit deutschem Namen */
export async function getTopKulturen(limit = 20): Promise<TopKultur[]> {
  return query<TopKultur>(
    `
    SELECT 
      COALESCE(kd.kodetext, k.kultur) as kultur,
      k.anzahl_awg
    FROM (
      SELECT kultur, COUNT(DISTINCT awg_id) as anzahl_awg
      FROM bvl_awg_kultur
      WHERE ausgenommen = 'N'
      GROUP BY kultur
      ORDER BY anzahl_awg DESC
      LIMIT ?
    ) k
    LEFT JOIN bvl_kode kd ON kd.kode = k.kultur AND kd.kodeliste = 948 AND kd.sprache = 'DE'
    ORDER BY k.anzahl_awg DESC
  `,
    [limit]
  );
}

export interface KulturRow {
  kultur_code: string;
  kultur_name: string;
  gruppen: string | null;
  awg_count: number;
}

/** Alle Kulturen mit Anzahl Anwendungsgebiete und ihren Kulturgruppen (ohne Doppelzählung) */
export async function getKulturenDetail(): Promise<KulturRow[]> {
  return query<KulturRow>(`
    WITH ${KULTUR_GRUPPEN_CTE},
    basis AS (
      SELECT kultur, COUNT(DISTINCT awg_id) AS awg_count
      FROM bvl_awg_kultur
      WHERE ausgenommen = 'N'
      GROUP BY kultur
    )
    SELECT 
      b.kultur AS kultur_code,
      COALESCE(kd.kodetext, b.kultur) AS kultur_name,
      (
        SELECT GROUP_CONCAT(name, ' · ') FROM (
          SELECT DISTINCT COALESCE(gk.kodetext, g.gruppe) AS name
          FROM gruppen g
          LEFT JOIN bvl_kode gk ON gk.kode = g.gruppe AND gk.kodeliste = 948 AND gk.sprache = 'DE'
          WHERE g.kultur = b.kultur AND g.gruppe IS NOT NULL AND g.gruppe <> '${KULTUR_GRUPPE_OBERBEGRIFF}'
          ORDER BY name
        )
      ) AS gruppen,
      b.awg_count
    FROM basis b
    LEFT JOIN bvl_kode kd ON kd.kode = b.kultur AND kd.kodeliste = 948 AND kd.sprache = 'DE'
    ORDER BY b.awg_count DESC
  `);
}

export interface GruppeAnzahl {
  gruppe: string;
  anzahl: number;
}

/** Kulturgruppen nach Anzahl Anwendungsgebiete; eine Kultur kann mehreren Gruppen angehören */
export async function getKulturGruppen(limit = 10): Promise<GruppeAnzahl[]> {
  return query<GruppeAnzahl>(
    `
    WITH ${KULTUR_GRUPPEN_CTE}
    SELECT 
      COALESCE(kd.kodetext, m.gruppe) AS gruppe,
      COUNT(DISTINCT ak.awg_id) AS anzahl
    FROM bvl_awg_kultur ak
    JOIN mitglied m ON m.kultur = ak.kultur
    LEFT JOIN bvl_kode kd ON kd.kode = m.gruppe AND kd.kodeliste = 948 AND kd.sprache = 'DE'
    WHERE ak.ausgenommen = 'N'
      AND m.gruppe IS NOT NULL
      AND m.gruppe <> '${KULTUR_GRUPPE_OBERBEGRIFF}'
    GROUP BY m.gruppe
    ORDER BY anzahl DESC
    LIMIT ?
  `,
    [limit]
  );
}

export interface KulturMittel {
  kultur: string;
  anzahl: number;
}

/** Kulturen nach Anzahl heute zugelassener Mittel */
export async function getMittelJeKultur(limit = 10): Promise<KulturMittel[]> {
  return query<KulturMittel>(
    `
    SELECT 
      COALESCE(kd.kodetext, k.kultur) AS kultur,
      k.anzahl
    FROM (
      SELECT ak.kultur, COUNT(DISTINCT a.kennr) AS anzahl
      FROM bvl_awg_kultur ak
      JOIN bvl_awg a ON a.awg_id = ak.awg_id
      JOIN bvl_mittel m ON m.kennr = a.kennr
      WHERE ak.ausgenommen = 'N'
      GROUP BY ak.kultur
      ORDER BY anzahl DESC
      LIMIT ?
    ) k
    LEFT JOIN bvl_kode kd ON kd.kode = k.kultur AND kd.kodeliste = 948 AND kd.sprache = 'DE'
    ORDER BY k.anzahl DESC
  `,
    [limit]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHADORGANISMUS-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface TopSchadorg {
  schadorg: string;
  anzahl_awg: number;
}

export async function getTopSchadorganismen(
  limit = 20
): Promise<TopSchadorg[]> {
  return query<TopSchadorg>(
    `
    SELECT 
      COALESCE(kd.kodetext, s.schadorg) as schadorg,
      s.anzahl_awg
    FROM (
      SELECT schadorg, COUNT(DISTINCT awg_id) as anzahl_awg
      FROM bvl_awg_schadorg
      WHERE ausgenommen = 'N'
      GROUP BY schadorg
      ORDER BY anzahl_awg DESC
      LIMIT ?
    ) s
    LEFT JOIN bvl_kode kd ON kd.kode = s.schadorg AND kd.kodeliste = 947 AND kd.sprache = 'DE'
    ORDER BY s.anzahl_awg DESC
  `,
    [limit]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE / ZULASSUNGS-STATISTIKEN
// Die BVL-Datenbank enthält nur heute zugelassene Mittel.
// ═══════════════════════════════════════════════════════════════════════════

export interface ZulassungProJahr {
  jahr: string;
  anzahl: number;
}

/** Erstzulassungsjahr der heute zugelassenen Mittel */
export async function getZulassungenProJahr(): Promise<ZulassungProJahr[]> {
  return query<ZulassungProJahr>(`
    SELECT 
      ${YEAR("zul_erstmalig_am")} as jahr,
      COUNT(*) as anzahl
    FROM bvl_mittel
    WHERE zul_erstmalig_am IS NOT NULL
      AND zul_erstmalig_am != ''
    GROUP BY jahr
    HAVING jahr >= '2000'
    ORDER BY jahr ASC
  `);
}

export interface AblaufProJahr {
  jahr: string;
  anzahl: number;
}

/** Zulassungsende der heute zugelassenen Mittel in den nächsten zehn Jahren */
export async function getAblaufendeZulassungen(): Promise<AblaufProJahr[]> {
  return query<AblaufProJahr>(`
    SELECT 
      ${YEAR("zul_ende")} as jahr,
      COUNT(*) as anzahl
    FROM bvl_mittel
    WHERE zul_ende IS NOT NULL
      AND zul_ende != ''
      AND date(zul_ende, '+12 hours') >= date('now')
      AND ${YEAR("zul_ende")} <= strftime('%Y', date('now', '+10 years'))
    GROUP BY jahr
    ORDER BY jahr ASC
  `);
}

export interface BestandJahr {
  jahr: string;
  neu: number;
  ende: number;
}

/** Erstzulassungen und Zulassungsende je Jahr; dazu die Zahl vor 2000 als Startwert */
export async function getBestandVerlauf(): Promise<{
  basis: number;
  jahre: BestandJahr[];
}> {
  const basis = await queryOne<{ anzahl: number }>(`
    SELECT COUNT(*) AS anzahl FROM bvl_mittel
    WHERE ${YEAR("zul_erstmalig_am")} < '2000'
  `);
  const jahre = await query<BestandJahr>(`
    WITH jahre AS (
      SELECT DISTINCT ${YEAR("zul_erstmalig_am")} AS jahr FROM bvl_mittel
      WHERE zul_erstmalig_am IS NOT NULL AND ${YEAR("zul_erstmalig_am")} >= '2000'
      UNION
      SELECT DISTINCT ${YEAR("zul_ende")} AS jahr FROM bvl_mittel
      WHERE zul_ende IS NOT NULL AND ${YEAR("zul_ende")} >= '2000'
    )
    SELECT 
      j.jahr,
      (SELECT COUNT(*) FROM bvl_mittel WHERE ${YEAR("zul_erstmalig_am")} = j.jahr) AS neu,
      (SELECT COUNT(*) FROM bvl_mittel WHERE ${YEAR("zul_ende")} = j.jahr) AS ende
    FROM jahre j
    WHERE j.jahr IS NOT NULL
    ORDER BY j.jahr ASC
  `);
  return { basis: basis?.anzahl ?? 0, jahre };
}

// ═══════════════════════════════════════════════════════════════════════════
// ANWENDUNGSBEREICH-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface Anwendungsbereich {
  anwendungsbereich: string;
  anzahl: number;
}

/** Anwendungsbereiche mit deutschem Namen; kleine Bereiche als „Sonstige“ zusammengefasst */
export async function getAnwendungsbereiche(top = 6): Promise<Anwendungsbereich[]> {
  const rows = await query<Anwendungsbereich>(`
    SELECT 
      COALESCE(kd.kodetext, a.anwendungsbereich, 'Unbekannt') as anwendungsbereich,
      COUNT(*) as anzahl
    FROM bvl_awg a
    LEFT JOIN bvl_kode kd ON kd.kode = a.anwendungsbereich AND kd.kodeliste = 4 AND kd.sprache = 'DE'
    GROUP BY a.anwendungsbereich
    ORDER BY anzahl DESC
  `);
  if (rows.length <= top + 1) return rows;
  const rest = rows.slice(top).reduce((sum, r) => sum + r.anzahl, 0);
  return [...rows.slice(0, top), { anwendungsbereich: "Sonstige", anzahl: rest }];
}

// ═══════════════════════════════════════════════════════════════════════════
// AUFWANDMENGEN-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface AufwandEinheit {
  einheit: string;
  anzahl: number;
  avg_aufwand: number;
}

export async function getAufwandNachEinheit(): Promise<AufwandEinheit[]> {
  return query<AufwandEinheit>(`
    SELECT 
      COALESCE(kd.kodetext, a.m_aufwand_einheit) as einheit,
      COUNT(*) as anzahl,
      ROUND(AVG(a.m_aufwand), 2) as avg_aufwand
    FROM bvl_awg_aufwand a
    LEFT JOIN bvl_kode kd ON kd.kode = a.m_aufwand_einheit AND kd.kodeliste = 25 AND kd.sprache = 'DE'
    WHERE a.m_aufwand_einheit IS NOT NULL
      AND a.m_aufwand_einheit != ''
    GROUP BY a.m_aufwand_einheit
    ORDER BY anzahl DESC
    LIMIT 10
  `);
}
