/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service to automatically scan chunk text and identify occurrences of 
 * standard CFA Level III equations and formulas.
 */
export class FormulaExtractionService {
  private static readonly FORMULA_REGEXES = [
    { id: 'f02f0d92-7f72-4752-9c16-8367a84e6201', keywords: ['grinold', 'kroner', 'repurchase yield', 'valuation re-rating'] },
    { id: 'f02f0d92-7f72-4752-9c16-8367a84e6202', keywords: ['singer', 'terhaar', 'segmented', 'integrated market', 'illiquidity premium'] },
    { id: 'f02f0d92-7f72-4752-9c16-8367a84e6203', keywords: ['active share', 'closet indexer', 'portfolio weight', 'benchmark weight'] },
    { id: 'f02f0d92-7f72-4752-9c16-8367a84e6204', keywords: ['information ratio', 'active risk', 'tracking error', 'Rp - Rb'] },
    { id: 'f02f0d92-7f72-4752-9c16-8367a84e6205', keywords: ['yield decomposition', 'rolldown return', 'rolldown yield', 'coupon yield', 'credit spread'] },
    { id: 'f02f0d92-7f72-4752-9c16-8367a84e6206', keywords: ['tax accumulation', 'future value factor', 'capital gains tax', 'FVIF'] }
  ];

  /**
   * Scans text to find matching Formula IDs.
   */
  public detectFormulas(text: string): string[] {
    const textLower = text.toLowerCase();
    const matchedIds: string[] = [];

    FormulaExtractionService.FORMULA_REGEXES.forEach(f => {
      const isMatched = f.keywords.some(keyword => textLower.includes(keyword));
      if (isMatched) {
        matchedIds.push(f.id);
      }
    });

    return matchedIds;
  }
}

export const formulaExtractionService = new FormulaExtractionService();
