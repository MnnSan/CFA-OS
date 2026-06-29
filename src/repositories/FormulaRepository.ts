/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Formula } from '../types';

/**
 * Static database of canonical CFA Level III mathematical equations and formulas.
 */
export const INITIAL_FORMULAS: Formula[] = [
  {
    id: 'f02f0d92-7f72-4752-9c16-8367a84e6201',
    name: 'Grinold-Kroner Model',
    latexExpression: 'E(R_e) \\approx \\frac{D_1}{P_0} + i + g - \\Delta S + \\Delta PE',
    description: 'Expected rate of return on an equity portfolio based on dividend yield, inflation, real earnings growth, share repurchase yield, and P/E ratio re-pricing.',
    linkedSubjectId: '1c2f0d92-7f72-4752-9c16-8367a84e62ad',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d015',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d15a',
    variables: [
      { symbol: '\\frac{D_1}{P_0}', meaning: 'Expected dividend yield (one period forward)' },
      { symbol: 'i', meaning: 'Expected long-term inflation rate' },
      { symbol: 'g', meaning: 'Expected growth rate in real earnings (real GDP proxy)' },
      { symbol: '\\Delta S', meaning: 'Expected percentage change in shares outstanding (a negative value indicates share buybacks, which adds return)' },
      { symbol: '\\Delta PE', meaning: 'Expected growth rate of the P/E ratio (repricing/re-rating)' }
    ],
    isMemorized: false,
    strategicNuances: [
      'Assumes that earnings growth is driven by nominal GDP growth in the long run (real growth + inflation).',
      'The share repurchase yield (-ΔS) directly contributes to return because reducing shares increases value per remaining share.',
      'Valuation re-rating (ΔPE) is generally assumed to be 0% in the long-term, representing mean reversion.'
    ],
    examPitfalls: [
      'Watch out for the sign of ΔS! If shares outstanding decrease by 2%, then ΔS = -2%, and expected return increases by -(-2%) = +2%.',
      'If given nominal earnings growth directly, do not add inflation (i) again because nominal growth already incorporates inflation.'
    ],
    masterySteps: { equation: false, variables: false, assumptions: false, limitations: false, apply: false },
    confidenceRating: null
  },
  {
    id: 'f02f0d92-7f72-4752-9c16-8367a84e6202',
    name: 'Singer-Terhaar Model',
    latexExpression: 'ERP_i = \\rho_{i,M} \\sigma_i \\left( \\frac{ERP_M}{\\sigma_M} \\right) + (1 - \\rho_{i,M}) \\sigma_i \\left( \\frac{ERP_G}{\\sigma_G} \\right) + IP_i',
    description: 'Calculates the equity risk premium for an asset class by taking a weighted average of global integration and segmentation ERP models, adding an illiquidity premium.',
    linkedSubjectId: '4d306b3a-5f05-4cbb-bb78-75c1a798ee73',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d005',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d50b',
    variables: [
      { symbol: 'ERP_i', meaning: 'Equity Risk Premium of asset class i' },
      { symbol: '\\rho_{i,M}', meaning: 'Correlation of asset class i with global market M' },
      { symbol: '\\sigma_i', meaning: 'Standard deviation of asset class i' },
      { symbol: '\\frac{ERP_M}{\\sigma_M}', meaning: 'Sharpe ratio of global integrated market M' },
      { symbol: '\\frac{ERP_G}{\\sigma_G}', meaning: 'Sharpe ratio of local segmented market G' },
      { symbol: 'IP_i', meaning: 'Illiquidity premium associated with asset class i (added if illiquid)' }
    ],
    isMemorized: false,
    strategicNuances: [
      'Assumes that capital markets are partially integrated and partially segmented.',
      'Integration implies asset risk premium is driven by correlation with the global portfolio; segmentation implies asset premium is driven by standalone volatility.',
      'Usually evaluated with integration weights (e.g. 80% integrated, 20% segmented).'
    ],
    examPitfalls: [
      'Do not forget to add the illiquidity premium (IP) separately at the end if the asset is private equity or private real estate.',
      'Be careful to use standard deviations and Sharpe ratios correctly to compile segment weights.'
    ],
    masterySteps: { equation: false, variables: false, assumptions: false, limitations: false, apply: false },
    confidenceRating: null
  },
  {
    id: 'f02f0d92-7f72-4752-9c16-8367a84e6203',
    name: 'Active Share',
    latexExpression: 'Active\\ Share = \\frac{1}{2} \\sum_{i=1}^N |w_{p,i} - w_{b,i}|',
    description: 'Measures active manager performance. Measures the percentage of holdings in a portfolio that differ from the benchmark index holdings.',
    linkedSubjectId: '1c2f0d92-7f72-4752-9c16-8367a84e62ad',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d015',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d15a',
    variables: [
      { symbol: 'w_{p,i}', meaning: 'Portfolio weight of security i' },
      { symbol: 'w_{b,i}', meaning: 'Benchmark weight of security i' }
    ],
    isMemorized: false,
    strategicNuances: [
      'Ranges from 0% (fully replicated index fund) to 100% (zero overlap with index).',
      'Allows division of portfolios into Category boxes: Concentrated (High Active Share, High Tracking Error), Diversified Active (High Active Share, Low Tracking Error), Closet Indexer (Low Active Share, Low Tracking Error).',
      'Unlike tracking error, Active Share does not depend on covariance or covariance structures.'
    ],
    examPitfalls: [
      'Remember the 1/2 multiplier in the formula. If you sum up the absolute differences between portfolio and benchmark weights, you must divide by 2.',
      'Do not confuse Active Share with active risk (tracking error).'
    ],
    masterySteps: { equation: false, variables: false, assumptions: false, limitations: false, apply: false },
    confidenceRating: null
  },
  {
    id: 'f02f0d92-7f72-4752-9c16-8367a84e6204',
    name: 'Information Ratio',
    latexExpression: 'IR = \\frac{E(R_p) - E(R_b)}{\\sigma_{\\text{active}}} = \\frac{R_A}{SD(R_A)}',
    description: 'Measures active manager performance relative to active risk (tracking error).',
    linkedSubjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d013',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d13a',
    variables: [
      { symbol: 'E(R_p)', meaning: 'Expected portfolio return' },
      { symbol: 'E(R_b)', meaning: 'Expected benchmark return' },
      { symbol: '\\sigma_{active}', meaning: 'Active risk / tracking error (annualized standard deviation of excess returns)' }
    ],
    isMemorized: false,
    strategicNuances: [
      'The Information Ratio of an unconstrained portfolio is unaffected by leverage (adding leverage scales active return and active risk by the same factor).',
      'For constrained portfolios (e.g. long-only), leverage shifts the IR down due to cash drag.'
    ],
    examPitfalls: [
      'Ensure standard deviation is computed on the excess return series (Rp - Rb), not the absolute portfolio return.',
      'Double-check that return and tracking error are both annualized.'
    ],
    masterySteps: { equation: false, variables: false, assumptions: false, limitations: false, apply: false },
    confidenceRating: null
  },
  {
    id: 'f02f0d92-7f72-4752-9c16-8367a84e6205',
    name: 'Fixed Income Yield Decomposition',
    latexExpression: 'R_{total} = R_{coupon} + R_{rolldown} + \\Delta P_{curve} + \\Delta P_{credit} + \\Delta P_{currency}',
    description: 'Decomposes total expected return of a fixed-income portfolio into coupon income, yield curve rolldown, yield curve shifts, credit spread changes, and currency returns.',
    linkedSubjectId: '7c9a4e05-c49b-4bc9-93e1-32a21008064d',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d012',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d12a',
    variables: [
      { symbol: 'R_{coupon}', meaning: 'Coupon yield (annual coupon / purchase price)' },
      { symbol: 'R_{rolldown}', meaning: 'Rolldown return (bond price change over period assuming constant yield curve)' },
      { symbol: '\\Delta P_{curve}', meaning: 'Price change due to yield curve shifting (-Duration * Δy + 0.5 * Convexity * Δy^2)' },
      { symbol: '\\Delta P_{credit}', meaning: 'Price change due to credit spread shifts (-Spread Duration * Δspread)' },
      { symbol: '\\Delta P_{currency}', meaning: 'Gain or loss from foreign currency hedging or shifts' }
    ],
    isMemorized: false,
    strategicNuances: [
      'Rolldown yield is positive in upward-sloping yield curves as the bond moves down the curve to lower yields over time.',
      'If the yield curve shifts significantly, you must account for convexity (0.5 * Convexity * Δy^2) because duration alone underestimates price change.'
    ],
    examPitfalls: [
      'Pay attention to the negative sign in front of duration when rates rise! Price decreases by Duration * Δy.',
      'Ensure rolldown return assumes the yield curve stays constant.'
    ],
    masterySteps: { equation: false, variables: false, assumptions: false, limitations: false, apply: false },
    confidenceRating: null
  },
  {
    id: 'f02f0d92-7f72-4752-9c16-8367a84e6206',
    name: 'Tax Accumulation (Future Value Factor)',
    latexExpression: 'FVIF_{tax} = (1 + r)^n (1 - t_g) + t_g',
    description: 'Calculates the future value interest factor of a taxable investment subject to capital gains tax realized at end of n years.',
    linkedSubjectId: 'bc78e874-94c6-4b2a-89a1-5d9c2cfde548',
    linkedReadingId: 'ab102030-4050-4060-8070-90a0b0c0d019',
    linkedLOSId: 'cf102030-4050-4060-8070-90a0b0c0d19a',
    variables: [
      { symbol: 'r', meaning: 'Pre-tax rate of return' },
      { symbol: 'n', meaning: 'Number of compounding periods (years)' },
      { symbol: 't_g', meaning: 'Realized capital gains tax rate' }
    ],
    isMemorized: false,
    strategicNuances: [
      'Tax is deferred until n, allowing pre-tax return to compound fully.',
      'The effective tax rate decreases over time because the tax is only applied to the growth ($FVIF_{tax} - 1$), not the principal, meaning the principal refund ($t_g$) offsets tax drag.'
    ],
    examPitfalls: [
      'Do not apply tax rate to the initial principal. The tax is calculated on the growth, which is why tg is added back at the end to offset tax on principal.',
      'Ensure this formula is only applied to tax-deferred capital gains accounts realized at realization.'
    ],
    masterySteps: { equation: false, variables: false, assumptions: false, limitations: false, apply: false },
    confidenceRating: null
  }
];

export class FormulaRepository {
  private formulaById = new Map<string, Formula>();
  private formulasByReading = new Map<string, Formula[]>();
  private formulasBySubject = new Map<string, Formula[]>();

  constructor(private formulas: Formula[] = INITIAL_FORMULAS) {
    formulas.forEach(f => {
      this.formulaById.set(f.id, f);

      // Group by Reading
      if (f.linkedReadingId) {
        if (!this.formulasByReading.has(f.linkedReadingId)) {
          this.formulasByReading.set(f.linkedReadingId, []);
        }
        this.formulasByReading.get(f.linkedReadingId)!.push(f);
      }

      // Group by Subject
      if (f.linkedSubjectId) {
        if (!this.formulasBySubject.has(f.linkedSubjectId)) {
          this.formulasBySubject.set(f.linkedSubjectId, []);
        }
        this.formulasBySubject.get(f.linkedSubjectId)!.push(f);
      }
    });
  }

  public getById(id: string): Formula | undefined {
    return this.formulaById.get(id);
  }

  public getAll(): Formula[] {
    return this.formulas;
  }

  public getByReadingId(readingId: string): Formula[] {
    return this.formulasByReading.get(readingId) || [];
  }

  public getBySubjectId(subjectId: string): Formula[] {
    return this.formulasBySubject.get(subjectId) || [];
  }

  public searchByVariable(symbol: string): Formula[] {
    const term = symbol.toLowerCase();
    return this.formulas.filter(f => 
      f.variables.some(v => v.symbol.toLowerCase().includes(term) || v.meaning.toLowerCase().includes(term))
    );
  }

  public searchByName(name: string): Formula[] {
    const term = name.toLowerCase();
    return this.formulas.filter(f => 
      f.name.toLowerCase().includes(term) || f.description.toLowerCase().includes(term)
    );
  }
}
