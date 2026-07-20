const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('data/datasets/CFA Level 3 Coding Sheet_2026.xlsx');

for (const name of ['Common Core', 'Portfolio Management Pathway']) {
  const sheet = workbook.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`\n================ ${name} ================`);
  
  let currentReading = null;
  
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
    
    // We only care about readings in the prompt:
    // Reading 1.1, 2.1, 2.2, 2.3, 1.2
    const targetReadings = [
      '1.1 - Asset Allocation',
      '1.2 - Capital Market Expectations (both Part 1 and Part 2)',
      '2.1 - Options Strategies',
      '2.2 - Swaps Forwards and Futures Strategies',
      '2.3 - Currency Management: An Introduction'
    ];
    
    if (targetReadings.includes(currentReading)) {
      console.log(`Reading: ${currentReading} | Code: ${cleanCode} | Title: ${cleanTitle} | Timing: ${timing}`);
    }
  }
}
