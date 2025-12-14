/**
 * SQL-Queries für PSM Statistik
 * Vordefinierte Abfragen für Dashboard-Visualisierungen
 */
import { query, queryOne } from "../db";

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
        "SELECT COUNT(DISTINCT kultur) as count FROM bvl_awg_kultur"
      ),
      queryOne<{ count: number }>(
        "SELECT COUNT(DISTINCT schadorg) as count FROM bvl_awg_schadorg"
      ),
      queryOne<{ stand: string }>("SELECT stand FROM bvl_stand LIMIT 1"),
    ]);

  return {
    totalMittel: mittel?.count ?? 0,
    totalWirkstoffe: wirkstoffe?.count ?? 0,
    totalAwg: awg?.count ?? 0,
    totalKulturen: kulturen?.count ?? 0,
    totalSchadorg: schadorg?.count ?? 0,
    lastUpdate: stand?.stand ?? "Unbekannt",
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

export async function getTopWirkstoffe(limit = 15): Promise<TopWirkstoff[]> {
  return query<TopWirkstoff>(
    `
    SELECT 
      w.wirkstoffname,
      COUNT(DISTINCT g.kennr) as anzahl_produkte
    FROM bvl_wirkstoff w
    JOIN bvl_wirkstoff_gehalt g ON w.wirknr = g.wirknr
    GROUP BY w.wirknr, w.wirkstoffname
    ORDER BY anzahl_produkte DESC
    LIMIT ?
  `,
    [limit]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KULTUR-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface TopKultur {
  kultur: string;
  anzahl_awg: number;
}

export async function getTopKulturen(limit = 20): Promise<TopKultur[]> {
  return query<TopKultur>(
    `
    SELECT 
      kultur,
      COUNT(*) as anzahl_awg
    FROM bvl_awg_kultur
    GROUP BY kultur
    ORDER BY anzahl_awg DESC
    LIMIT ?
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
      schadorg,
      COUNT(*) as anzahl_awg
    FROM bvl_awg_schadorg
    GROUP BY schadorg
    ORDER BY anzahl_awg DESC
    LIMIT ?
  `,
    [limit]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE / ZULASSUNGS-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface ZulassungProJahr {
  jahr: string;
  anzahl: number;
}

export async function getZulassungenProJahr(): Promise<ZulassungProJahr[]> {
  return query<ZulassungProJahr>(`
    SELECT 
      strftime('%Y', zul_erstmalig_am) as jahr,
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

export async function getAblaufendeZulassungen(): Promise<AblaufProJahr[]> {
  return query<AblaufProJahr>(`
    SELECT 
      strftime('%Y', zul_ende) as jahr,
      COUNT(*) as anzahl
    FROM bvl_mittel
    WHERE zul_ende IS NOT NULL
      AND zul_ende != ''
      AND zul_ende >= date('now')
    GROUP BY jahr
    ORDER BY jahr ASC
    LIMIT 10
  `);
}

// ═══════════════════════════════════════════════════════════════════════════
// ANWENDUNGSBEREICH-STATISTIKEN
// ═══════════════════════════════════════════════════════════════════════════

export interface Anwendungsbereich {
  anwendungsbereich: string;
  anzahl: number;
}

export async function getAnwendungsbereiche(): Promise<Anwendungsbereich[]> {
  return query<Anwendungsbereich>(`
    SELECT 
      COALESCE(anwendungsbereich, 'Unbekannt') as anwendungsbereich,
      COUNT(*) as anzahl
    FROM bvl_awg
    GROUP BY anwendungsbereich
    ORDER BY anzahl DESC
    LIMIT 10
  `);
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
      m_aufwand_einheit as einheit,
      COUNT(*) as anzahl,
      ROUND(AVG(m_aufwand), 2) as avg_aufwand
    FROM bvl_awg_aufwand
    WHERE m_aufwand_einheit IS NOT NULL
      AND m_aufwand_einheit != ''
    GROUP BY m_aufwand_einheit
    ORDER BY anzahl DESC
    LIMIT 10
  `);
}
