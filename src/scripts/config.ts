/**
 * BVL Database Configuration
 * Zentrale Konfiguration für Datenbank-URLs
 */

export const DB_CONFIG = {
  // Primäre Quelle: pflanzenschutz-db Repository
  PRIMARY_URL:
    "https://abbas-hoseiny.github.io/pflanzenschutz-db/pflanzenschutz.sqlite.br",

  // Fallback: ZIP-Version (größer, aber breiter kompatibel)
  FALLBACK_URL:
    "https://abbas-hoseiny.github.io/pflanzenschutz-db/pflanzenschutz.sqlite.zip",

  // Manifest für Metadaten
  MANIFEST_URL:
    "https://abbas-hoseiny.github.io/pflanzenschutz-db/manifest.json",

  // SQL.js WASM
  SQLJS_WASM_URL: "https://sql.js.org/dist/sql-wasm.wasm",

  // Cache-Key für IndexedDB
  CACHE_KEY: "psm-statistik-db",

  // Cache-Dauer in Millisekunden (24 Stunden)
  CACHE_DURATION: 24 * 60 * 60 * 1000,
} as const;

/**
 * Manifest-Typ aus pflanzenschutz-db
 */
export interface DbManifest {
  version: string;
  api_version: string;
  generated_at: string;
  files: {
    name: string;
    url: string;
    size: number;
    sha256: string;
    encoding: string;
    type: string;
  }[];
  tables: Record<string, number>;
  build: {
    start_time: string;
    end_time: string;
    duration_seconds: number;
  };
}
