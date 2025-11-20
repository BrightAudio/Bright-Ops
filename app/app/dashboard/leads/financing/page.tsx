'use client';

import { useState } from 'react';
import { FaDollarSign, FaCalculator, FaHandshake, FaFileContract } from 'react-icons/fa';

export default function FinancingPage() {
  const [loanAmount, setLoanAmount] = useState('50000');
  const [termMonths, setTermMonths] = useState('36');
  const [interestRate, setInterestRate] = useState('6.5');
  const [monthlyPayment, setMonthlyPayment] = useState('0');

  const calculatePayment = () => {
    const principal = parseFloat(loanAmount);
    const months = parseInt(termMonths);
    const rate = parseFloat(interestRate) / 100 / 12;

    if (principal && months && rate) {
      const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      setMonthlyPayment(payment.toFixed(2));
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      color: '#e5e5e5'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Equipment Financing
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '16px' }}>
          Offer flexible financing options to help your clients acquire professional audio equipment
        </p>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Payment Calculator Card */}
        <div style={{
          background: '#2a2a2a',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #3a3a3a'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <FaCalculator style={{ fontSize: '24px', color: '#667eea' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
              Payment Calculator
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Loan Amount */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Loan Amount
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af'
                }}>$</span>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2rem',
                    background: '#1a1a1a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>

            {/* Term Length */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Term (Months)
              </label>
              <input
                type="number"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#e5e5e5',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Interest Rate */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#1a1a1a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#e5e5e5',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculatePayment}
              style={{
                padding: '0.875rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Calculate Payment
            </button>

            {/* Result */}
            {monthlyPayment !== '0' && (
              <div style={{
                padding: '1.5rem',
                background: '#1a1a1a',
                borderRadius: '8px',
                border: '2px solid #667eea'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '0.25rem' }}>
                  Estimated Monthly Payment
                </div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#667eea' }}>
                  ${monthlyPayment}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financing Benefits Card */}
        <div style={{
          background: '#2a2a2a',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #3a3a3a'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <FaHandshake style={{ fontSize: '24px', color: '#667eea' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
              Why Offer Financing?
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
                🚀 Increase Sales
              </h3>
              <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
                Make high-end equipment accessible to more clients by breaking down the cost into manageable monthly payments.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
                💰 Larger Deals
              </h3>
              <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
                Clients are more likely to upgrade to premium equipment when they can finance instead of paying upfront.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
                🤝 Build Relationships
              </h3>
              <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
                Offering financing shows you're invested in your client's success and creates long-term partnerships.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
                ⚡ Competitive Edge
              </h3>
              <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
                Stand out from competitors by providing flexible payment solutions that remove barriers to purchase.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financing Options Grid */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '1.5rem' }}>
          Available Financing Plans
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Plan 1 */}
          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #3a3a3a',
            transition: 'transform 0.2s, border-color 0.2s'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#3a3a3a';
            }}
          >
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#667eea'
            }}>
              12-Month Plan
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '1rem' }}>
              Short-term financing for quick upgrades
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Interest Rate:</span>
                <span style={{ fontWeight: 600 }}>4.9%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Min Amount:</span>
                <span style={{ fontWeight: 600 }}>$5,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Max Amount:</span>
                <span style={{ fontWeight: 600 }}>$50,000</span>
              </div>
            </div>
          </div>

          {/* Plan 2 */}
          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #3a3a3a',
            transition: 'transform 0.2s, border-color 0.2s'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#3a3a3a';
            }}
          >
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#667eea'
            }}>
              24-Month Plan
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '1rem' }}>
              Popular choice for mid-range equipment
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Interest Rate:</span>
                <span style={{ fontWeight: 600 }}>5.9%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Min Amount:</span>
                <span style={{ fontWeight: 600 }}>$10,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Max Amount:</span>
                <span style={{ fontWeight: 600 }}>$100,000</span>
              </div>
            </div>
          </div>

          {/* Plan 3 */}
          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '2px solid #667eea',
            transition: 'transform 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              RECOMMENDED
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#667eea'
            }}>
              36-Month Plan
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '1rem' }}>
              Best value for large purchases
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Interest Rate:</span>
                <span style={{ fontWeight: 600 }}>6.5%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Min Amount:</span>
                <span style={{ fontWeight: 600 }}>$15,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Max Amount:</span>
                <span style={{ fontWeight: 600 }}>$250,000</span>
              </div>
            </div>
          </div>

          {/* Plan 4 */}
          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #3a3a3a',
            transition: 'transform 0.2s, border-color 0.2s'
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#3a3a3a';
            }}
          >
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: '#667eea'
            }}>
              48-Month Plan
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '1rem' }}>
              Extended term for premium systems
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Interest Rate:</span>
                <span style={{ fontWeight: 600 }}>7.2%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Min Amount:</span>
                <span style={{ fontWeight: 600 }}>$25,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Max Amount:</span>
                <span style={{ fontWeight: 600 }}>$500,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Process */}
      <div style={{
        background: '#2a2a2a',
        borderRadius: '12px',
        padding: '2rem',
        border: '1px solid #3a3a3a'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          <FaFileContract style={{ fontSize: '24px', color: '#667eea' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
            How It Works
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white'
            }}>
              1
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
              Submit Application
            </h3>
            <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
              Client fills out a simple financing application with basic business info
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white'
            }}>
              2
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
              Quick Approval
            </h3>
            <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
              Get approval decision within 24-48 hours with competitive rates
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white'
            }}>
              3
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
              Close the Deal
            </h3>
            <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
              Sign documents and get your equipment immediately, no delays
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '24px',
              fontWeight: 700,
              color: 'white'
            }}>
              4
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0.5rem' }}>
              Easy Payments
            </h3>
            <p style={{ color: '#9ca3af', margin: 0, lineHeight: '1.6' }}>
              Automatic monthly payments keep everything simple and hassle-free
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
