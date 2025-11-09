/**
 * Amortization utility functions for tracking equipment depreciation per job
 * 
 * This module calculates how much equipment cost should be recovered per job
 * based on purchase cost, useful life, and expected usage.
 */

/**
 * Calculate the amortization cost per job for a piece of equipment
 * 
 * @param purchaseCost - Original purchase price of the equipment
 * @param usefulLifeYears - Expected years the equipment will be in service
 * @param jobsPerYear - Estimated number of jobs this equipment is used on annually
 * @param residualValue - Expected resale/scrap value at end of life (default: 0)
 * @returns Amortization cost per job (rounded to 4 decimals to match DB precision)
 * 
 * @example
 * // A $10,000 mixer used 50 times/year for 5 years
 * calculateAmortizationPerJob(10000, 5, 50, 500)
 * // Returns: 38.0000 (recover $38 per job)
 */
export function calculateAmortizationPerJob(
  purchaseCost: number,
  usefulLifeYears: number,
  jobsPerYear: number,
  residualValue = 0
): number {
  if (usefulLifeYears <= 0 || jobsPerYear <= 0) return 0;
  
  const depreciableAmount = purchaseCost - residualValue;
  const totalJobs = usefulLifeYears * jobsPerYear;
  const perJobCost = depreciableAmount / totalJobs;
  
  // Round to 4 decimals to match database field precision
  return Math.round(perJobCost * 10000) / 10000;
}

/**
 * Calculate total amortization cost for multiple units of gear on a job
 * 
 * @param amortizationEach - Amortization cost per single unit
 * @param quantity - Number of units used on this job
 * @returns Total amortization for all units (rounded to 2 decimals for currency)
 * 
 * @example
 * // Using 4 speakers at $12.50 amortization each
 * calculateTotalAmortizationForGear(12.50, 4)
 * // Returns: 50.00
 */
export function calculateTotalAmortizationForGear(
  amortizationEach: number,
  quantity = 1
): number {
  const total = amortizationEach * quantity;
  
  // Round to 2 decimals for currency display
  return Math.round(total * 100) / 100;
}

/**
 * Calculate suggested markup to add to amortization for replacement fund
 * 
 * @param amortization - Base amortization amount
 * @param markupPercent - Percentage to add (default: 10% for replacement fund)
 * @returns Amortization with markup applied
 * 
 * @example
 * // Add 10% replacement fund markup to $50 amortization
 * calculateAmortizationWithMarkup(50, 10)
 * // Returns: 55.00
 */
export function calculateAmortizationWithMarkup(
  amortization: number,
  markupPercent = 10
): number {
  const markup = amortization * (markupPercent / 100);
  return Math.round((amortization + markup) * 100) / 100;
}

/**
 * Estimate remaining value of equipment based on usage
 * 
 * @param purchaseCost - Original purchase price
 * @param usefulLifeYears - Expected total useful life
 * @param yearsUsed - Years already in service
 * @param residualValue - Expected end-of-life value
 * @returns Current estimated value
 */
export function calculateRemainingValue(
  purchaseCost: number,
  usefulLifeYears: number,
  yearsUsed: number,
  residualValue = 0
): number {
  if (yearsUsed >= usefulLifeYears) return residualValue;
  
  const depreciableAmount = purchaseCost - residualValue;
  const annualDepreciation = depreciableAmount / usefulLifeYears;
  const totalDepreciation = annualDepreciation * yearsUsed;
  
  return Math.round((purchaseCost - totalDepreciation) * 100) / 100;
}
