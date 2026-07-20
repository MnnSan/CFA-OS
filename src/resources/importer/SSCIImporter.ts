import { LearningResource } from '../types';
import { ResourceImporter, ImportResult } from './types';
import { READING_MAPPING } from '../migration/mappingConfig';
import { INITIAL_2027_READINGS, INITIAL_2027_LOS } from '../../applications/cfa/curriculum/data/initialCurriculum';
import { LectureRepository } from '../../applications/cfa/repositories/LectureRepository';

const DYNAMIC_IMPORT_KEY = 'cfa_ssci_import_completed';

/**
 * Robustly parses timing formats into minutes.
 * Supports:
 * - Excel Day Fractions (e.g. 0.041689 meaning 1 hour)
 * - hh:mm:ss (e.g. 01:30:15)
 * - mm:ss (e.g. 54:50)
 * - hh:mm (e.g. 01:20)
 * - Decimal hours (e.g. "1.5 hr" or "90 min" or "1.2 hours")
 * - Null/undefined/numbers safely.
 */
export function parseTimingToMinutes(str: any): { minutes: number; warning?: string } {
  if (str === null || str === undefined) {
    return { minutes: 0 };
  }

  if (typeof str === 'number') {
    if (str <= 0) return { minutes: 0 };
    // If it's a day fraction (less than 1.0)
    if (str < 1.0) {
      return { minutes: str * 24 * 60 };
    }
    return { minutes: str };
  }

  const s = String(str).trim();
  if (!s) return { minutes: 0 };

  const rawNum = Number(s);
  if (!isNaN(rawNum)) {
    if (rawNum < 1.0) {
      return { minutes: rawNum * 24 * 60 };
    }
    return { minutes: rawNum };
  }

  const sLower = s.toLowerCase();

  if (sLower.includes('hr') || sLower.includes('hour')) {
    const val = parseFloat(sLower.replace(/[a-z]/g, '').trim());
    return { minutes: isNaN(val) ? 0 : val * 60 };
  }

  if (sLower.includes('min')) {
    const val = parseFloat(sLower.replace(/[a-z]/g, '').trim());
    return { minutes: isNaN(val) ? 0 : val };
  }

  if (sLower.includes('h') && sLower.includes('m')) {
    const hMatch = sLower.match(/(\d+(?:\.\d+)?)\s*h/);
    const mMatch = sLower.match(/(\d+(?:\.\d+)?)\s*m/);
    const h = hMatch ? parseFloat(hMatch[1]) : 0;
    const m = mMatch ? parseFloat(mMatch[1]) : 0;
    return { minutes: h * 60 + m };
  }

  const parts = s.split(':').map(Number);
  if (parts.every(p => !isNaN(p)) && parts.length > 0) {
    if (parts.length === 3) {
      return { minutes: parts[0] * 60 + parts[1] + parts[2] / 60 };
    } else if (parts.length === 2) {
      // Heuristic to distinguish hh:mm from mm:ss
      // If parts[0] is 0 or >= 5, treat as mm:ss (e.g. 54:50 -> 54.83 min)
      // If parts[0] is 1-4, treat as hh:mm (e.g. 1:05 -> 65 min)
      if (parts[0] === 0 || parts[0] >= 5) {
        return { minutes: parts[0] + parts[1] / 60 };
      } else {
        return { minutes: parts[0] * 60 + parts[1] };
      }
    } else if (parts.length === 1) {
      return { minutes: parts[0] };
    }
  }

  return { minutes: 0, warning: `Could not parse timing format: "${str}"` };
}

/**
 * Robustly parses LOS letters from Name/Code string (e.g., "1.1 (a)", "1.1 (a-c)", "1.2 (p,q)").
 * Supports ranges (a-c), lists (a,c), and parenthesis.
 */
export function parseLosLetters(codeStr: string): string[] {
  const letters: string[] = [];
  const clean = codeStr.trim().toLowerCase();

  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inner = parenMatch[1].trim();
    if (inner.includes('-')) {
      const parts = inner.split('-').map(s => s.trim());
      if (parts.length === 2 && parts[0].length === 1 && parts[1].length === 1) {
        const start = parts[0].charCodeAt(0);
        const end = parts[1].charCodeAt(0);
        for (let code = start; code <= end; code++) {
          letters.push(String.fromCharCode(code));
        }
      }
    } else {
      const parts = inner.split(/[,&]|\band\b/).map(s => s.trim());
      for (const p of parts) {
        if (p.length === 1) {
          letters.push(p);
        }
      }
    }
  } else {
    const endMatch = clean.match(/[\s.]([a-z])$/);
    if (endMatch) {
      letters.push(endMatch[1]);
    } else {
      const directMatch = clean.match(/\d+([a-z])$/);
      if (directMatch) {
        letters.push(directMatch[1]);
      }
    }
  }

  return Array.from(new Set(letters));
}

/**
 * Maps Excel row reading names and codes to database Reading IDs.
 * Incorporates 6-stage matching priority and syllabus partition splits.
 */
export function findReadingId(excelReadingStr: string, cleanCode: string, cleanTitle: string): string | null {
  const readingStr = excelReadingStr.trim();
  const codeLower = cleanCode.toLowerCase();
  const titleLower = cleanTitle.toLowerCase();

  // --- Stage 6 (Partitions & Aliases) ---
  if (readingStr.includes('Asset Allocation')) {
    if (codeLower.includes('1.1 (a)') || codeLower.includes('1.1 (b)') || codeLower.includes('1.1(a)') || codeLower.includes('1.1(b)')) {
      return 'read-aa-overview';
    } else if (
      codeLower.includes('1.1 (c)') || codeLower.includes('1.1 (d)') || codeLower.includes('1.1 (e)') ||
      codeLower.includes('1.1 (f)') || codeLower.includes('1.1 (g)') || codeLower.includes('1.1 (h)') ||
      codeLower.includes('1.1 (i)') ||
      codeLower.includes('1.1(c)') || codeLower.includes('1.1(d)') || codeLower.includes('1.1(e)') ||
      codeLower.includes('1.1(f)') || codeLower.includes('1.1(g)') || codeLower.includes('1.1(h)') ||
      codeLower.includes('1.1(i)')
    ) {
      return 'read-aa-principles';
    } else if (codeLower.includes('1.1 (j)') || codeLower.includes('1.1 (k)') || codeLower.includes('1.1(j)') || codeLower.includes('1.1(k)')) {
      return 'read-aa-constraints';
    }
    
    if (titleLower.includes('overview') || titleLower.includes('introduction')) {
      return 'read-aa-overview';
    }
    if (titleLower.includes('constraint') || titleLower.includes('real world') || titleLower.includes('liabilit')) {
      return 'read-aa-constraints';
    }
    return 'read-aa-principles';
  }

  if (readingStr.includes('Capital Market Expectations')) {
    if (codeLower.includes('1.2 (p)') || codeLower.includes('1.2 (q)') || codeLower.includes('1.2(p)') || codeLower.includes('1.2(q)') || titleLower.includes('part 2')) {
      return 'read-cme-2';
    } else {
      return 'read-cme-1';
    }
  }

  if (readingStr.includes('Guidance For Standards') || readingStr.includes('Guidance for Standards')) {
    const match = cleanCode.match(/5\.3\.(\d+)/);
    if (match) {
      const x = parseInt(match[1]);
      if (x === 1) return 'read-eth-code';
      if (x >= 2 && x <= 5) return 'read-eth-std-1';
      if (x >= 6 && x <= 9) return 'read-eth-std-2';
      if (x >= 10 && x <= 13) return 'read-eth-std-3';
      if (x >= 14 && x <= 17) return 'read-eth-std-4';
      if (x >= 18 && x <= 21) return 'read-eth-std-5';
      if (x >= 22 && x <= 25) return 'read-eth-std-6';
      if (x >= 26 && x <= 29) return 'read-eth-std-7';
    }

    if (titleLower.includes('standard i ') || titleLower.includes('standard i:') || titleLower.includes('standard i.') || titleLower.endsWith('standard i')) return 'read-eth-std-1';
    if (titleLower.includes('standard ii')) return 'read-eth-std-2';
    if (titleLower.includes('standard iii')) return 'read-eth-std-3';
    if (titleLower.includes('standard iv')) return 'read-eth-std-4';
    if (titleLower.includes('standard v') && !titleLower.includes('standard vi')) return 'read-eth-std-5';
    if (titleLower.includes('standard vi')) return 'read-eth-std-6';
    if (titleLower.includes('standard vii')) return 'read-eth-std-7';

    return 'read-eth-std-1';
  }

  // --- Stage 1: Exact Reading ID match ---
  const directIdMatch = INITIAL_2027_READINGS.find(r => r.id === readingStr);
  if (directIdMatch) return directIdMatch.id;

  // --- Stage 3: Exact Title Match ---
  const directTitleMatch = INITIAL_2027_READINGS.find(r => r.title.toLowerCase() === readingStr.toLowerCase());
  if (directTitleMatch) return directTitleMatch.id;

  // --- Stage 2 & 4: Prefix Numbers / Subject + Reading Match ---
  const numMatch = readingStr.match(/^(\d+(?:\.\d+){0,3})/);
  if (numMatch) {
    const numStr = numMatch[1];
    const prefixToNumberMap: Record<string, number> = {
      '1.1': 4,
      '1.2': 1,
      '2.1': 16,
      '2.2': 17,
      '2.3': 18,
      '3.1': 9,
      '3.2': 8,
      '3.3': 6,
      '3.3.1': 29,
      '3.3.2': 30,
      '3.3.3': 31,
      '3.4': 7,
      '3.4.1': 32,
      '3.4.2': 33,
      '3.4.3': 34,
      '3.5': 11,
      '3.6': 10,
      '3.6.1': 36,
      '3.7': 12,
      '4.1': 13,
      '4.2': 14,
      '4.2.1': 35,
      '4.3': 15,
      '5.1': 28,
      '5.2': 27,
      '5.3': 20,
      '5.4': 27,
      '6.1': 34
    };
    const readingNum = prefixToNumberMap[numStr];
    if (readingNum !== undefined) {
      const match = INITIAL_2027_READINGS.find(r => r.number === readingNum);
      if (match) return match.id;
    }
  }

  // --- Stage 2: Check Static READING_MAPPING Config ---
  if (READING_MAPPING[readingStr]) {
    return READING_MAPPING[readingStr];
  }

  // --- Stage 5: Fuzzy Title Match ---
  const normStr = readingStr.toLowerCase();
  for (const r of INITIAL_2027_READINGS) {
    const rTitleLower = r.title.toLowerCase();
    if (normStr.includes(rTitleLower) || rTitleLower.includes(normStr)) {
      return r.id;
    }
  }

  const words = normStr.split(/\s+/).filter(w => w.length > 3);
  if (words.length > 0) {
    let bestMatch: string | null = null;
    let maxOverlap = 0;
    for (const r of INITIAL_2027_READINGS) {
      const rTitleLower = r.title.toLowerCase();
      let overlap = 0;
      for (const w of words) {
        if (rTitleLower.includes(w)) overlap++;
      }
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = r.id;
      }
    }
    if (maxOverlap >= 2) {
      return bestMatch;
    }
  }

  return null;
}

export class SSCIImporter implements ResourceImporter {
  readonly name = 'SSCI Excel Importer';

  async import(): Promise<ImportResult> {
    const errors: string[] = [];
    const imported: LearningResource[] = [];
    const diagnostics: any[] = [];

    try {
      const xlsx = await import('xlsx');
      const filePath = '/data/datasets/CFA Level 3 Coding Sheet_2026.xlsx';

      const response = await fetch(filePath);
      if (!response.ok) {
        errors.push(`Could not fetch Excel file at ${filePath}: HTTP ${response.status}`);
        return { imported, errors, totalRows: 0, successCount: 0, errorCount: errors.length, diagnostics };
      }

      const arrayBuffer = await response.arrayBuffer();

      // Compute SHA-256 Checksum of Workbook ArrayBuffer
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const excelChecksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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

          const cleanTitle = String(title || '').trim();
          const cleanCode = String(code || '').trim();

          // Skip headers and metadata lines in workbook
          if (
            cleanTitle.includes('Soumya') ||
            cleanTitle.includes('Approx total') ||
            cleanTitle.includes('Total') ||
            cleanCode.includes('Ravi') ||
            cleanCode.includes('Name')
          ) {
            continue;
          }

          totalRows++;

          if (row['Code'] !== undefined) currentCode = row['Code'];
          if (row['Section'] !== undefined) currentSection = row['Section'];
          if (row['Reading'] !== undefined) currentReading = row['Reading'];

          const readingStr = String(currentReading || '').trim();

          // 1. Stage Match Reading
          const readingId = findReadingId(readingStr, cleanCode, cleanTitle);

          if (!readingId) {
            diagnostics.push({
              type: 'UNMAPPED_ROW',
              sheetName,
              rowNumber: i + 2,
              excelReading: readingStr,
              lectureName: cleanTitle || cleanCode,
              lectureCode: cleanCode,
              details: `Could not map reading name "${readingStr}" to database reading ID.`
            });
            errors.push(`Row ${i + 2} (${sheetName}): Could not map reading "${readingStr}" to database.`);
            continue;
          }

          const matchedReading = INITIAL_2027_READINGS.find(r => r.id === readingId);
          if (!matchedReading) {
            diagnostics.push({
              type: 'UNMAPPED_ROW',
              sheetName,
              rowNumber: i + 2,
              excelReading: readingStr,
              lectureName: cleanTitle || cleanCode,
              lectureCode: cleanCode,
              details: `Mapped Reading ID "${readingId}" not found in initial curriculum.`
            });
            errors.push(`Row ${i + 2} (${sheetName}): Mapped Reading ID "${readingId}" not found in initial curriculum.`);
            continue;
          }

          // 2. Parse timing duration using the new robust helper
          const minutes = LectureRepository.getRuntimeMinutes(cleanCode, timing, readingId);

          if ((minutes < 0 || minutes > 300) && !(readingId === 'read-deriv-options' && (timing === undefined || timing === null))) {
            diagnostics.push({
              type: 'INVALID_DURATION',
              sheetName,
              rowNumber: i + 2,
              excelReading: readingStr,
              lectureName: cleanTitle || cleanCode,
              lectureCode: cleanCode,
              details: `Invalid video duration parsed: ${minutes} min (Value in Excel: ${timing})`
            });
          }

          // 3. Check for Duplicate Lecture Codes
          const uniqueKey = `${matchedReading.subjectId}-${readingId}-${cleanCode || cleanTitle}`;
          if (cleanCode && seenLectureCodes.has(cleanCode)) {
            diagnostics.push({
              type: 'DUPLICATE_CODE',
              sheetName,
              rowNumber: i + 2,
              excelReading: readingStr,
              lectureName: cleanTitle || cleanCode,
              lectureCode: cleanCode,
              details: `Duplicate lecture code: "${cleanCode}"`
            });
            errors.push(`Row ${i + 2} (${sheetName}): Duplicate lecture code: "${cleanCode}"`);
          }
          if (cleanCode) {
            seenLectureCodes.add(cleanCode);
          }

          // 4. Extract URLs
          const resourceLinks: string[] = [];
          if (resourceCell) {
            const urlRegex = /https?:\/\/[^\s\n\r,;]+/g;
            const urls = String(resourceCell).match(urlRegex);
            if (urls) {
              resourceLinks.push(...urls);
            }
          }
          const launchUrl = resourceLinks.length > 0 ? resourceLinks[0] : '';
          if (!launchUrl || !launchUrl.startsWith('http')) {
            diagnostics.push({
              type: 'BROKEN_URL',
              sheetName,
              rowNumber: i + 2,
              excelReading: readingStr,
              lectureName: cleanTitle || cleanCode,
              lectureCode: cleanCode,
              details: `Broken or missing launch URL for lecture (Value in Excel: ${resourceCell || 'empty'})`
            });
          }

          // 5. Match LOS Items
          const parsedLetters = parseLosLetters(cleanCode);
          const readingLOS = INITIAL_2027_LOS.filter(l => l.readingId === readingId);
          const losIds: string[] = [];

          if (parsedLetters.length > 0) {
            const matchedLos = readingLOS.filter(l => {
              const dotParts = l.code.split('.');
              if (dotParts.length > 1) {
                const losLetter = dotParts[dotParts.length - 1].trim().toLowerCase();
                return parsedLetters.includes(losLetter);
              }
              return false;
            });
            losIds.push(...matchedLos.map(l => l.id));

            if (readingLOS.length > 0 && losIds.length === 0) {
              diagnostics.push({
                type: 'UNKNOWN_LOS',
                sheetName,
                rowNumber: i + 2,
                excelReading: readingStr,
                lectureName: cleanTitle || cleanCode,
                lectureCode: cleanCode,
                details: `Could not map parsed letters [${parsedLetters.join(', ')}] to any database LOS in reading "${readingId}".`
              });
            }
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
            duration: minutes,
            launchUrl,
            order: i,
            importMetadata: {
              importedAt: new Date().toISOString(),
              source: 'CFA Level 3 Coding Sheet 2026.xlsx',
              originalId: uniqueKey,
              originalReadingStr: readingStr,
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
            subReadingTag: parsedLetters.join(','),
            runtimeMinutes: minutes,
            resourceLinks,
            // Backward compatibility fields
            durationMinutes: minutes,
            completed: false,
            lastOpened: null,
            launchURL: launchUrl,
            importedFromExcel: true,
            importedAt: new Date().toISOString(),
            checksum: excelChecksum,
          };

          imported.push(resource);
          successCount++;
        }
      }

      // Check for Readings with 0 mapped lectures
      const importedReadingIds = new Set(imported.map(r => r.readingId));
      for (const reading of INITIAL_2027_READINGS) {
        if (!importedReadingIds.has(reading.id)) {
          diagnostics.push({
            type: 'MISSING_LECTURES',
            excelReading: reading.title || reading.name,
            details: `Reading ${reading.id} ("${reading.title}") contains 0 mapped SSCI lectures from the Excel workbook.`
          });
        }
      }

      return { imported, errors, totalRows, successCount, errorCount: errors.length, diagnostics };
    } catch (err: any) {
      errors.push(`Import failed: ${err.message}`);
      return { imported, errors, totalRows: 0, successCount: 0, errorCount: errors.length, diagnostics: [] };
    }
  }

  static hasBeenImported(): boolean {
    return localStorage.getItem(DYNAMIC_IMPORT_KEY) === 'true';
  }

  static markImported(): void {
    localStorage.setItem(DYNAMIC_IMPORT_KEY, 'true');
  }
}
