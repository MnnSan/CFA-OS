const fs = require('fs');
const xlsx = require('xlsx');

const filePath = './data/datasets/CFA Level 3 Coding Sheet_2026.xlsx';
const workbook = xlsx.readFile(filePath);

const timings = new Set();
const timingTypes = new Set();

for (const sheetName of ['Common Core', 'Portfolio Management Pathway']) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) continue;
  const rows = xlsx.utils.sheet_to_json(sheet);
  rows.forEach(r => {
    const t = r['Timing'] || r['timing'];
    if (t !== undefined) {
      timings.add(t);
      timingTypes.add(typeof t);
    }
  });
}

console.log('Timing types in sheet:', Array.from(timingTypes));
console.log('Sample timing values (first 20):');
console.log(Array.from(timings).slice(0, 20));
