'use client';

import { useState, useEffect } from 'react';
import { FaDollarSign, FaCalculator, FaFileSignature, FaChartLine } from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';

export default function FinancingPage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'applications' | 'active' | 'payments'>('calculator');
  
  // Calculator state
  const [loanAmount, setLoanAmount] = useState('50000');
  const [termMonths, setTermMonths] = useState('36');
  const [interestRate, setInterestRate] = useState('6.5');
  const [monthlyPayment, setMonthlyPayment] = useState('0');
  
  // Data state
  const [applications, setApplications] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const [newApp, setNewApp] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    business_name: '',
    loan_amount: '',
    term_months: '36',
    interest_rate: '6.5',
    equipment_description: ''
  });

  useEffect(() => {
    loadApplications();
    loadActiveLoans();
    loadPayments();
  }, []);

  async function loadApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from('financing_applications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setApplications(data);
    setLoading(false);
  }

  async function loadActiveLoans() {
    const { data, error } = await supabase
      .from('financing_applications')
      .select('*')
      .eq('status', 'active')
      .order('next_payment_due', { ascending: true });
    
    if (!error && data) setActiveLoans(data);
  }

  async function loadPayments() {
    const { data, error } = await supabase
      .from('financing_payments')
      .select(`
        *,
        application:financing_applications(client_name, business_name)
      `)
      .order('due_date', { ascending: false })
      .limit(50);
    
    if (!error && data) setPayments(data);
  }

  async function createApplication() {
    const principal = parseFloat(newApp.loan_amount);
    const months = parseInt(newApp.term_months);
    const rate = parseFloat(newApp.interest_rate) / 100 / 12;
    const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);

    const { data, error } = await supabase
      .from('financing_applications')
      .insert({
        ...newApp,
        loan_amount: principal,
        monthly_payment: payment,
        remaining_balance: principal,
        status: 'pending'
      })
      .select()
      .single();

    if (!error && data) {
      setApplications([data, ...applications]);
      setShowNewAppForm(false);
      setNewApp({
        client_name: '',
        client_email: '',
        client_phone: '',
        business_name: '',
        loan_amount: '',
        term_months: '36',
        interest_rate: '6.5',
        equipment_description: ''
      });
    }
  }

  async function updateApplicationStatus(id: string, status: string) {
    const updates: any = { status };
    
    if (status === 'approved') {
      updates.approval_date = new Date().toISOString();
      updates.contract_start_date = new Date().toISOString().split('T')[0];
      
      const app = applications.find(a => a.id === id);
      if (app) {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + app.term_months);
        updates.contract_end_date = endDate.toISOString().split('T')[0];
        
        const firstPayment = new Date();
        firstPayment.setMonth(firstPayment.getMonth() + 1);
        updates.first_payment_date = firstPayment.toISOString().split('T')[0];
        updates.next_payment_due = firstPayment.toISOString().split('T')[0];
      }
    }

    await supabase.from('financing_applications').update(updates).eq('id', id);
    loadApplications();
    loadActiveLoans();
  }

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
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', color: '#e5e5e5' }}>
      {/* Header with Tabs */}
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
        <p style={{ color: '#9ca3af', fontSize: '16px', marginBottom: '1.5rem' }}>
          Manage financing applications, active loans, and payment tracking
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #3a3a3a', marginBottom: '2rem' }}>
          {[
            { id: 'calculator', label: 'Calculator', icon: <FaCalculator /> },
            { id: 'applications', label: 'Applications', icon: <FaFileSignature /> },
            { id: 'active', label: 'Active Loans', icon: <FaChartLine /> },
            { id: 'payments', label: 'Payments', icon: <FaDollarSign /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: `3px solid ${activeTab === tab.id ? '#667eea' : 'transparent'}`,
                color: activeTab === tab.id ? '#667eea' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div style={{ background: '#2a2a2a', borderRadius: '12px', padding: '2rem', border: '1px solid #3a3a3a', maxWidth: '500px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '1.5rem' }}>Payment Calculator</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Loan Amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>$</span>
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

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Term (Months)</label>
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

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Interest Rate (%)</label>
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
                cursor: 'pointer'
              }}
            >
              Calculate Payment
            </button>

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
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Financing Applications</h2>
            <button
              onClick={() => setShowNewAppForm(true)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + New Application
            </button>
          </div>

          {/* New Application Form Modal */}
          {showNewAppForm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#2a2a2a',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto'
              }}>
                <h3 style={{ fontSize: '24px', marginBottom: '1.5rem' }}>New Financing Application</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    placeholder="Client Name"
                    value={newApp.client_name}
                    onChange={(e) => setNewApp({...newApp, client_name: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <input
                    placeholder="Client Email"
                    type="email"
                    value={newApp.client_email}
                    onChange={(e) => setNewApp({...newApp, client_email: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <input
                    placeholder="Client Phone"
                    value={newApp.client_phone}
                    onChange={(e) => setNewApp({...newApp, client_phone: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <input
                    placeholder="Business Name"
                    value={newApp.business_name}
                    onChange={(e) => setNewApp({...newApp, business_name: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <input
                    placeholder="Loan Amount"
                    type="number"
                    value={newApp.loan_amount}
                    onChange={(e) => setNewApp({...newApp, loan_amount: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <select
                    value={newApp.term_months}
                    onChange={(e) => setNewApp({...newApp, term_months: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  >
                    <option value="12">12 Months</option>
                    <option value="24">24 Months</option>
                    <option value="36">36 Months</option>
                    <option value="48">48 Months</option>
                  </select>
                  <textarea
                    placeholder="Equipment Description"
                    value={newApp.equipment_description}
                    onChange={(e) => setNewApp({...newApp, equipment_description: e.target.value})}
                    rows={3}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5',
                      resize: 'vertical'
                    }}
                  />

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      onClick={createApplication}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Create Application
                    </button>
                    <button
                      onClick={() => setShowNewAppForm(false)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#3a3a3a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#e5e5e5',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applications List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map((app) => (
              <div key={app.id} style={{
                background: '#2a2a2a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #3a3a3a'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '0.25rem' }}>{app.client_name}</h3>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>{app.business_name || app.client_email}</div>
                  </div>
                  <div style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: 
                      app.status === 'approved' ? '#10b981' :
                      app.status === 'rejected' ? '#ef4444' :
                      app.status === 'active' ? '#667eea' :
                      '#f59e0b',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    {app.status.toUpperCase()}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Loan Amount</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>${parseFloat(app.loan_amount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Term</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{app.term_months} months</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Monthly Payment</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>${parseFloat(app.monthly_payment).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Applied</div>
                    <div style={{ fontSize: '14px' }}>{new Date(app.application_date).toLocaleDateString()}</div>
                  </div>
                </div>

                {app.equipment_description && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '0.25rem' }}>Equipment</div>
                    <div>{app.equipment_description}</div>
                  </div>
                )}

                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'approved')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'rejected')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {app.status === 'approved' && (
                  <button
                    onClick={() => updateApplicationStatus(app.id, 'active')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#667eea',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Activate Loan
                  </button>
                )}
              </div>
            ))}

            {applications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                No applications yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Loans Tab */}
      {activeTab === 'active' && (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '1.5rem' }}>Active Loans</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeLoans.map((loan) => (
              <div key={loan.id} style={{
                background: '#2a2a2a',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #3a3a3a'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600 }}>{loan.client_name}</h3>
                    <div style={{ color: '#9ca3af' }}>{loan.business_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Next Payment</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#667eea' }}>
                      {loan.next_payment_due ? new Date(loan.next_payment_due).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Original Amount</div>
                    <div style={{ fontWeight: 600 }}>${parseFloat(loan.loan_amount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Remaining Balance</div>
                    <div style={{ fontWeight: 600 }}>${parseFloat(loan.remaining_balance || loan.loan_amount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Total Paid</div>
                    <div style={{ fontWeight: 600 }}>${parseFloat(loan.total_paid || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Monthly Payment</div>
                    <div style={{ fontWeight: 600 }}>${parseFloat(loan.monthly_payment).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Missed Payments</div>
                    <div style={{ fontWeight: 600, color: loan.missed_payments > 0 ? '#ef4444' : '#10b981' }}>
                      {loan.missed_payments || 0}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#9ca3af', marginBottom: '0.5rem' }}>
                    <span>Loan Progress</span>
                    <span>{((parseFloat(loan.total_paid || 0) / parseFloat(loan.loan_amount)) * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(parseFloat(loan.total_paid || 0) / parseFloat(loan.loan_amount)) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              </div>
            ))}

            {activeLoans.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                No active loans yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '1.5rem' }}>Payment History</h2>
          
          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #3a3a3a'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1a1a1a' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Client</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Due Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #3a3a3a' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>{(payment.application as any)?.client_name}</div>
                      <div style={{ fontSize: '14px', color: '#9ca3af' }}>{(payment.application as any)?.business_name}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{new Date(payment.due_date).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>${parseFloat(payment.payment_amount).toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        background:
                          payment.status === 'paid' ? '#10b981' :
                          payment.status === 'late' ? '#f59e0b' :
                          payment.status === 'missed' ? '#ef4444' :
                          '#3a3a3a',
                        color: 'white'
                      }}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {payments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                No payment records yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
