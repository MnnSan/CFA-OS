import * as fs from 'fs';
import * as path from 'path';
import xlsx from 'xlsx';
import { INITIAL_2027_READINGS, INITIAL_2027_LOS, INITIAL_2027_SUBJECTS } from '../../applications/cfa/curriculum/data/initialCurriculum';
import { READING_MAPPING } from './mappingConfig';
import { LearningResource } from '../types';
import { LectureRepository } from '../../applications/cfa/repositories/LectureRepository';

const { readFile, utils } = xlsx;

// Let's identify the file path of the workbook.
let workbookPath = path.resolve('data/datasets/CFA Level 3 Coding Sheet_2026.xlsx');
if (!fs.existsSync(workbookPath)) {
  workbookPath = path.resolve('data/imports/CFA_Level3_CodingSheet_2026.xlsx');
}
if (!fs.existsSync(workbookPath)) {
  workbookPath = path.resolve('data/imports/CFA Level 3 Coding Sheet_2026.xlsx');
}

console.log(`Using workbook: ${workbookPath}`);

if (!fs.existsSync(workbookPath)) {
  console.error(`Error: Excel workbook not found at ${workbookPath}`);
  process.exit(1);
}

// Helper to parse timings (e.g. 01:26:17, 1:24, 00:52, etc.) to minutes
function parseTimingToMinutes(timing: any): { minutes: number; warning?: string } {
  if (timing === undefined || timing === null || String(timing).trim() === '' || String(timing).toLowerCase() === 'nan') {
    return { minutes: 0 };
  }

  // If it's a number (Excel decimal time fraction)
  if (typeof timing === 'number') {
    if (timing < 1.0) {
      return { minutes: timing * 24 * 60 };
    } else {
      return { minutes: timing };
    }
  }

  // If it's a datetime object or has hour/minute/second fields
  if (typeof timing === 'object') {
    const t = timing as any;
    const h = typeof t.hours === 'number' ? t.hours : (typeof t.hour === 'number' ? t.hour : 0);
    const m = typeof t.minutes === 'number' ? t.minutes : (typeof t.minute === 'number' ? t.minute : 0);
    const s = typeof t.seconds === 'number' ? t.seconds : (typeof t.second === 'number' ? t.second : 0);
    if (h > 0 || m > 0 || s > 0) {
      return { minutes: h * 60 + m + s / 60 };
    }
  }

  const str = String(timing).trim();
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) {
    return { minutes: 0, warning: `Invalid numeric parts in timing string: "${str}"` };
  }

  if (parts.length === 3) {
    // HH:MM:SS
    return { minutes: parts[0] * 60 + parts[1] + parts[2] / 60 };
  } else if (parts.length === 2) {
    // Treat as HH:MM since lectures are longer classes
    return { minutes: parts[0] * 60 + parts[1] };
  } else if (parts.length === 1) {
    return { minutes: parts[0] };
  }

  return { minutes: 0, warning: `Could not parse timing format: "${str}"` };
}

// Helper to extract sub-reading/LOS tag from lecture code
function getSubReadingTag(code: string): string {
  const match = code.match(/\(([a-z])\)/i);
  return match ? match[1].toLowerCase() : '';
}

// Read workbook
const workbook = readFile(workbookPath);
const sheetsToProcess = ['Common Core', 'Portfolio Management Pathway'];

const importedResources: LearningResource[] = [];
const warnings: string[] = [];
const seenLectureCodes = new Set<string>();

let totalRowsProcessed = 0;
let successCount = 0;
let unmappedCount = 0;
let duplicateCodesCount = 0;
let invalidRuntimeCount = 0;
let missingResourceLinksCount = 0;

for (const sheetName of sheetsToProcess) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error(`Sheet "${sheetName}" not found in workbook.`);
    process.exit(1);
  }

  // Parse to JSON rows
  const rows = utils.sheet_to_json<any>(sheet);
  
  let currentCode: any = null;
  let currentSection: any = null;
  let currentReading: any = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check if both Code.1 (Title) and Name (Code) are empty
    // Wait, in xlsx sheet_to_json, Code.1 maps to the Class Name, and Name maps to the lecture code.
    const title = row['Code_1'] || row['code_1'] || row['Code.1'] || row['code.1'];
    const code = row['Name'] || row['name'];
    const timing = row['Timing'] || row['timing'];
    const resourceCell = row['Resources used in class - Hardcopy Book, Spreadsheet links, and PPT links'] || row['Pdf link'] || row['pdf link'];
    const linkDesc = row['Link Description'] || row['link Description'];

    if (!title && !code) {
      continue;
    }

    // Skip helper text rows
    if ((title && (String(title).includes('Soumya') || String(title).includes('Approx total number of hours'))) || (code && String(code).includes('Ravi'))) {
      continue;
    }

    totalRowsProcessed++;

    // Forward fill hierarchical columns
    if (row['Code'] !== undefined) currentCode = row['Code'];
    if (row['Section'] !== undefined) currentSection = row['Section'];
    if (row['Reading'] !== undefined) currentReading = row['Reading'];

    const readingStr = String(currentReading || '').trim();
    const cleanTitle = String(title || '').trim();
    const cleanCode = String(code || '').trim();

    // 1. Resolve Reading ID from explicit mapping config
    let readingId: string | null = null;
    
    if (readingStr.includes('Guidance For Standards') || readingStr.includes('Guidance for Standards')) {
      readingId = 'read-eth-std-1';
    } else {
      readingId = READING_MAPPING[readingStr] || null;
    }

    // Custom split logic for CME Part 1 vs Part 2
    if (readingStr.includes('Capital Market Expectations (both Part 1 and Part 2)')) {
      const codeLower = cleanCode.toLowerCase();
      if (codeLower.includes('1.2(p)') || codeLower.includes('1.2 (p)') || cleanTitle.toLowerCase().includes('part 2')) {
        readingId = 'read-cme-2';
      } else {
        readingId = 'read-cme-1';
      }
    }

    // 2. Validate Reading Mapping
    if (!readingId) {
      unmappedCount++;
      warnings.push(`Row ${i + 2} (${sheetName}): Could not map reading "${readingStr}" to database.`);
      continue;
    }

    const matchedReading = INITIAL_2027_READINGS.find(r => r.id === readingId);
    if (!matchedReading) {
      unmappedCount++;
      warnings.push(`Row ${i + 2} (${sheetName}): Mapped Reading ID "${readingId}" not found in initial curriculum.`);
      continue;
    }

    // 3. Extract Duration/Timing using the new robust helper
    const minutes = LectureRepository.getRuntimeMinutes(cleanCode, timing, readingId);
    if (minutes <= 0 && !(readingId === 'read-deriv-options' && (timing === undefined || timing === null))) {
      invalidRuntimeCount++;
      warnings.push(`Row ${i + 2} (${sheetName}): Lecture "${cleanTitle}" has zero or invalid runtime duration.`);
    }

    // 4. Duplicate checks
    const uniqueKey = `${matchedReading.subjectId}-${readingId}-${cleanCode || cleanTitle}`;
    if (cleanCode && seenLectureCodes.has(cleanCode)) {
      duplicateCodesCount++;
      warnings.push(`Row ${i + 2} (${sheetName}): Duplicate lecture code found: "${cleanCode}"`);
    }
    if (cleanCode) {
      seenLectureCodes.add(cleanCode);
    }

    // 5. Extract resource links
    const resourceLinks: string[] = [];
    if (resourceCell) {
      const urlRegex = /https?:\/\/[^\s\n\r,;]+/g;
      const urls = String(resourceCell).match(urlRegex);
      if (urls) {
        resourceLinks.push(...urls);
      }
    }
    const launchUrl = resourceLinks.length > 0 ? resourceLinks[0] : '';
    if (resourceLinks.length === 0) {
      missingResourceLinksCount++;
      warnings.push(`Row ${i + 2} (${sheetName}): Lecture "${cleanTitle}" has no resource URLs.`);
    }

    // 6. Sub-reading tag and LOS matching
    const subReadingTag = cleanCode ? getSubReadingTag(cleanCode) : '';
    const losIds: string[] = [];
    if (subReadingTag) {
      const readingLOS = INITIAL_2027_LOS.filter(l => l.readingId === readingId);
      const matchedLos = readingLOS.filter(l => l.code.toLowerCase().endsWith('.' + subReadingTag));
      losIds.push(...matchedLos.map(l => l.id));
    }

    // Generate a clean deterministic ID
    const resourceId = `lrs-ssci-${sheetName.toLowerCase().replace(/\s+/g, '-')}-${i}`;

    const resource: LearningResource = {
      id: resourceId,
      provider: 'SSCI',
      resourceType: 'Lecture',
      title: cleanTitle || cleanCode,
      description: `${matchedReading.topicArea || matchedReading.name} Reading ${matchedReading.readingNumber || matchedReading.number} - ${cleanTitle || cleanCode}`,
      readingId,
      losIds,
      duration: minutes,
      launchUrl,
      importMetadata: {
        importedAt: new Date().toISOString(),
        source: 'CFA Level 3 Coding Sheet 2026.xlsx',
        originalId: uniqueKey,
      },
      progress: {
        minutesCompleted: 0,
        completed: false,
        lastOpenedAt: null,
        resumeState: null,
      },
      lectureCode: cleanCode,
      subject: matchedReading.subjectId,
      reading: readingId,
      subReadingTag,
      runtimeMinutes: minutes,
      resourceLinks,
    };

    importedResources.push(resource);
    successCount++;
  }
}

// Create report object
const report = {
  totalRows: totalRowsProcessed,
  mapped: successCount,
  unmapped: unmappedCount,
  duplicates: duplicateCodesCount,
  invalidRuntimes: invalidRuntimeCount,
  missingLinks: missingResourceLinksCount,
  warnings,
};

// Ensure output directories exist
const outputDir = path.resolve('src/resources/data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write generated files
fs.writeFileSync(path.join(outputDir, 'learningResources.json'), JSON.stringify(importedResources, null, 2), 'utf-8');
fs.writeFileSync(path.join(outputDir, 'migration-report.json'), JSON.stringify(report, null, 2), 'utf-8');

console.log('\n================ MIGRATION COMPLETE ================');
console.log(`Total Rows Processed: ${report.totalRows}`);
console.log(`Mapped: ${report.mapped}`);
console.log(`Unmapped: ${report.unmapped}`);
console.log(`Duplicate Codes: ${report.duplicates}`);
console.log(`Invalid Runtimes: ${report.invalidRuntimes}`);
console.log(`Missing Links: ${report.missingLinks}`);
console.log(`Warnings Count: ${report.warnings.length}`);
console.log('====================================================\n');

if (report.unmapped > 0) {
  console.error(`Migration failed: ${report.unmapped} lectures could not be mapped.`);
  process.exit(1);
} else {
  console.log('Migration succeeded with 0 unmapped lectures!');
  process.exit(0);
}
