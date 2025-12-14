/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface Window {
  db: import("sql.js").Database | null;
  dbReady: Promise<import("sql.js").Database>;
}
