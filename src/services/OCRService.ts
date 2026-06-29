/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service to simulate Optical Character Recognition (OCR) for scanned image assets.
 */
export class OCRService {
  /**
   * Run OCR on a image file and extract raw text.
   */
  public async extractText(file: Blob, filename: string): Promise<string> {
    // Simulate processing delay for OCR
    await new Promise(resolve => setTimeout(resolve, 600));

    // Seed mock content based on name keywords
    const nameLower = filename.toLowerCase();
    
    if (nameLower.includes('formula') || nameLower.includes('equity') || nameLower.includes('grinold')) {
      return `
# Study Notes: Active Return and Valuation Models

## Grinold-Kroner Model Overview
Expected Return E(R_e) approx D_1 / P_0 + i + g - ΔS + ΔPE.
This equation is critical for Level III Equity and Asset Allocation.
- Dividend Yield: D_1 / P_0 (usually given as forward yield).
- Expected Inflation (i) and Expected Real Earnings Growth (g).
- Expected Repurchase Yield (-ΔS): Negative means share buyback, which adds value!
- P/E repricing growth (ΔPE): Repricing re-rating.

## Covered Interest Parity (CIP)
F = S * (1 + R_d) / (1 + R_f).
This explains how forward exchange rates relate to spot rates and foreign interest premiums.
      `;
    }

    if (nameLower.includes('schweser') || nameLower.includes('fixed income') || nameLower.includes('reading')) {
      return `
# Reading 18: Currency Management and Hedging

## Section 1: Introduction to Active Currency Management
Active managers evaluate whether to hedge currency exposures. Under Cover Interest Rate Parity (CIRP), the forward premium equals the interest rate differential.
Formula: Forward Premium = F - S approx S * (R_d - R_f).

## Section 2: Purchasing Power Parity (PPP)
Relative PPP states that exchange rate adjustments offset inflation differentials:
Exchange Rate change approx Inflation_Domestic - Inflation_Foreign.

## Section 3: Carry Trade Strategies
Carry trade involves borrowing in a low-yield currency (funding currency) and investing in a high-yield currency (investment currency). This profits if the foreign currency does not depreciate by more than the interest differential.
This represents a violation of Uncovered Interest Rate Parity (UCIP).
      `;
    }

    return `
# Ingested Study Guide: General CFA Level III Reference
Uploaded file: ${filename}
Ingested date: ${new Date().toLocaleDateString()}

This document contains parsed text for general preparation. Under the curriculum guidelines, candidates must be able to calculate and evaluate key performance metrics such as Active Share, Information Ratio, and Fixed Income yield decompositions.
- Active Share: Measures how much a portfolio differs from its benchmark.
- Information Ratio: IR = (Rp - Rb) / active risk. Unconstrained IR is unaffected by leverage.
    `;
  }
}

export const ocrService = new OCRService();
