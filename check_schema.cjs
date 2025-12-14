const initSqlJs = require('sql.js');
const fs = require('fs');
const https = require('https');
const zlib = require('zlib');

async function main() {
  // Download und entpacke die DB
  const zipUrl = 'https://abbas-hoseiny.github.io/pflanzenschutz-db/pflanzenschutz.sqlite.zip';
  
  console.log('Lade Datenbank...');
  
  const response = await new Promise((resolve, reject) => {
    https.get(zipUrl, resolve).on('error', reject);
  });
  
  const chunks = [];
  for await (const chunk of response) {
    chunks.push(chunk);
  }
  const zipBuffer = Buffer.concat(chunks);
  
  // Einfaches ZIP-Parsing
  const fileNameLength = zipBuffer.readUInt16LE(26);
  const extraFieldLength = zipBuffer.readUInt16LE(28);
  const dataOffset = 30 + fileNameLength + extraFieldLength;
  const compressionMethod = zipBuffer.readUInt16LE(8);
  const compressedSize = zipBuffer.readUInt32LE(18);
  
  let dbBuffer;
  if (compressionMethod === 0) {
    dbBuffer = zipBuffer.slice(dataOffset, dataOffset + compressedSize);
  } else {
    dbBuffer = zlib.inflateRawSync(zipBuffer.slice(dataOffset, dataOffset + compressedSize));
  }
  
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBuffer);
  
  // Alle Tabellen auflisten
  console.log('\n=== ALLE TABELLEN ===');
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  tables[0].values.forEach(t => console.log(t[0]));
  
  // Suche nach Kultur-relevanten Tabellen
  console.log('\n=== KULTUR-TABELLEN SCHEMA ===');
  
  const kulturTables = ['bvl_kultur', 'bvl_kultur_gruppe', 'bvl_awg_kultur'];
  for (const table of kulturTables) {
    try {
      const schema = db.exec(`PRAGMA table_info(${table})`);
      if (schema.length > 0) {
        console.log(`\n${table}:`);
        schema[0].values.forEach(col => console.log(`  - ${col[1]} (${col[2]})`));
        
        // Sample-Daten
        const sample = db.exec(`SELECT * FROM ${table} LIMIT 3`);
        if (sample.length > 0) {
          console.log(`  Sample: ${JSON.stringify(sample[0].values.slice(0, 3))}`);
        }
      }
    } catch (e) {
      console.log(`${table}: nicht gefunden`);
    }
  }
  
  // Suche nach Tabellen mit "name" oder "bezeichnung"
  console.log('\n=== SUCHE NACH DEUTSCHEN NAMEN ===');
  const allTables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  for (const [tableName] of allTables[0].values) {
    const cols = db.exec(`PRAGMA table_info(${tableName})`);
    const colNames = cols[0].values.map(c => c[1].toLowerCase());
    if (colNames.some(c => c.includes('name') || c.includes('bezeichnung') || c.includes('deutsch'))) {
      console.log(`\n${tableName} hat Name-Spalten:`);
      cols[0].values.forEach(col => console.log(`  - ${col[1]}`));
    }
  }
  
  db.close();
}

main().catch(console.error);
