'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function PublicFinancingApplicationPage() {
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    business_name: '',
    business_address: '',
    business_ein: '',
    loan_amount: '',
    term_months: '',
    sales_tax_rate: '8.5',
    equipment_description: '',
    terms_accepted: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const interest_rate = 12; // Fixed 12% rate

  const calculateMonthlyPayment = () => {
    if (!formData.loan_amount || !formData.term_months || !formData.sales_tax_rate) return null;

    const principal = parseFloat(formData.loan_amount);
    const months = parseInt(formData.term_months);
    const rate = interest_rate / 100 / 12;
    const salesTaxRate = parseFloat(formData.sales_tax_rate) / 100;
    
    const salesTaxPerPayment = (principal * salesTaxRate) / months;
    const monthlyPayment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    const totalMonthlyPayment = monthlyPayment + salesTaxPerPayment;

    return {
      monthlyPayment: totalMonthlyPayment.toFixed(2),
      salesTaxPerPayment: salesTaxPerPayment.toFixed(2),
      totalSalesTax: (principal * salesTaxRate).toFixed(2),
      totalFinanced: principal.toFixed(2)
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.terms_accepted) {
      alert('Please accept the terms and conditions');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = supabaseBrowser();
      
      const loanAmount = parseFloat(formData.loan_amount);
      const termMonths = parseInt(formData.term_months);
      const rate = interest_rate / 100 / 12;
      const monthlyPayment = (loanAmount * rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);
      const salesTaxRate = parseFloat(formData.sales_tax_rate) / 100;
      const salesTaxPerPayment = (loanAmount * salesTaxRate) / termMonths;
      const totalMonthlyPayment = monthlyPayment + salesTaxPerPayment;

      const { data, error } = await supabase
        .from('financing_applications')
        .insert({
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          business_name: formData.business_name || null,
          business_address: formData.business_address || null,
          business_ein: formData.business_ein || null,
          lease_amount: loanAmount,
          term_months: termMonths,
          interest_rate: interest_rate,
          sales_tax_rate: parseFloat(formData.sales_tax_rate),
          monthly_payment: totalMonthlyPayment,
          remaining_balance: loanAmount,
          equipment_description: formData.equipment_description,
          status: 'pending',
          terms_accepted: formData.terms_accepted,
          application_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert('Error submitting application. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const payment = calculateMonthlyPayment();

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Application Submitted!</h1>
          <p style={{ fontSize: '1.125rem', color: '#9ca3af', marginBottom: '2rem' }}>
            Thank you for applying for our Lease-to-Own program. We'll review your application and get back to you shortly.
          </p>
          <p style={{ color: '#6b7280' }}>
            If you have any questions, please contact us at <a href="mailto:info@brightaudio.com" style={{ color: '#667eea', textDecoration: 'underline' }}>info@brightaudio.com</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', padding: '2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Lease-to-Own Application
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#9ca3af' }}>
            Bright Audio Equipment Financing
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#1a1a1a', borderRadius: '12px', padding: '2rem', border: '1px solid #2a2a2a' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Client Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Full Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={formData.client_email}
                onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Phone <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.client_phone}
                onChange={(e) => setFormData({...formData, client_phone: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              />
            </div>

            {/* Business Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Business/Company Name
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              />
            </div>

            {/* Lease Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Lease Amount <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.loan_amount}
                onChange={(e) => setFormData({...formData, loan_amount: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              />
            </div>

            {/* Term */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Term (months) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                required
                value={formData.term_months}
                onChange={(e) => setFormData({...formData, term_months: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              >
                <option value="">Select term...</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="36">36 months</option>
                <option value="48">48 months</option>
                <option value="60">60 months</option>
              </select>
            </div>

            {/* Sales Tax Rate */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Sales Tax Rate (%) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.sales_tax_rate}
                onChange={(e) => setFormData({...formData, sales_tax_rate: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              />
            </div>

            {/* Business Address */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Business Address
              </label>
              <input
                type="text"
                value={formData.business_address}
                onChange={(e) => setFormData({...formData, business_address: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5' }}
              />
            </div>

            {/* Equipment Description */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Equipment Description
              </label>
              <textarea
                value={formData.equipment_description}
                onChange={(e) => setFormData({...formData, equipment_description: e.target.value})}
                rows={3}
                style={{ width: '100%', padding: '0.75rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#e5e5e5', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Payment Preview */}
          {payment && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #333' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Payment Summary</h3>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Equipment Total:</span>
                  <span>${payment.totalFinanced}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Sales Tax ({formData.sales_tax_rate}%):</span>
                  <span>${payment.totalSalesTax}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9ca3af' }}>Sales Tax per Payment:</span>
                  <span>${payment.salesTaxPerPayment}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid #333', fontSize: '1.125rem' }}>
                  <span style={{ fontWeight: '600' }}>Monthly Payment:</span>
                  <span style={{ color: '#667eea', fontWeight: '700' }}>${payment.monthlyPayment}</span>
                </div>
              </div>
            </div>
          )}

          {/* Terms */}
          <div style={{ marginTop: '2rem' }}>
            <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start', padding: '1rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #333' }}>
              <input
                type="checkbox"
                checked={formData.terms_accepted}
                onChange={(e) => setFormData({...formData, terms_accepted: e.target.checked})}
                style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                I have read, understand, and electronically agree to the Equipment Financing Agreement Terms & Conditions. 
                I authorize automatic ACH payment processing and acknowledge this constitutes a legally binding electronic signature.
                <span style={{ color: '#ef4444' }}> *</span>
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !formData.terms_accepted}
            style={{
              width: '100%',
              marginTop: '1.5rem',
              padding: '1rem',
              background: formData.terms_accepted ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#3a3a3a',
              border: 'none',
              borderRadius: '8px',
              color: formData.terms_accepted ? 'white' : '#6b7280',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: formData.terms_accepted ? 'pointer' : 'not-allowed',
              opacity: formData.terms_accepted ? 1 : 0.5
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
