/**
 * Job Amortization Utilities
 * 
 * Calculate equipment amortization for jobs, including per-job depreciation
 * and total amortization costs with quantity multipliers.
 */

/**
 * Calculate amortization cost per job for a piece of equipment
 * 
 * Formula: (purchaseCost - residualValue) / (usefulLifeYears × jobsPerYear)
 * 
 * @param purchaseCost - Original purchase price of the equipment
 * @param usefulLifeYears - Expected lifespan in years
 * @param jobsPerYear - Estimated number of jobs per year the equipment will be used on
 * @param residualValue - Expected value at end of useful life (default 0)
 * @returns Per-job amortization cost, rounded to 4 decimal places
 * 
 * @example
 * // $10,000 mixer, 5 year life, 50 jobs/year, $500 residual
 * calculateAmortizationPerJob(10000, 5, 50, 500) // Returns 38.0000
 */
export function calculateAmortizationPerJob(
  purchaseCost: number,
  usefulLifeYears: number,
  jobsPerYear: number,
  residualValue: number = 0
): number {
  if (usefulLifeYears <= 0 || jobsPerYear <= 0) {
    return 0;
  }
  
  const depreciableValue = purchaseCost - residualValue;
  const totalJobs = usefulLifeYears * jobsPerYear;
  const amortizationPerJob = depreciableValue / totalJobs;
  
  // Round to 4 decimal places for precision
  return Math.round(amortizationPerJob * 10000) / 10000;
}

/**
 * Calculate total amortization for gear used on a job
 * 
 * Multiplies per-job amortization by quantity to get total cost for this job.
 * 
 * @param amortizationEach - Per-job amortization cost for one unit
 * @param quantity - Number of units used on this job
 * @returns Total amortization for all units, rounded to 2 decimal places (currency)
 * 
 * @example
 * // 3 mixers at $38/job each
 * calculateTotalAmortizationForGear(38.0000, 3) // Returns 114.00
 */
export function calculateTotalAmortizationForGear(
  amortizationEach: number,
  quantity: number
): number {
  const total = amortizationEach * quantity;
  
  // Round to 2 decimal places for currency
  return Math.round(total * 100) / 100;
}

/**
 * Calculate amortization with markup for replacement fund
 * 
 * Adds a percentage markup to amortization to build a replacement fund.
 * Common practice is 10-20% markup to ensure sufficient funds for replacement.
 * 
 * @param amortization - Base amortization amount
 * @param markupPercent - Markup percentage (default 10)
 * @returns Amortization with markup, rounded to 2 decimal places
 * 
 * @example
 * // $114 base amortization with 10% markup
 * calculateAmortizationWithMarkup(114.00, 10) // Returns 125.40
 */
export function calculateAmortizationWithMarkup(
  amortization: number,
  markupPercent: number = 10
): number {
  const markup = amortization * (markupPercent / 100);
  const total = amortization + markup;
  
  return Math.round(total * 100) / 100;
}

/**
 * Calculate remaining value of equipment based on accumulated amortization
 * 
 * @param purchaseCost - Original purchase price
 * @param usefulLifeYears - Expected lifespan in years
 * @param yearsUsed - Years already used
 * @param residualValue - Expected end-of-life value (default 0)
 * @returns Remaining book value
 * 
 * @example
 * // $10,000 mixer, 5 year life, used 2 years, $500 residual
 * calculateRemainingValue(10000, 5, 2, 500) // Returns 6200.00
 */
export function calculateRemainingValue(
  purchaseCost: number,
  usefulLifeYears: number,
  yearsUsed: number,
  residualValue: number = 0
): number {
  if (usefulLifeYears <= 0 || yearsUsed >= usefulLifeYears) {
    return residualValue;
  }
  
  const depreciableValue = purchaseCost - residualValue;
  const annualDepreciation = depreciableValue / usefulLifeYears;
  const accumulatedDepreciation = annualDepreciation * yearsUsed;
  const remainingValue = purchaseCost - accumulatedDepreciation;
  
  return Math.round(remainingValue * 100) / 100;
}
