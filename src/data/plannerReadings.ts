import { Reading, Subject, ReadingStudyTargets } from '../types';

export const PLANNER_SUBJECTS: any[] = [
  { id: 'sub-asset-allocation', level: 'Level III', name: 'Asset Allocation & CME', description: 'Capital market expectations and asset allocation frameworks.', code: 'AA' },
  { id: 'sub-portfolio-construction', level: 'Level III', name: 'Portfolio Construction', description: 'Equity and fixed-income portfolio management.', code: 'PC' },
  { id: 'sub-portfolio-pathway', level: 'Level III', name: 'Portfolio Pathway', description: 'Advanced portfolio strategies and risk management.', code: 'PP' },
  { id: 'sub-private-wealth', level: 'Level III', name: 'Private Wealth', description: 'Tax, estate planning, and concentrated wealth.', code: 'PW' },
  { id: 'sub-institutional', level: 'Level III', name: 'Institutional', description: 'Pension, endowment, and sovereign fund management.', code: 'IP' },
  { id: 'sub-performance', level: 'Level III', name: 'Performance', description: 'Benchmarking, attribution, and manager evaluation.', code: 'PE' },
  { id: 'sub-ethics', level: 'Level III', name: 'Ethical & Professional', description: 'Code of Ethics, Standards, and GIPS.', code: 'ET' },
  { id: 'sub-alternatives', level: 'Level III', name: 'Alternatives', description: 'Hedge funds, private equity, real estate, commodities.', code: 'AL' },
  { id: 'sub-risk-management', level: 'Level III', name: 'Risk Management', description: 'Derivatives, risk budgeting, and integrated risk.', code: 'RM' },
  { id: 'sub-case-study', level: 'Level III', name: 'Case Studies', description: 'Integrated cases and application scenarios.', code: 'CS' },
];

const t = (page: number, los: number, eocq: number, video: string, videoMin: number, weight: number): ReadingStudyTargets => ({
  pageCount: page, totalLOSCount: los, eocqCount: eocq,
  videoDurationString: video, videoDurationMinutes: videoMin, weightingFactor: weight,
});

export const PLANNER_READINGS: any[] = [
  // === ASSET ALLOCATION & CME ===
  { id: 'pln-cme-1', subjectId: 'sub-asset-allocation', number: 1, title: 'Capital Market Expectations, Part 1: Framework', description: 'Framework for developing capital market expectations.', targets: t(54, 10, 16, '01:26:17', 86.28, 1.11) },
  { id: 'pln-cme-2', subjectId: 'sub-asset-allocation', number: 2, title: 'Capital Market Expectations, Part 2: Forecasting', description: 'Forecasting tools and applications.', targets: t(51, 8, 30, '02:19:02', 139.03, 1.05) },
  { id: 'pln-aa-1', subjectId: 'sub-asset-allocation', number: 3, title: 'Overview of Asset Allocation', description: 'Strategic and tactical asset allocation principles.', targets: t(54, 10, 8, '01:12:13', 72.22, 1.11) },
  { id: 'pln-aa-2', subjectId: 'sub-asset-allocation', number: 4, title: 'Asset Allocation: Mean-Variance Optimization', description: 'MVO, Black-Litterman, and Monte Carlo simulation.', targets: t(42, 8, 14, '02:05:48', 125.80, 0.86) },
  { id: 'pln-aa-3', subjectId: 'sub-asset-allocation', number: 5, title: 'Asset Allocation: Beyond MVO', description: 'Goals-based, risk parity, and factor-based allocation.', targets: t(38, 7, 10, '01:38:22', 98.37, 0.78) },
  { id: 'pln-aa-4', subjectId: 'sub-asset-allocation', number: 6, title: 'Asset Allocation: Implementation', description: 'Rebalancing, liquidity, and implementation constraints.', targets: t(36, 6, 12, '01:15:44', 75.73, 0.74) },

  // === PORTFOLIO CONSTRUCTION ===
  { id: 'pln-eq-1', subjectId: 'sub-portfolio-construction', number: 10, title: 'Overview of Equity Portfolio Management', description: 'Passive, active, and semi-active equity strategies.', targets: t(35, 6, 11, '00:49:51', 49.85, 0.72) },
  { id: 'pln-eq-2', subjectId: 'sub-portfolio-construction', number: 11, title: 'Equity Portfolio Construction', description: 'Portfolio construction, trading costs, and implementation.', targets: t(42, 8, 14, '02:08:13', 128.22, 0.86) },
  { id: 'pln-fi-1', subjectId: 'sub-portfolio-construction', number: 12, title: 'Overview of Fixed-Income Portfolio Management', description: 'Bond portfolio strategies and yield curve positioning.', targets: t(49, 9, 12, '01:45:07', 105.12, 1.00) },
  { id: 'pln-fi-2', subjectId: 'sub-portfolio-construction', number: 13, title: 'Fixed-Income Portfolio Construction', description: 'Credit strategies, securitized debt, and derivatives.', targets: t(44, 8, 18, '02:12:30', 132.50, 0.90) },

  // === PORTFOLIO PATHWAY (advanced FI + derivatives) ===
  { id: 'pln-ldi-1', subjectId: 'sub-portfolio-pathway', number: 14, title: 'Liability-Driven and Index-Based Strategies', description: 'Immunization, cash flow matching, and index tracking.', targets: t(49, 9, 12, '07:23:30', 443.50, 26.7) },
  { id: 'pln-yc-1', subjectId: 'sub-portfolio-pathway', number: 15, title: 'Yield Curve Strategies', description: 'Bullet, barbell, ladder, and derivative overlay strategies.', targets: t(38, 7, 10, '03:15:00', 195.00, 0.78) },
  { id: 'pln-fi-deriv', subjectId: 'sub-portfolio-pathway', number: 16, title: 'Fixed-Income Derivatives', description: 'Futures, swaps, options, and swaptions for fixed income.', targets: t(36, 6, 14, '02:48:22', 168.37, 0.74) },

  // === PRIVATE WEALTH ===
  { id: 'pln-pwm-1', subjectId: 'sub-private-wealth', number: 19, title: 'Taxes and Private Wealth Management', description: 'Tax environments, asset location, and wealth transfer.', targets: t(44, 8, 12, '01:52:18', 112.30, 0.90) },
  { id: 'pln-pwm-2', subjectId: 'sub-private-wealth', number: 20, title: 'Estate Planning in Private Wealth', description: 'Trusts, wills, and cross-border estate considerations.', targets: t(36, 6, 10, '01:28:44', 88.73, 0.74) },
  { id: 'pln-pwm-3', subjectId: 'sub-private-wealth', number: 21, title: 'Concentrated Single-Asset Positions', description: 'Managing low-basis, concentrated stock positions.', targets: t(28, 5, 8, '00:52:11', 52.18, 0.57) },

  // === INSTITUTIONAL ===
  { id: 'pln-inst-1', subjectId: 'sub-institutional', number: 22, title: 'Institutional Investment Management', description: 'Pension plans, endowments, and sovereign wealth funds.', targets: t(42, 8, 14, '01:36:55', 96.92, 0.86) },
  { id: 'pln-inst-2', subjectId: 'sub-institutional', number: 23, title: 'Investment Policy Statement for Institutions', description: 'IPS construction, constraints, and governance.', targets: t(32, 6, 10, '01:12:08', 72.13, 0.65) },

  // === PERFORMANCE ===
  { id: 'pln-perf-1', subjectId: 'sub-performance', number: 24, title: 'Portfolio Performance Evaluation', description: 'Benchmarking, attribution, and performance measurement.', targets: t(46, 9, 16, '01:42:33', 102.55, 0.94) },
  { id: 'pln-perf-2', subjectId: 'sub-performance', number: 25, title: 'Performance Attribution', description: 'Factor attribution and risk-adjusted return analysis.', targets: t(34, 6, 12, '01:18:22', 78.37, 0.69) },

  // === ETHICS ===
  { id: 'pln-eth-1', subjectId: 'sub-ethics', number: 26, title: 'Code of Ethics & Standards of Professional Conduct', description: 'Code and Standards application.', targets: t(40, 8, 14, '01:22:15', 82.25, 0.82) },
  { id: 'pln-eth-2', subjectId: 'sub-ethics', number: 27, title: 'GIPS Overview', description: 'Global Investment Performance Standards.', targets: t(24, 4, 8, '00:45:30', 45.50, 0.49) },

  // === ALTERNATIVES ===
  { id: 'pln-alt-1', subjectId: 'sub-alternatives', number: 28, title: 'Alternatives: Hedge Funds', description: 'Hedge fund strategies, fees, and due diligence.', targets: t(38, 7, 12, '01:28:44', 88.73, 0.78) },
  { id: 'pln-alt-2', subjectId: 'sub-alternatives', number: 29, title: 'Alternatives: Private Equity & Real Estate', description: 'PE fund structures, valuation, and real estate.', targets: t(42, 8, 10, '01:35:22', 95.37, 0.86) },

  // === RISK MANAGEMENT ===
  { id: 'pln-risk-1', subjectId: 'sub-risk-management', number: 30, title: 'Risk Management', description: 'Risk budgeting, VaR, and integrated risk management.', targets: t(44, 8, 14, '01:52:30', 112.50, 0.90) },
  { id: 'pln-risk-2', subjectId: 'sub-risk-management', number: 31, title: 'Derivatives in Risk Management', description: 'Derivatives strategies for institutional portfolios.', targets: t(36, 6, 10, '01:22:18', 82.30, 0.74) },

  // === CASE STUDIES ===
  { id: 'pln-case-1', subjectId: 'sub-case-study', number: 32, title: 'Integrated Case: Asset Allocation', description: 'Comprehensive asset allocation case study.', targets: t(28, 4, 8, '00:58:12', 58.20, 0.57) },
  { id: 'pln-case-2', subjectId: 'sub-case-study', number: 33, title: 'Integrated Case: Portfolio Management', description: 'Full portfolio management integrated case.', targets: t(32, 5, 10, '01:12:44', 72.73, 0.65) },
];

export const DEFAULT_PLANNER_PROGRESS = PLANNER_READINGS.map(r => ({
  readingId: r.id,
  loggedVideoMinutes: 0,
  completedEOCQ: 0,
}));
