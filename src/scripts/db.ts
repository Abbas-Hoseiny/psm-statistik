/**
 * Database Loader
 * Lädt die BVL SQLite-Datenbank
 */
import { DB_CONFIG, type DbManifest } from "./config";

// SQL.js Types
type SqlJsStatic = {
  Database: new (data?: ArrayLike<number>) => Database;
};

interface Database {
  exec(sql: string): QueryExecResult[];
  prepare(sql: string): Statement;
  close(): void;
}

interface QueryExecResult {
  columns: string[];
  values: unknown[][];
}

interface Statement {
  bind(params?: unknown[]): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}

let dbInstance: Database | null = null;
let dbPromise: Promise<Database> | null = null;

/**
 * Lädt SQL.js von CDN
 */
async function loadSqlJs(): Promise<
  (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>
> {
  return new Promise((resolve, reject) => {
    if ((window as any).initSqlJs) {
      resolve((window as any).initSqlJs);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sql.js.org/dist/sql-wasm.js";
    script.onload = () => {
      if ((window as any).initSqlJs) {
        resolve((window as any).initSqlJs);
      } else {
        reject(new Error("SQL.js konnte nicht geladen werden"));
      }
    };
    script.onerror = () => reject(new Error("SQL.js Script-Ladefehler"));
    document.head.appendChild(script);
  });
}

/**
 * Lädt die Datenbank von der Remote-URL (ZIP-Version)
 */
async function fetchDatabase(): Promise<ArrayBuffer> {
  console.log("[DB] Lade Datenbank von:", DB_CONFIG.FALLBACK_URL);
  const startTime = performance.now();

  const response = await fetch(DB_CONFIG.FALLBACK_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const zipBuffer = await response.arrayBuffer();
  const downloadDuration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(
    `[DB] ZIP heruntergeladen: ${(zipBuffer.byteLength / 1024 / 1024).toFixed(2)} MB in ${downloadDuration}s`
  );

  // ZIP entpacken
  const view = new DataView(zipBuffer);

  // Lokaler File-Header Signatur: 0x04034b50
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error("Ungültiges ZIP-Format");
  }

  const compressionMethod = view.getUint16(8, true);
  const compressedSize = view.getUint32(18, true);
  const fileNameLength = view.getUint16(26, true);
  const extraFieldLength = view.getUint16(28, true);
  const dataOffset = 30 + fileNameLength + extraFieldLength;
  const compressedData = new Uint8Array(zipBuffer, dataOffset, compressedSize);

  if (compressionMethod === 0) {
    // Keine Kompression (STORE)
    console.log("[DB] ZIP (STORE) entpackt");
    return compressedData.buffer;
  } else if (compressionMethod === 8) {
    // DEFLATE
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(compressedData);
    writer.close();

    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.length;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(
      `[DB] ZIP (DEFLATE) entpackt: ${(totalLength / 1024 / 1024).toFixed(2)} MB`
    );
    return result.buffer;
  }

  throw new Error(`Unbekannte Komprimierungsmethode: ${compressionMethod}`);
}

/**
 * Initialisiert SQL.js und lädt die Datenbank
 */
export async function initDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    console.log("[DB] Initialisiere SQL.js...");

    const initSqlJs = (window as any).initSqlJs || (await loadSqlJs());

    const SQL: SqlJsStatic = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });

    const dbBuffer = await fetchDatabase();

    dbInstance = new SQL.Database(new Uint8Array(dbBuffer));

    const testResult = dbInstance.exec("SELECT COUNT(*) FROM bvl_mittel");
    const count = testResult[0]?.values[0]?.[0] ?? 0;
    console.log(`[DB] Verbunden! ${count} Mittel in der Datenbank.`);

    return dbInstance;
  })();

  return dbPromise;
}

/**
 * Führt eine SQL-Abfrage aus
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = await initDatabase();

  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }

    const results: T[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row as T);
    }
    stmt.free();

    return results;
  } catch (error) {
    console.error("[DB] Query-Fehler:", error);
    throw error;
  }
}

/**
 * Führt eine SQL-Abfrage aus und gibt das erste Ergebnis zurück
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results[0] ?? null;
}

/**
 * Lädt das Manifest mit Metadaten
 */
export async function fetchManifest(): Promise<DbManifest | null> {
  try {
    const response = await fetch(DB_CONFIG.MANIFEST_URL);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
