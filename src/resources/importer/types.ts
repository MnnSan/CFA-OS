import { LearningResource } from '../types';

export interface ImportResult {
  imported: LearningResource[];
  errors: string[];
  totalRows: number;
  successCount: number;
  errorCount: number;
  diagnostics?: any[];
}

export interface ResourceImporter {
  readonly name: string;
  import(): Promise<ImportResult>;
}
