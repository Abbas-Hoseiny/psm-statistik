const initSqlJs = require('sql.js');
const https = require('https');
const zlib = require('zlib');

async function main() {
  const zipUrl = 'https://abbas-hoseiny.github.io/pflanzenschutz-db/pflanzenschutz.sqlite.zip';
  
  console.log('Lade Datenbank...');
  
  const response = await new Promise((resolve, reject) => {
    https.get(zipUrl, resolve).on('error', reject);
  });
  
  const chunks = [];
  for await (const chunk of response) chunks.push(chunk);
  const zipBuffer = Buffer.concat(chunks);
  
  const fileNameLength = zipBuffer.readUInt16LE(26);
  const extraFieldLength = zipBuffer.readUInt16LE(28);
  const dataOffset = 30 + fileNameLength + extraFieldLength;
  const compressionMethod = zipBuffer.readUInt16LE(8);
  const compressedSize = zipBuffer.readUInt32LE(18);
  
  let dbBuffer = compressionMethod === 0 
    ? zipBuffer.slice(dataOffset, dataOffset + compressedSize)
    : zlib.inflateRawSync(zipBuffer.slice(dataOffset, dataOffset + compressedSize));
  
  const SQL = await initSqlJs();
  const db = new SQL.Database(dbBuffer);
  
  // bvl_lookup_kultur Schema
  console.log('\n=== bvl_lookup_kultur SCHEMA ===');
  const schema = db.exec('PRAGMA table_info(bvl_lookup_kultur)');
  schema[0].values.forEach(col => console.log(`  - ${col[1]} (${col[2]})`));
  
  // Sample-Daten
  console.log('\n=== bvl_lookup_kultur SAMPLE ===');
  const sample = db.exec('SELECT * FROM bvl_lookup_kultur LIMIT 10');
  console.log('Spalten:', sample[0].columns.join(', '));
  sample[0].values.forEach(row => console.log(row));
  
  // Count
  const count = db.exec('SELECT COUNT(*) FROM bvl_lookup_kultur');
  console.log('\nAnzahl Einträge:', count[0].values[0][0]);
  
  // Beispiel-Join mit deutschen Namen
  console.log('\n=== JOIN MIT DEUTSCHEN NAMEN ===');
  const joinTest = db.exec(`
    SELECT 
      ak.kultur as eppo_code,
      lk.kultur as deutsch_name,
      COUNT(*) as awg_count
    FROM bvl_awg_kultur ak
    LEFT JOIN bvl_lookup_kultur lk ON ak.kultur = lk.kode
    GROUP BY ak.kultur
    ORDER BY awg_count DESC
    LIMIT 15
  `);
  console.log('Spalten:', joinTest[0].columns.join(', '));
  joinTest[0].values.forEach(row => console.log(row));
  
  db.close();
}

main().catch(console.error);
