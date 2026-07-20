/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseExcelTimeToMinutes } from '../utils/timeParser';

export interface SeedLectureRow {
  sheetName: 'Common Core' | 'Portfolio Management Pathway';
  readingId: string;
  lectureCode: string;
  title: string;
  timing: any;
}

export const SEED_LECTURE_ROWS: SeedLectureRow[] = [
  // Asset Allocation (Reading 1.1) - 15 total classes mapping to ~1,162 minutes
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (a) p1', title: 'ASSET ALLOCATION CL 1 P1', timing: 0.04168981481481481 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (a) p2', title: 'ASSET ALLOCATION CL 1 P2', timing: 0.0380787037037037 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (b) p1', title: 'ASSET ALLOCATION CL 2 P1', timing: 0.04115740740740741 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (b) p2', title: 'ASSET ALLOCATION CL 2 P2', timing: 0.03862268518518518 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (c) p1', title: 'ASSET ALLOCATION CL 3 P1', timing: 0.04357638888888889 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (c) p2', title: 'ASSET ALLOCATION CL 3 P2', timing: 0.04520833333333334 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (d) p1', title: 'ASSET ALLOCATION CL 4 P1', timing: 0.0384375 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (d) p2', title: 'ASSET ALLOCATION CL 4 P2', timing: 0.03534722222222222 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (e)', title: 'ASSET ALLOCATION CL 5', timing: 0.08306712962962963 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (f)', title: 'ASSET ALLOCATION CL 6', timing: 0.07465277777777778 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (g)', title: 'ASSET ALLOCATION CL 7', timing: 0.07420138888888889 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (h)', title: 'ASSET ALLOCATION CL 8', timing: 0.06541666666666666 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (i)', title: 'ASSET ALLOCATION CL 9', timing: 0.07758101851851852 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (j)', title: 'ASSET ALLOCATION 10', timing: 0.05571759259259259 },
  { sheetName: 'Common Core', readingId: 'read-aa-principles', lectureCode: '1.1 (k)', title: 'ASSET ALLOCATION 11', timing: 0.05451388888888889 },

  // CME Live Track Sequence (Reading 1.2) - 17 classes dynamically mapped to 90-minute baseline
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (a)', title: 'CME Class 1', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (b)', title: 'CME Class 2', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (c)', title: 'CME Class 3', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (d)', title: 'CME Class 4', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (e)', title: 'CME Class 5', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (f)', title: 'CME Class 6', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (g)', title: 'CME Class 7', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (h)', title: 'CME Class 8', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (i)', title: 'CME Class 9', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-1', lectureCode: '1.2 (j)', title: 'CME Class 10', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-2', lectureCode: '1.2 (k)', title: 'CME Class 11', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-2', lectureCode: '1.2(l)', title: 'CME Class 12', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-2', lectureCode: '1.2(m)', title: 'CME Class 13', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-2', lectureCode: '1.2(n)', title: 'CME Class 14 (Capital Market Expectations Part 1 A Short Recap & Discussion on Macro Economics Linkages)', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-2', lectureCode: '1.2(o)', title: 'CME Class 15 (Capital Market Expectations Part 1 Discussion On Negative Interest Rates Analysis Of Monetary & Fiscal Policies & International Linkages)', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-2', lectureCode: '1.2(p)', title: 'CME Class 16 (CME Part 2: Currency Discussion)', timing: undefined },
  { sheetName: 'Common Core', readingId: 'read-cme-2', lectureCode: '1.2(q)', title: 'CME Class 17 (CME Part 2: Dynamic Covariance)', timing: undefined },

  // Options Strategies (Reading 2.1) - 16 classes mapping to ~402 minutes (remaining 12 empty classes get 0 to maintain ~402 mins footprint)
  { sheetName: 'Common Core', readingId: 'read-deriv-options', lectureCode: '2.1 (a)', title: 'Derivative Option Strategies', timing: 0.0008796296296296296 },
  { sheetName: 'Common Core', readingId: 'read-deriv-options', lectureCode: '2.1 (b)', title: 'DERIVATIVE: OPTION STRATEGIES CL 1', timing: 0.09248842592592593 },
  { sheetName: 'Common Core', readingId: 'read-deriv-options', lectureCode: '2.1 (c)', title: 'DERIVATIVE: OPTION STRATEGIES CL 2', timing: 0.1008680555555556 },
  { sheetName: 'Common Core', readingId: 'read-deriv-options', lectureCode: '2.1 (d)', title: 'DERIVATIVE: OPTION STRATEGIES CL 3', timing: 0.08521990740740741 },

  // Swaps, Forwards & Futures (Reading 2.2) - 6 classes mapping to ~606 minutes
  { sheetName: 'Common Core', readingId: 'read-deriv-swaps', lectureCode: '2.2 (a)', title: 'Derivative Swap Forward And Future', timing: 0.0006018518518518519 },
  { sheetName: 'Common Core', readingId: 'read-deriv-swaps', lectureCode: '2.2 (b)', title: 'Derivative: Swaps, Forwards, and Futures Strategies CL 1', timing: 0.07888888888888888 },
  { sheetName: 'Common Core', readingId: 'read-deriv-swaps', lectureCode: '2.2 (c)', title: 'Derivative: Swaps, Forwards, and Futures Strategies CL 2', timing: 0.07960648148148149 },
  { sheetName: 'Common Core', readingId: 'read-deriv-swaps', lectureCode: '2.2 (d)', title: 'Derivative: Swaps, Forwards, and Futures Strategies CL 3', timing: 0.08565972222222222 },
  { sheetName: 'Common Core', readingId: 'read-deriv-swaps', lectureCode: '2.2 (e)', title: 'Derivative: Swaps, Forwards, and Futures Strategies CL 4', timing: 0.08702546296296296 },
  { sheetName: 'Common Core', readingId: 'read-deriv-swaps', lectureCode: '2.2 (f)', title: 'Derivative: Swaps, Forwards, and Futures Strategies CL 5', timing: 0.08915509259259259 },

  // Currency Management (Reading 2.3) - 8 classes mapping to ~736 minutes
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (a)', title: 'Currency Management', timing: 0.0007638888888888889 },
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (b)', title: 'Currency Management: An Introduction CL 1', timing: 0.0863425925925926 },
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (c)', title: 'Currency Management: An Introduction CL 2', timing: 0.07605324074074074 },
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (d)', title: 'Currency Management: An Introduction CL 3', timing: 0.0933912037037037 },
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (e)', title: 'Currency Management: An Introduction CL 4', timing: 0.07949074074074074 },
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (f)', title: 'Currency Management: An Introduction CL 5', timing: 0.09089120370370371 },
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (g)', title: 'Currency Management: An Introduction CL 6', timing: 0.06306712962962963 },
  { sheetName: 'Common Core', readingId: 'read-deriv-currency', lectureCode: '2.3 (h)', title: 'Currency Management: An Introduction CL 7', timing: 0.02112268518518519 }
];

export class LectureRepository {
  public static getSeededLectures(): SeedLectureRow[] {
    return SEED_LECTURE_ROWS;
  }

  public static getRuntimeMinutes(lectureCode: string, timing: any, readingId: string): number {
    // CME Live Track Sequence: 17 classes dynamically mapped to a 90-minute per-class runtime baseline
    if (readingId === 'read-cme-1' || readingId === 'read-cme-2') {
      return 90;
    }

    // Option Strategies new classes: if they are empty/undefined, return 0 (since they are unrecorded/empty)
    // to maintain exactly ~402 minutes total footprint for the 16 classes.
    if (readingId === 'read-deriv-options' && (timing === null || timing === undefined)) {
      return 0;
    }

    const minutes = parseExcelTimeToMinutes(timing);
    // Safety check: if parsed value is 90 (due to fallback) but it's not CME, let's keep it, or if it rounds to 0, clamp to 1.
    if (minutes === 90 && (timing === null || timing === undefined)) {
      // If it's a regular empty class, we can return 90 or 0 depending on the module context
      return 90;
    }
    
    return Math.max(1, Math.round(minutes));
  }
}
