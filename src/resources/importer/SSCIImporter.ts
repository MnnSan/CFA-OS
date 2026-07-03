import { LearningResource } from '../types';
import { ResourceImporter, ImportResult } from './types';

const DYNAMIC_IMPORT_KEY = 'cfa_ssci_import_completed';

export class SSCIImporter implements ResourceImporter {
  readonly name = 'SSCI Excel Importer';

  async import(): Promise<ImportResult> {
    const errors: string[] = [];
    const imported: LearningResource[] = [];

    try {
      const xlsx = await import('xlsx');

      const filePath = '/data/CFA Level 3 Coding Sheet 2026.xlsx';

      const response = await fetch(filePath);
      if (!response.ok) {
        errors.push(`Could not fetch Excel file at ${filePath}: HTTP ${response.status}`);
        return { imported, errors, totalRows: 0, successCount: 0, errorCount: errors.length };
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = xlsx.read(arrayBuffer, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        errors.push('No sheets found in workbook');
        return { imported, errors, totalRows: 0, successCount: 0, errorCount: errors.length };
      }

      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = xlsx.utils.sheet_to_json(sheet);

      const totalRows = rows.length;
      let successCount = 0;

      for (const row of rows) {
        try {
          const subjectCode = String(row['Subject Code'] || row['subjectCode'] || row['Subject'] || '').trim();
          const readingNumber = Number(row['Reading #'] || row['readingNumber'] || row['Reading'] || 0);
          const lectureTitle = String(row['Lecture Title'] || row['lectureTitle'] || row['Title'] || row['title'] || '').trim();
          const durationMinutes = Number(row['Duration (min)'] || row['durationMinutes'] || row['Duration'] || 0);
          const url = String(row['URL'] || row['url'] || row['Link'] || '').trim();

          if (!lectureTitle || !subjectCode) {
            errors.push(`Row skipped: missing lecture title or subject code`);
            continue;
          }

          const resource: LearningResource = {
            id: '',
            provider: 'SSCI',
            resourceType: 'Lecture',
            title: lectureTitle,
            description: `${subjectCode} Reading ${readingNumber} - ${lectureTitle}`,
            readingId: '',
            losIds: [],
            duration: Math.max(1, durationMinutes),
            launchUrl: url || `https://ssci.com/lectures/${subjectCode.toLowerCase()}-${readingNumber}`,
            importMetadata: {
              importedAt: new Date().toISOString(),
              source: 'CFA Level 3 Coding Sheet 2026.xlsx',
              originalId: `${subjectCode}-${readingNumber}-${lectureTitle}`,
            },
            progress: {
              minutesCompleted: 0,
              completed: false,
              lastOpenedAt: null,
              resumeState: null,
            },
          };

          imported.push(resource);
          successCount++;
        } catch (rowErr: any) {
          errors.push(`Row processing error: ${rowErr.message}`);
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
