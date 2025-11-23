import { NextRequest, NextResponse } from 'next/server';

// Simple API key authentication
function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.MOBILE_API_KEY;
  
  if (!validApiKey) {
    return { valid: false, error: 'API key not configured' };
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  return { valid: true };
}

// POST /api/mobile/calculator
// Calculate lease payment and cost estimate
export async function POST(request: NextRequest) {
  // Validate API key
  const auth = validateApiKey(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { purchaseCost, salesTax, termMonths, residualPercentage } = body;

    // Validate inputs
    if (!purchaseCost || !termMonths) {
      return NextResponse.json(
        { error: 'purchaseCost and termMonths are required' },
        { status: 400 }
      );
    }

    const cost = parseFloat(purchaseCost);
    const tax = parseFloat(salesTax || '0');
    const term = parseInt(termMonths);
    const residual = parseFloat(residualPercentage || '10');

    if (isNaN(cost) || isNaN(tax) || isNaN(term) || isNaN(residual)) {
      return NextResponse.json(
        { error: 'Invalid numeric values' },
        { status: 400 }
      );
    }

    // Calculate total cost including tax
    const totalCost = cost + (cost * (tax / 100));
    
    // Calculate residual amount (FMV)
    const residualAmount = totalCost * (residual / 100);
    
    // Calculate financed amount
    const financedAmount = totalCost - residualAmount;
    
    // Interest rate (can be made configurable)
    const annualRate = 8.9; // 8.9% annual
    const monthlyRate = annualRate / 100 / 12;
    
    // Calculate monthly payment using amortization formula
    const monthlyPayment = financedAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, term)) / 
      (Math.pow(1 + monthlyRate, term) - 1);

    // Calculate total payments and interest
    const totalPayments = monthlyPayment * term;
    const totalInterest = totalPayments - financedAmount;

    return NextResponse.json({
      success: true,
      calculation: {
        purchaseCost: cost,
        salesTax: tax,
        salesTaxAmount: cost * (tax / 100),
        totalCost: totalCost,
        termMonths: term,
        residualPercentage: residual,
        residualAmount: residualAmount,
        financedAmount: financedAmount,
        annualInterestRate: annualRate,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayments: Math.round(totalPayments * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        totalCostWithInterest: Math.round((totalPayments + residualAmount) * 100) / 100
      }
    });

  } catch (error) {
    console.error('Calculator API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate payment' },
      { status: 500 }
    );
  }
}
