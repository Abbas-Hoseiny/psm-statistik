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
  
  // bvl_kode Schema
  console.log('\n=== bvl_kode SCHEMA ===');
  const schema = db.exec('PRAGMA table_info(bvl_kode)');
  schema[0].values.forEach(col => console.log(`  - ${col[1]} (${col[2]})`));
  
  // bvl_kodeliste Schema  
  console.log('\n=== bvl_kodeliste SCHEMA ===');
  const schema2 = db.exec('PRAGMA table_info(bvl_kodeliste)');
  schema2[0].values.forEach(col => console.log(`  - ${col[1]} (${col[2]})`));
  
  // Welche Kodelisten gibt es?
  console.log('\n=== KODELISTEN ===');
  const lists = db.exec('SELECT kodeliste_nr, kodeliste_name FROM bvl_kodeliste ORDER BY kodeliste_nr');
  if (lists.length > 0) {
    lists[0].values.forEach(row => console.log(`${row[0]}: ${row[1]}`));
  }
  
  // Suche nach Kultur-Kodes
  console.log('\n=== SUCHE NACH KULTUR-KODELISTE ===');
  const kulturList = db.exec("SELECT * FROM bvl_kodeliste WHERE kodeliste_name LIKE '%kultur%' OR kodeliste_name LIKE '%EPPO%'");
  if (kulturList.length > 0) {
    console.log(kulturList[0].values);
  } else {
    console.log('Keine Kultur-Kodeliste gefunden');
  }
  
  // Sample aus bvl_kode
  console.log('\n=== bvl_kode SAMPLE ===');
  const kodeSample = db.exec('SELECT * FROM bvl_kode LIMIT 10');
  if (kodeSample.length > 0) {
    console.log('Spalten:', kodeSample[0].columns.join(', '));
    kodeSample[0].values.forEach(row => console.log(row));
  }
  
  // Suche Kultur-Kodes in bvl_kode
  console.log('\n=== KULTUR-KODES (z.B. TRZAW) ===');
  const kulturKodes = db.exec("SELECT * FROM bvl_kode WHERE kode IN ('TRZAW', 'SOLTU', 'VITVI', 'HORVX') LIMIT 10");
  if (kulturKodes.length > 0) {
    console.log('Spalten:', kulturKodes[0].columns.join(', '));
    kulturKodes[0].values.forEach(row => console.log(row));
  } else {
    console.log('Keine Kultur-Kodes in bvl_kode gefunden');
  }
  
  db.close();
}

main().catch(console.error);
