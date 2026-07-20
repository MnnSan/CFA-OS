const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('data/datasets/CFA Level 3 Coding Sheet_2026.xlsx');

for (const name of ['Common Core', 'Portfolio Management Pathway']) {
  const sheet = workbook.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`\n--- Sheet: ${name} (Rows: ${rows.length}) ---`);
  
  let currentReading = null;
  const timingStats = {};
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title = row['Code_1'] || row['code_1'] || row['Code.1'] || row['code.1'];
    const code = row['Name'] || row['name'];
    const timing = row['Timing'] || row['timing'];
    
    if (!title && !code) continue;
    
    const cleanTitle = String(title || '').trim();
    const cleanCode = String(code || '').trim();
    
    if (
      cleanTitle.includes('Soumya') ||
      cleanTitle.includes('Approx total') ||
      cleanTitle.includes('Total') ||
      cleanCode.includes('Ravi') ||
      cleanCode.includes('Name')
    ) {
      continue;
    }
    
    if (row['Reading'] !== undefined) {
      currentReading = String(row['Reading']).trim();
    }
    
    if (!timingStats[currentReading]) {
      timingStats[currentReading] = { count: 0, timings: [], rawTimings: [] };
    }
    
    timingStats[currentReading].count++;
    timingStats[currentReading].rawTimings.push(timing);
  }
  
  for (const rd in timingStats) {
    console.log(`Reading: ${rd} | Classes: ${timingStats[rd].count}`);
    console.log(`  Raw Timings: ${JSON.stringify(timingStats[rd].rawTimings.slice(0, 5))}...`);
  }
}
