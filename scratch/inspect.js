const XLSX = require('xlsx');
const filePath = 'data/datasets/CFA Level 3 Coding Sheet_2026.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log('Columns:', Object.keys(data[0]));
  console.log('Row 1:', JSON.stringify(data[0], null, 2));
  console.log('Row 2:', JSON.stringify(data[1], null, 2));
  console.log('Row 3:', JSON.stringify(data[2], null, 2));
} catch (err) {
  console.error('Error:', err);
}
