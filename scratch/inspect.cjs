const XLSX = require('xlsx');
const filePath = 'data/datasets/CFA Level 3 Coding Sheet_2026.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  const sections = new Set();
  const readings = new Set();
  data.forEach(row => {
    sections.add(row['Section']);
    readings.add(row['Reading']);
  });
  console.log('Unique Sections:', Array.from(sections));
  console.log('Unique Readings:', Array.from(readings));
} catch (err) {
  console.error('Error:', err);
}
