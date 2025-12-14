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
  
  // bvl_lookup_kultur Sample-Daten - Tabelle hat code und label
  console.log('\n=== bvl_lookup_kultur SAMPLE (code, label) ===');
  const sample = db.exec('SELECT code, label FROM bvl_lookup_kultur LIMIT 15');
  if (sample.length > 0) {
    sample[0].values.forEach(row => console.log(`${row[0]} => ${row[1]}`));
  }
  
  // Count
  const count = db.exec('SELECT COUNT(*) FROM bvl_lookup_kultur');
  console.log('\nAnzahl Einträge:', count[0].values[0][0]);
  
  // Beispiel-Join mit deutschen Namen
  console.log('\n=== TOP 20 KULTUREN MIT DEUTSCHEN NAMEN ===');
  const joinTest = db.exec(`
    SELECT 
      ak.kultur as eppo_code,
      lk.label as deutsch_name,
      COUNT(*) as awg_count
    FROM bvl_awg_kultur ak
    LEFT JOIN bvl_lookup_kultur lk ON ak.kultur = lk.code
    GROUP BY ak.kultur
    ORDER BY awg_count DESC
    LIMIT 20
  `);
  if (joinTest.length > 0) {
    joinTest[0].values.forEach(row => console.log(`${row[0]} => "${row[1]}" (${row[2]} AWG)`));
  }
  
  // Wie viele haben keinen deutschen Namen?
  console.log('\n=== OHNE DEUTSCHEN NAMEN ===');
  const missing = db.exec(`
    SELECT COUNT(DISTINCT ak.kultur) 
    FROM bvl_awg_kultur ak
    LEFT JOIN bvl_lookup_kultur lk ON ak.kultur = lk.code
    WHERE lk.label IS NULL
  `);
  console.log('Kulturen ohne deutschen Namen:', missing[0].values[0][0]);
  
  db.close();
}

main().catch(console.error);
