import { LearningResource } from '../types';

export interface ImportResult {
  imported: LearningResource[];
  errors: string[];
  totalRows: number;
  successCount: number;
  errorCount: number;
}

export interface ResourceImporter {
  readonly name: string;
  import(): Promise<ImportResult>;
}
