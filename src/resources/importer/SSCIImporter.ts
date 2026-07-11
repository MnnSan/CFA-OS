import { LearningResource } from '../types';
import { ResourceImporter, ImportResult } from './types';
import { READING_MAPPING } from '../migration/mappingConfig';
import { INITIAL_2027_READINGS, INITIAL_2027_LOS } from '../../applications/cfa/curriculum/data/initialCurriculum';

const DYNAMIC_IMPORT_KEY = 'cfa_ssci_import_completed';

function parseTimingToMinutes(str: any): { minutes: number; warning?: string } {
  if (!str) return { minutes: 0 };
  const s = String(str).trim();
  if (s.toLowerCase().includes('hr') || s.toLowerCase().includes('hour')) {
    const num = parseFloat(s);
    return { minutes: isNaN(num) ? 0 : num * 60 };
  }
  if (s.toLowerCase().includes('min')) {
    const num = parseFloat(s);
    return { minutes: isNaN(num) ? 0 : num };
  }

  const parts = s.split(':').map(Number).filter(n => !isNaN(n));
  if (parts.length === 3) {
    return { minutes: parts[0] * 60 + parts[1] + parts[2] / 60 };
  } else if (parts.length === 2) {
    return { minutes: parts[0] * 60 + parts[1] };
  } else if (parts.length === 1) {
    return { minutes: parts[0] };
  }

  return { minutes: 0, warning: `Could not parse timing format: "${str}"` };
}

function getSubReadingTag(code: string): string {
  const match = code.match(/\(([a-z])\)/i);
  return match ? match[1].toLowerCase() : '';
}

export class SSCIImporter implements ResourceImporter {
  readonly name = 'SSCI Excel Importer';

  async import(): Promise<ImportResult> {
    const errors: string[] = [];
    const imported: LearningResource[] = [];

    try {
      const xlsx = await import('xlsx');
      const filePath = '/data/datasets/CFA Level 3 Coding Sheet_2026.xlsx';

      const response = await fetch(filePath);
      if (!response.ok) {
        errors.push(`Could not fetch Excel file at ${filePath}: HTTP ${response.status}`);
        return { imported, errors, totalRows: 0, successCount: 0, errorCount: errors.length };
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'array' });

      const sheetsToProcess = ['Common Core', 'Portfolio Management Pathway'];
      let totalRows = 0;
      let successCount = 0;
      const seenLectureCodes = new Set<string>();

      for (const sheetName of sheetsToProcess) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          errors.push(`Sheet "${sheetName}" not found in workbook.`);
          continue;
        }

        const rows: any[] = xlsx.utils.sheet_to_json(sheet);
        let currentCode: any = null;
        let currentSection: any = null;
        let currentReading: any = null;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const title = row['Code_1'] || row['code_1'] || row['Code.1'] || row['code.1'];
          const code = row['Name'] || row['name'];
          const timing = row['Timing'] || row['timing'];
          const resourceCell = row['Resources used in class - Hardcopy Book, Spreadsheet links, and PPT links'] || row['Pdf link'] || row['pdf link'];

          if (!title && !code) {
            continue;
          }

          if ((title && (String(title).includes('Soumya') || String(title).includes('Approx total number of hours'))) || (code && String(code).includes('Ravi'))) {
            continue;
          }

          totalRows++;

          if (row['Code'] !== undefined) currentCode = row['Code'];
          if (row['Section'] !== undefined) currentSection = row['Section'];
          if (row['Reading'] !== undefined) currentReading = row['Reading'];

          const readingStr = String(currentReading || '').trim();
          const cleanTitle = String(title || '').trim();
          const cleanCode = String(code || '').trim();

          let readingId: string | null = null;
          if (readingStr.includes('Guidance For Standards') || readingStr.includes('Guidance for Standards')) {
            readingId = 'read-eth-std-1';
          } else {
            readingId = READING_MAPPING[readingStr] || null;
          }

          if (readingStr.includes('Capital Market Expectations (both Part 1 and Part 2)')) {
            const codeLower = cleanCode.toLowerCase();
            if (codeLower.includes('1.2(p)') || codeLower.includes('1.2 (p)') || cleanTitle.toLowerCase().includes('part 2')) {
              readingId = 'read-cme-2';
            } else {
              readingId = 'read-cme-1';
            }
          }

          if (!readingId) {
            errors.push(`Row ${i + 2} (${sheetName}): Could not map reading "${readingStr}" to database.`);
            continue;
          }

          const matchedReading = INITIAL_2027_READINGS.find(r => r.id === readingId);
          if (!matchedReading) {
            errors.push(`Row ${i + 2} (${sheetName}): Mapped Reading ID "${readingId}" not found in initial curriculum.`);
            continue;
          }

          const { minutes, warning: timeWarning } = parseTimingToMinutes(timing);
          if (timeWarning) {
            errors.push(`Row ${i + 2} (${sheetName}): ${timeWarning}`);
          }

          const uniqueKey = `${matchedReading.subjectId}-${readingId}-${cleanCode || cleanTitle}`;
          if (cleanCode && seenLectureCodes.has(cleanCode)) {
            errors.push(`Row ${i + 2} (${sheetName}): Duplicate lecture code: "${cleanCode}"`);
          }
          if (cleanCode) {
            seenLectureCodes.add(cleanCode);
          }

          const resourceLinks: string[] = [];
          if (resourceCell) {
            const urlRegex = /https?:\/\/[^\s\n\r,;]+/g;
            const urls = String(resourceCell).match(urlRegex);
            if (urls) {
              resourceLinks.push(...urls);
            }
          }
          const launchUrl = resourceLinks.length > 0 ? resourceLinks[0] : '';

          const subReadingTag = cleanCode ? getSubReadingTag(cleanCode) : '';
          const losIds: string[] = [];
          if (subReadingTag) {
            const readingLOS = INITIAL_2027_LOS.filter(l => l.readingId === readingId);
            const matchedLos = readingLOS.filter(l => l.code.toLowerCase().endsWith('.' + subReadingTag));
            losIds.push(...matchedLos.map(l => l.id));
          }

          const resourceId = `lrs-ssci-${sheetName.toLowerCase().replace(/\s+/g, '-')}-${i}`;

          const resource: LearningResource = {
            id: resourceId,
            provider: 'SSCI',
            resourceType: 'Lecture',
            title: cleanTitle || cleanCode,
            description: `${matchedReading.topicArea || matchedReading.name} Reading ${matchedReading.readingNumber || matchedReading.number} - ${cleanTitle || cleanCode}`,
            readingId,
            losIds,
            duration: Math.max(1, Math.round(minutes)),
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
            runtimeMinutes: Math.round(minutes),
            resourceLinks,
          };

          imported.push(resource);
          successCount++;
        }
      }

      return { imported, errors, totalRows, successCount, errorCount: errors.length };
    } catch (err: any) {
      errors.push(`Import failed: ${err.message}`);
      return { imported, errors, totalRows: 0, successCount: 0, errorCount: errors.length };
    }
  }

  static hasBeenImported(): boolean {
    return localStorage.getItem(DYNAMIC_IMPORT_KEY) === 'true';
  }

  static markImported(): void {
    localStorage.setItem(DYNAMIC_IMPORT_KEY, 'true');
  }
}
