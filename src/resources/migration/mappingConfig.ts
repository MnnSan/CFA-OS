export const READING_MAPPING: Record<string, string> = {
  // Common Core
  '1.1 - Asset Allocation': 'read-aa-principles',
  '1.2 - Capital Market Expectations (both Part 1 and Part 2)': 'read-cme-1', // Handled via partition logic in migrate.ts
  '2.1 - Options Strategies': 'read-deriv-options',
  '2.2 - Swaps Forwards and Futures Strategies': 'read-deriv-swaps',
  '2.3 - Currency Management: An Introduction': 'read-deriv-currency',
  '3.1 Overview of private wealth management': 'read-pc-pwm',
  '3.2 Asset Allocation to Alternative Investments': 'read-pc-alternatives',
  '3.3 - Overview of Equity Portfolio Management': 'read-pc-equity',
  '3.4 - Overview of Fixed income portfolio management': 'read-pc-fixed-income',
  '3.4.1 - Victory Project Revision Classes': 'read-pc-fixed-income',
  '3.5 - Trading Cost & Electronics Markets': 'read-pc-trading-costs',
  '3.6 - Portfolio management for institutional investors': 'read-pc-institutional',
  '3.7 - Case Study in Portfolio Management : Institutional (SWF)': 'read-pc-inst-swf',
  '4.1 - Portfolio Performance Evaluation': 'read-perf-evaluation',
  '4.2 - Investment Manager Selection': 'read-perf-selection',
  '4.3 - Overview of GIPS': 'read-perf-gips',
  '5.1 - Asset manager code': 'read-eth-asset-code',
  '5.2 - Ethics: Application of the Code and Standards': 'read-eth-apply',
  '5.4  CFA Ethics Amendment': 'read-eth-apply',
  'Constructed Response Sessions': 'read-eth-apply',

  // Portfolio Management Pathway
  '3.3.1 - Passive Equity Investing': 'read-path-index-eq',
  '3.3.2 - Active Equity Investing: Strategies': 'read-path-active-eq',
  '3.3.3 - Active Equity Investing: Portfolio Construction': 'read-path-active-eq-const',
  '3.4.1 - Liability driven and index based fixed income strategies': 'read-path-ldi',
  '3.4.2 - Fixed-income active management: yield curve strategies': 'read-path-yc',
  '3.4.3 - Fixed-income active management: credit strategies': 'read-path-fi-credit',
  '3.6.1 - Case study in portfolio management: institutional': 'read-path-inst-endowment',
  '4.2.1 - Trade strategy and execution': 'read-path-trade-exec',
  '6.1 Fixed-Income Active Management: Credit Strategies': 'read-path-fi-credit',
};
