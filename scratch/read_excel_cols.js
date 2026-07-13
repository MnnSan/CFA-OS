const fs = require('fs');
const xlsx = require('xlsx');

const filePath = './data/datasets/CFA Level 3 Coding Sheet_2026.xlsx';
const workbook = xlsx.readFile(filePath);

for (const sheetName of ['Common Core', 'Portfolio Management Pathway']) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet ${sheetName} not found`);
    continue;
  }
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`\n=== Sheet: ${sheetName} ===`);
  console.log(`Total rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Headers:', Object.keys(rows[0]));
    console.log('Row 0:', rows[0]);
    console.log('Row 1:', rows[1]);
    console.log('Row 2:', rows[2]);
  }
}
