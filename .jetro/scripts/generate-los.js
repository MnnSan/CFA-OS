/**
 * LOS Generator — 2027 CFA Level III Curriculum
 * Run: node .jetro/scripts/generate-los.js
 * Output: writes to stdout as a TS module
 */

const readingMap = {
  // Subject: Asset Allocation
  1: 'read-cme-1', 2: 'read-cme-2', 3: 'read-aa-overview',
  4: 'read-aa-principles', 5: 'read-aa-constraints',
  // Subject: Portfolio Construction
  6: 'read-pc-equity', 7: 'read-pc-fixed-income', 8: 'read-pc-alternatives',
  9: 'read-pc-pwm', 10: 'read-pc-institutional', 11: 'read-pc-trading-costs',
  12: 'read-pc-inst-swf',
  // Subject: Performance Measurement
  13: 'read-perf-evaluation', 14: 'read-perf-selection', 15: 'read-perf-gips',
  // Subject: Derivatives & Risk Management
  16: 'read-deriv-options', 17: 'read-deriv-swaps', 18: 'read-deriv-currency',
  // Subject: Ethical & Professional Standards
  19: 'read-eth-code', 20: 'read-eth-std-1', 21: 'read-eth-apply',
  22: 'read-eth-asset-code',
  // Subject: Portfolio Management Pathway (P-prefixed)
  P1: 'read-path-index-eq', P2: 'read-path-active-eq',
  P3: 'read-path-active-eq-const', P4: 'read-path-ldi',
  P5: 'read-path-yc', P6: 'read-path-fi-credit',
  P7: 'read-path-trade-exec', P8: 'read-path-inst-endowment',
};

// Each entry: [readingKey, losSuffix, description]
// e.g. [1, 'a', 'Discuss the role...'] -> code "LOS 1.a", id "los-1a"
const losData = [
  // ═══ SUBJECT 1: ASSET ALLOCATION ═══
  // Reading 1: Capital Market Expectations, Part 1
  [1, 'a', 'Discuss the role of, and a framework for, capital market expectations in the portfolio management process.'],
  [1, 'b', 'Discuss challenges in developing capital market forecasts.'],
  [1, 'c', 'Explain how exogenous shocks may affect economic growth trends.'],
  [1, 'd', 'Discuss the application of economic growth trend analysis to the formulation of capital market expectations.'],
  [1, 'e', 'Compare major approaches to economic forecasting.'],
  [1, 'f', 'Discuss how business cycles affect short- and long-term expectations.'],
  [1, 'g', 'Explain the relationship of inflation to the business cycle and the implications of inflation for cash, bonds, equity, and real estate returns.'],
  [1, 'h', 'Discuss the effects of monetary and fiscal policy on business cycles.'],
  [1, 'i', 'Interpret the shape of the yield curve as an economic predictor and discuss the relationship between the yield curve and fiscal and monetary policy.'],
  [1, 'j', 'Identify and interpret macroeconomic, interest rate, and exchange rate linkages between economies.'],

  // Reading 2: Capital Market Expectations, Part 2
  [2, 'a', 'Discuss approaches to setting expectations for fixed-income returns.'],
  [2, 'b', 'Discuss risks faced by investors in emerging market fixed-income securities and the country risk analysis techniques used to evaluate emerging market economies.'],
  [2, 'c', 'Discuss approaches to setting expectations for equity investment market returns.'],
  [2, 'd', 'Discuss risks faced by investors in emerging market equity securities.'],
  [2, 'e', 'Explain how economic and competitive factors can affect expectations for real estate investment markets and sector returns.'],
  [2, 'f', 'Discuss major approaches to forecasting exchange rates.'],
  [2, 'g', 'Discuss methods of forecasting volatility.'],
  [2, 'h', 'Recommend and justify changes in the component weights of a global investment portfolio based on trends and expected changes in macroeconomic factors.'],

  // Reading 3: Overview of Asset Allocation
  [3, 'a', 'Describe elements of effective investment governance and investment governance considerations in asset allocation.'],
  [3, 'b', 'Formulate an economic balance sheet for a client and interpret its implications for asset allocation.'],
  [3, 'c', 'Compare the investment objectives of asset-only, liability-relative, and goals-based asset allocation approaches.'],
  [3, 'd', 'Contrast concepts of risk relevant to asset-only, liability-relative, and goals-based asset allocation approaches.'],
  [3, 'e', 'Explain how asset classes are used to represent exposures to systematic risk and discuss criteria for asset class specification.'],
  [3, 'f', 'Explain the use of risk factors in asset allocation and their relation to traditional asset class-based approaches.'],
  [3, 'g', 'Recommend and justify an asset allocation based on an investor\u2019s objectives and constraints.'],
  [3, 'h', 'Describe the use of the global market portfolio as a baseline portfolio in asset allocation.'],
  [3, 'i', 'Discuss strategic implementation choices in asset allocation, including passive/active choices and vehicles for implementing passive and active mandates.'],
  [3, 'j', 'Discuss strategic considerations in rebalancing asset allocations.'],

  // Reading 4: Principles of Asset Allocation
  [4, 'a', 'Describe and evaluate the use of mean\u2013variance optimization in asset allocation.'],
  [4, 'b', 'Recommend and justify an asset allocation using mean\u2013variance optimization.'],
  [4, 'c', 'Interpret and evaluate an asset allocation in relation to an investor\u2019s economic balance sheet.'],
  [4, 'd', 'Recommend and justify an asset allocation based on the global market portfolio.'],
  [4, 'e', 'Discuss the use of Monte Carlo simulation and scenario analysis to evaluate the robustness of an asset allocation.'],
  [4, 'f', 'Discuss asset class liquidity considerations in asset allocation.'],
  [4, 'g', 'Explain absolute and relative risk budgets and their use in determining and implementing an asset allocation.'],
  [4, 'h', 'Describe how client needs and preferences regarding investment risks can be incorporated into asset allocation.'],
  [4, 'i', 'Describe the use of investment factors in constructing and analyzing an asset allocation.'],
  [4, 'j', 'Describe and evaluate characteristics of liabilities that are relevant to asset allocation.'],
  [4, 'k', 'Discuss approaches to liability-relative asset allocation.'],
  [4, 'l', 'Recommend and justify a liability-relative asset allocation.'],
  [4, 'm', 'Recommend and justify an asset allocation using a goals-based approach.'],
  [4, 'n', 'Describe and evaluate heuristic and other approaches to asset allocation.'],
  [4, 'o', 'Discuss factors affecting rebalancing policy.'],

  // Reading 5: Asset Allocation with Real-World Constraints
  [5, 'a', 'Discuss asset size, liquidity needs, time horizon, and regulatory or other considerations as constraints on asset allocation.'],
  [5, 'b', 'Discuss tax considerations in asset allocation and rebalancing.'],
  [5, 'c', 'Recommend and justify revisions to an asset allocation given change(s) in investment objectives and/or constraints.'],
  [5, 'd', 'Discuss the use of short-term shifts in asset allocation.'],
  [5, 'e', 'Identify behavioral biases that arise in asset allocation and recommend methods to overcome them.'],

  // ═══ SUBJECT 2: PORTFOLIO CONSTRUCTION ═══
  // Reading 6: Overview of Equity Portfolio Management
  [6, 'a', 'Describe the roles of equities in the overall portfolio.'],
  [6, 'b', 'Describe how an equity manager\u2019s investment universe can be segmented.'],
  [6, 'c', 'Describe the types of income and costs associated with owning and managing an equity portfolio and their potential effects on portfolio performance.'],
  [6, 'd', 'Describe the potential benefits of shareholder engagement and the role an equity manager might play in shareholder engagement.'],
  [6, 'e', 'Describe rationales for equity investment across the active management spectrum.'],
  [6, 'f', 'Discuss considerations in choosing a benchmark for an equity portfolio.'],

  // Reading 7: Overview of Fixed-Income Portfolio Management
  [7, 'a', 'Discuss roles of fixed-income securities in portfolios and how fixed-income mandates may be classified.'],
  [7, 'b', 'Describe fixed-income portfolio measures of risk and return as well as correlation characteristics.'],
  [7, 'c', 'Describe bond market liquidity, including the differences among market sub-sectors, and discuss the effect of liquidity on fixed-income portfolio management.'],
  [7, 'd', 'Describe and interpret a model for fixed-income returns.'],
  [7, 'e', 'Discuss the use of leverage, alternative methods for leveraging, and risks that leverage creates in fixed-income portfolios.'],
  [7, 'f', 'Discuss differences in managing fixed-income portfolios for taxable and tax-exempt investors.'],
  [7, 'g', 'Describe liability-driven investing.'],
  [7, 'h', 'Describe the strategy of cash flow matching.'],
  [7, 'i', 'Describe construction, benefits, limitations, and risk\u2013return characteristics of a laddered bond portfolio.'],

  // Reading 8: Asset Allocation to Alternative Investments
  [8, 'a', 'Explain the roles that alternative investments play in multi-asset portfolios.'],
  [8, 'b', 'Compare alternative investments and bonds as risk mitigators in relation to a long equity position.'],
  [8, 'c', 'Compare traditional and risk-based approaches to defining the investment opportunity set, including alternative investments.'],
  [8, 'd', 'Discuss investment considerations that are important in allocating to different types of alternative investments.'],
  [8, 'e', 'Discuss suitability considerations in allocating to alternative investments.'],
  [8, 'f', 'Discuss approaches to asset allocation to alternative investments.'],
  [8, 'g', 'Discuss the importance of liquidity planning in allocating to alternative investments.'],
  [8, 'h', 'Discuss considerations in monitoring alternative investment programs.'],

  // Reading 9: An Overview of Private Wealth Management
  [9, 'a', 'Discuss the different types of individual wealth and how wealth is created and distributed globally.'],
  [9, 'b', 'Evaluate how changes in human capital, financial capital, and economic net worth across the financial stages of an individual\u2019s life influence their financial decision making.'],
  [9, 'c', 'Justify how returns, risks, objectives, and constraints for individuals relate to their human and financial capital.'],
  [9, 'd', 'Evaluate how various types of taxes imposed on individual investors and the impact of inflation influence investment decisions.'],
  [9, 'e', 'Discuss the differences between private and institutional clients and formulate an appropriate Investment Policy Statement for private clients.'],

  // Reading 10: Portfolio Management for Institutional Investors
  [10, 'a', 'Discuss common characteristics of institutional investors as a group.'],
  [10, 'b', 'Discuss investment policy of institutional investors.'],
  [10, 'c', 'Discuss the stakeholders in the portfolio, the liabilities, the investment time horizons, and the liquidity needs of different types of institutional investors.'],
  [10, 'd', 'Describe the focus of legal, regulatory, and tax constraints affecting different types of institutional investors.'],
  [10, 'e', 'Evaluate risk considerations of private defined benefit (DB) pension plans.'],
  [10, 'f', 'Evaluate the investment policy statement of an institutional investor.'],
  [10, 'g', 'Evaluate the investment portfolio of a private DB plan, sovereign wealth fund, university endowment, and private foundation.'],
  [10, 'h', 'Describe considerations affecting the balance sheet management of banks and insurers.'],

  // Reading 11: Trading Costs and Electronic Markets
  [11, 'a', 'Explain the components of execution costs, including explicit and implicit costs.'],
  [11, 'b', 'Calculate and interpret effective spreads and VWAP transaction cost estimates.'],
  [11, 'c', 'Describe the implementation shortfall approach to transaction cost measurement.'],
  [11, 'd', 'Describe factors driving the development of electronic trading systems.'],
  [11, 'e', 'Describe market fragmentation.'],
  [11, 'f', 'Identify and contrast the types of electronic traders.'],
  [11, 'g', 'Describe characteristics and uses of electronic trading systems.'],
  [11, 'h', 'Describe comparative advantages of low-latency traders.'],
  [11, 'i', 'Describe the risks associated with electronic trading and how regulators mitigate them.'],
  [11, 'j', 'Describe abusive trading practices that real-time surveillance of markets may detect.'],

  // Reading 12: Case Study in Portfolio Management: Institutional (SWF)
  [12, 'a', 'Discuss financial risks associated with the portfolio strategy of an institutional investor.'],
  [12, 'b', 'Discuss environmental and social risks associated with the portfolio strategy of an institutional investor.'],
  [12, 'c', 'Analyze and evaluate the financial and non-financial risk exposures in the portfolio strategy of an institutional investor.'],
  [12, 'd', 'Discuss various methods to manage the risks that arise on long-term direct investments of an institutional investor.'],
  [12, 'e', 'Evaluate strengths and weaknesses of an enterprise risk management system and recommend improvements.'],

  // ═══ SUBJECT 3: PERFORMANCE MEASUREMENT ═══
  // Reading 13: Portfolio Performance Evaluation
  [13, 'a', 'Explain the following components of portfolio evaluation and their interrelationships: performance measurement, performance attribution, and performance appraisal.'],
  [13, 'b', 'Describe attributes of an effective attribution process.'],
  [13, 'c', 'Contrast return attribution and risk attribution; contrast macro and micro return attribution.'],
  [13, 'd', 'Describe returns-based, holdings-based, and transactions-based performance attribution, including advantages and disadvantages of each.'],
  [13, 'e', 'Interpret the sources of portfolio returns using a specified attribution approach.'],
  [13, 'f', 'Interpret the output from fixed-income attribution analyses.'],
  [13, 'g', 'Discuss considerations in selecting a risk attribution approach.'],
  [13, 'h', 'Identify and interpret investment results attributable to the asset owner versus those attributable to the investment manager.'],
  [13, 'i', 'Discuss uses of liability-based benchmarks.'],
  [13, 'j', 'Describe types of asset-based benchmarks.'],
  [13, 'k', 'Discuss tests of benchmark quality.'],
  [13, 'l', 'Describe the impact of benchmark misspecification on attribution and appraisal analysis.'],
  [13, 'm', 'Describe problems that arise in benchmarking alternative investments.'],
  [13, 'n', 'Calculate and interpret the Sortino ratio, the appraisal ratio, upside/downside capture ratios, maximum drawdown, and drawdown duration.'],
  [13, 'o', 'Describe limitations of appraisal measures and related metrics.'],
  [13, 'p', 'Evaluate the skill of an investment manager.'],

  // Reading 14: Investment Manager Selection
  [14, 'a', 'Describe the components of a manager selection process, including due diligence.'],
  [14, 'b', 'Contrast Type I and Type II errors in manager hiring and continuation decisions.'],
  [14, 'c', 'Describe uses of returns-based and holdings-based style analysis in investment manager selection.'],
  [14, 'd', 'Describe uses of the upside capture ratio, downside capture ratio, maximum drawdown, drawdown duration, and up/down capture in evaluating managers.'],
  [14, 'e', 'Evaluate a manager\u2019s investment philosophy and investment decision-making process.'],
  [14, 'f', 'Discuss how behavioral factors affect investment team decision making, and recommend techniques for mitigating their effects.'],
  [14, 'g', 'Evaluate the costs and benefits of pooled investment vehicles and separate accounts.'],
  [14, 'h', 'Compare types of investment manager contracts, including their major provisions and advantages and disadvantages.'],
  [14, 'i', 'Describe the three basic forms of performance-based fees.'],
  [14, 'j', 'Analyze and interpret a sample performance-based fee schedule.'],

  // Reading 15: Overview of the Global Investment Performance Standards
  [15, 'a', 'Discuss the objectives and scope of the GIPS standards and their benefits to prospective clients and investors, as well as investment managers.'],
  [15, 'b', 'Explain the fundamentals of compliance with the GIPS standards, including the definition of the firm and the firm\u2019s definition of discretion.'],
  [15, 'c', 'Discuss requirements of the GIPS standards with respect to return calculation methodologies, including the treatment of external cash flows, cash and cash equivalents, and expenses and fees.'],
  [15, 'd', 'Explain the recommended valuation hierarchy of the GIPS standards.'],
  [15, 'e', 'Explain requirements of the GIPS standards with respect to composite return calculations, including methods for asset-weighting portfolio returns.'],
  [15, 'f', 'Explain the meaning of \u201Cdiscretionary\u201D in the context of composite construction and, given a description of the relevant facts, determine whether a portfolio is likely to be considered discretionary.'],
  [15, 'g', 'Explain the role of investment mandates, objectives, or strategies in the construction of composites.'],
  [15, 'h', 'Explain requirements of the GIPS standards with respect to composite construction, including switching portfolios among composites, the timing of the inclusion of new portfolios in composites, and the timing of the exclusion of terminated portfolios from composites.'],
  [15, 'i', 'Explain requirements of the GIPS standards with respect to presentation and reporting.'],
  [15, 'j', 'Explain the conditions under which the performance of a past firm or affiliation may be linked to or used to represent the historical performance of a new or acquiring firm.'],
  [15, 'k', 'Discuss the purpose, scope, and process of verification.'],

  // ═══ SUBJECT 4: DERIVATIVES AND RISK MANAGEMENT ═══
  // Reading 16: Options Strategies
  [16, 'a', 'Demonstrate how an asset\u2019s returns may be replicated by using options.'],
  [16, 'b', 'Discuss the investment objective(s), structure, payoff, risk(s), value at expiration, profit, maximum profit, maximum loss, and breakeven underlying price at expiration of a covered call position.'],
  [16, 'c', 'Discuss the investment objective(s), structure, payoff, risk(s), value at expiration, profit, maximum profit, maximum loss, and breakeven underlying price at expiration of a protective put position.'],
  [16, 'd', 'Compare the delta of covered call and protective put positions with the position of being long an asset and short a forward on the underlying asset.'],
  [16, 'e', 'Compare the effect of buying a call on a short underlying position with the effect of selling a put on a short underlying position.'],
  [16, 'f', 'Discuss the investment objective(s), structure, payoffs, risk(s), value at expiration, profit, maximum profit, maximum loss, and breakeven underlying price at expiration of the following option strategies: bull spread, bear spread, straddle, and collar.'],
  [16, 'g', 'Describe uses of calendar spreads.'],
  [16, 'h', 'Discuss volatility skew and smile.'],
  [16, 'i', 'Identify and evaluate appropriate option strategies consistent with given investment objectives.'],
  [16, 'j', 'Demonstrate the use of options to achieve targeted equity risk exposures.'],

  // Reading 17: Swaps, Forwards, and Futures Strategies
  [17, 'a', 'Demonstrate how interest rate swaps, forwards, and futures can be used to modify a portfolio\u2019s risk and return.'],
  [17, 'b', 'Demonstrate how currency swaps, forwards, and futures can be used to modify a portfolio\u2019s risk and return.'],
  [17, 'c', 'Demonstrate how equity swaps, forwards, and futures can be used to modify a portfolio\u2019s risk and return.'],
  [17, 'd', 'Demonstrate the use of volatility derivatives and variance swaps.'],
  [17, 'e', 'Demonstrate the use of derivatives to achieve targeted equity and interest rate risk exposures.'],
  [17, 'f', 'Demonstrate the use of derivatives in asset allocation, rebalancing, and inferring market expectations.'],

  // Reading 18: Currency Management: An Introduction
  [18, 'a', 'Analyze the effects of currency movements on portfolio risk and return.'],
  [18, 'b', 'Discuss strategic choices in currency management.'],
  [18, 'c', 'Formulate an appropriate currency management program given financial market conditions and portfolio objectives and constraints.'],
  [18, 'd', 'Compare active currency trading strategies based on economic fundamentals, technical analysis, carry-trade, and volatility trading.'],
  [18, 'e', 'Describe how changes in factors underlying active trading strategies affect tactical trading decisions.'],
  [18, 'f', 'Describe how forward contracts and fx (foreign exchange) swaps are used to adjust hedge ratios.'],
  [18, 'g', 'Describe trading strategies used to reduce hedging costs and modify the risk\u2013return characteristics of a foreign-currency portfolio.'],
  [18, 'h', 'Describe the use of cross-hedges, macro-hedges, and minimum-variance-hedge ratios in portfolios exposed to multiple foreign currencies.'],
  [18, 'i', 'Discuss challenges for managing emerging market currency exposures.'],

  // ═══ SUBJECT 5: ETHICAL AND PROFESSIONAL STANDARDS ═══
  // Reading 19: Code of Ethics and Standards of Professional Conduct
  [19, 'a', 'Describe the structure of the CFA Institute Professional Conduct Program and the disciplinary review process for the enforcement of the CFA Institute Code of Ethics and Standards of Professional Conduct.'],
  [19, 'b', 'Explain the ethical responsibilities required by the Code and Standards, including the subsections of each standard.'],

  // Reading 20: Guidance for Standards I\u2013VII
  [20, 'a', 'Demonstrate a thorough knowledge of the CFA Institute Code of Ethics and Standards of Professional Conduct by interpreting the Code and Standards in various situations involving issues of professional integrity.'],
  [20, 'b', 'Recommend practices and procedures designed to prevent violations of the Code and Standards.'],

  // Reading 21: Application of the Code and Standards: Level III
  [21, 'a', 'Evaluate practices, policies, and conduct relative to the CFA Institute Code of Ethics and Standards of Professional Conduct.'],
  [21, 'b', 'Explain how the practices, policies, or conduct does or does not violate the CFA Institute Code of Ethics and Standards of Professional Conduct.'],

  // Reading 22: Asset Manager Code of Professional Conduct
  [22, 'a', 'Explain the purpose of the Asset Manager Code and the benefits that may accrue to a firm that adopts the Code.'],
  [22, 'b', 'Explain the ethical and professional responsibilities required by the six General Principles of Conduct of the Asset Manager Code.'],
  [22, 'c', 'Determine whether an asset manager\u2019s practices and procedures are consistent with the Asset Manager Code.'],
  [22, 'd', 'Recommend practices and procedures designed to prevent violations of the Asset Manager Code.'],

  // ═══ SUBJECT 6: PORTFOLIO MANAGEMENT PATHWAY ═══
  // Reading P1: Index-Based Equity Strategies
  ['P1', 'a', 'Compare factor-based strategies to market-capitalization-weighted indexing.'],
  ['P1', 'b', 'Compare different approaches to index-based equity strategies.'],
  ['P1', 'c', 'Compare different approaches to index-based equity investing.'],
  ['P1', 'd', 'Compare the full replication, stratified sampling, and optimization approaches for the construction of index-based equity portfolios.'],
  ['P1', 'e', 'Discuss potential causes of tracking error and methods to control tracking error for index-based equity portfolios.'],
  ['P1', 'f', 'Explain sources of return and risk to an index-based equity portfolio.'],

  // Reading P2: Active Equity Investing: Strategies
  ['P2', 'a', 'Compare fundamental and quantitative approaches to active management.'],
  ['P2', 'b', 'Analyze bottom-up active strategies, including their rationale and associated processes.'],
  ['P2', 'c', 'Analyze top-down active strategies, including their rationale and associated processes.'],
  ['P2', 'd', 'Analyze factor-based active strategies, including their rationale and associated processes.'],
  ['P2', 'e', 'Analyze activist strategies, including their rationale and associated processes.'],
  ['P2', 'f', 'Describe active strategies based on statistical arbitrage and market microstructure.'],
  ['P2', 'g', 'Describe how fundamental active investment strategies are created.'],
  ['P2', 'h', 'Describe how quantitative active investment strategies are created.'],
  ['P2', 'i', 'Discuss equity investment style classifications.'],

  // Reading P3: Active Equity Investing: Portfolio Construction
  ['P3', 'a', 'Describe elements of a manager\u2019s investment philosophy that influence the portfolio construction process.'],
  ['P3', 'b', 'Discuss approaches for constructing actively managed equity portfolios.'],
  ['P3', 'c', 'Distinguish between Active Share and active risk and discuss how each measure relates to a manager\u2019s investment strategy.'],
  ['P3', 'd', 'Discuss the application of risk budgeting concepts in portfolio construction.'],
  ['P3', 'e', 'Discuss risk measures that are incorporated in equity portfolio construction and describe how limits set on these measures affect portfolio construction.'],
  ['P3', 'f', 'Discuss how assets under management, position size, market liquidity, and portfolio turnover affect equity portfolio construction decisions.'],
  ['P3', 'g', 'Evaluate the efficiency of a portfolio structure given its investment mandate.'],
  ['P3', 'h', 'Discuss the long-only, long extension, long/short, and equitized market-neutral approaches to equity portfolio construction, including their risks, costs, and effects on potential alphas.'],

  // Reading P4: Liability-Driven and Index-Based Strategies
  ['P4', 'a', 'Evaluate strategies for managing a single liability.'],
  ['P4', 'b', 'Compare strategies for a single liability and for multiple liabilities, including alternative means of implementation.'],
  ['P4', 'c', 'Evaluate liability-based strategies under various interest rate scenarios and select a strategy to achieve a portfolio\u2019s objectives.'],
  ['P4', 'd', 'Explain risks associated with managing a portfolio against a liability structure.'],
  ['P4', 'e', 'Discuss bond indexes and the challenges of managing a fixed-income portfolio to mimic the characteristics of a bond index.'],
  ['P4', 'f', 'Compare alternative methods for establishing bond market exposure passively.'],
  ['P4', 'g', 'Discuss criteria for selecting a benchmark and justify the selection of a benchmark.'],

  // Reading P5: Yield Curve Strategies
  ['P5', 'a', 'Describe the factors affecting fixed-income portfolio returns due to a change in benchmark yields.'],
  ['P5', 'b', 'Formulate a portfolio positioning strategy given forward interest rates and an interest rate view that coincides with the market view.'],
  ['P5', 'c', 'Formulate a portfolio positioning strategy given forward interest rates and an interest rate view that diverges from the market view in terms of rate level, slope, and shape.'],
  ['P5', 'd', 'Formulate a portfolio positioning strategy based upon expected changes in interest rate volatility.'],
  ['P5', 'e', 'Evaluate a portfolio\u2019s sensitivity using key rate durations of the portfolio and its benchmark.'],
  ['P5', 'f', 'Discuss yield curve strategies across currencies.'],
  ['P5', 'g', 'Evaluate the expected return and risks of a yield curve strategy.'],

  // Reading P6: Fixed-Income Active Management: Credit Strategies
  ['P6', 'a', 'Describe risk considerations for spread-based fixed-income portfolios.'],
  ['P6', 'b', 'Discuss the advantages and disadvantages of credit spread measures for spread-based fixed-income portfolios, and explain why option-adjusted spread is considered the most appropriate measure.'],
  ['P6', 'c', 'Discuss bottom-up approaches to credit strategies.'],
  ['P6', 'd', 'Discuss top-down approaches to credit strategies.'],
  ['P6', 'e', 'Discuss liquidity risk in credit markets and how liquidity risk can be managed in a credit portfolio.'],
  ['P6', 'f', 'Describe how to assess and manage tail risk in credit portfolios.'],
  ['P6', 'g', 'Discuss the use of credit default swap strategies in active fixed-income portfolio management.'],
  ['P6', 'h', 'Discuss various portfolio positioning strategies that managers can use to implement a specific credit spread view.'],
  ['P6', 'i', 'Discuss considerations in constructing and managing portfolios across international credit markets.'],
  ['P6', 'j', 'Describe the use of structured financial instruments as an alternative to corporate bonds in credit portfolios.'],
  ['P6', 'k', 'Describe key inputs, outputs, and considerations in using analytical tools to manage fixed-income portfolios.'],

  // Reading P7: Trade Strategy and Execution
  ['P7', 'a', 'Discuss motivations to trade and how they relate to trading strategy.'],
  ['P7', 'b', 'Discuss inputs to the selection of a trading strategy.'],
  ['P7', 'c', 'Compare benchmarks for trade execution.'],
  ['P7', 'd', 'Recommend and justify a trading strategy (given relevant facts).'],
  ['P7', 'e', 'Describe factors that typically determine the selection of a trading algorithm class.'],
  ['P7', 'f', 'Contrast key characteristics of the following markets in relation to trade implementation: equity, fixed income, options and futures, OTC derivatives, and spot currency.'],
  ['P7', 'g', 'Explain how trade costs are measured and determine the cost of a trade.'],
  ['P7', 'h', 'Evaluate the execution of a trade.'],
  ['P7', 'i', 'Evaluate a firm\u2019s trading procedures, including processes, disclosures, and record keeping with respect to good governance.'],

  // Reading P8: Case Study in Portfolio Management: Institutional
  ['P8', 'a', 'Discuss tools for managing portfolio liquidity risk.'],
  ['P8', 'b', 'Discuss capture of the illiquidity premium as a long-term investment strategy.'],
  ['P8', 'c', 'Analyze asset allocation and portfolio construction in relation to liquidity needs and risk and return requirements and recommend actions to address identified needs.'],
  ['P8', 'd', 'Demonstrate the application of the Code of Ethics and Standards of Professional Conduct regarding the actions of individuals involved in manager selection.'],
  ['P8', 'e', 'Analyze the costs and benefits of derivatives versus cash market techniques for establishing or modifying asset class or risk exposures.'],
  ['P8', 'f', 'Demonstrate the use of derivatives overlays in tactical asset allocation and rebalancing.'],
  ['P8', 'g', 'Discuss ESG considerations in managing long-term institutional portfolios.'],
];

// ── Generate output ──
const lines = [
  '// Auto-generated by .jetro/scripts/generate-los.js',
  '// Do not edit manually.',
  'import { LearningOutcomeStatement } from \'../../../../types\';',
  '',
  'export const SEED_2027_LOS: LearningOutcomeStatement[] = [',
];

let order = 0;
for (const [readingKey, suffix, desc] of losData) {
  order++;
  const readingId = readingMap[readingKey];
  const code = `LOS ${readingKey}.${suffix}`;
  const id = `los-${String(readingKey).toLowerCase()}${suffix}`;

  lines.push(`  {`);
  lines.push(`    id: '${id}',`);
  lines.push(`    readingId: '${readingId}',`);
  lines.push(`    code: '${code}',`);
  lines.push(`    statement: '${desc.replace(/'/g, "\\'")}',`);
  lines.push(`    description: '${desc.replace(/'/g, "\\'")}',`);
  lines.push(`    difficulty: null,`);
  lines.push(`    status: 'Not Started',`);
  lines.push(`    confidence: null,`);
  lines.push(`    bookmarked: false,`);
  lines.push(`    estimatedHours: 0.5,`);
  lines.push(`    order: ${order},`);
  lines.push(`    enabled: true,`);
  lines.push(`  },`);
}

lines.push('];');
lines.push('');
lines.push(`// Total LOS: ${order}`);

console.log(lines.join('\n'));
