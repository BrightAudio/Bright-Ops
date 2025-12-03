import { NextResponse } from 'next/server';

export async function GET() {
  const widgetCode = `
    (function() {
      const INTEREST_RATE = 6.5; // Locked interest rate
      
      // Create widget styles
      const style = document.createElement('style');
      style.textContent = \`
        #bright-lease-widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
        }
        #bright-lease-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          transition: transform 0.2s;
        }
        #bright-lease-button:hover {
          transform: scale(1.1);
        }
        #bright-lease-window {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 450px;
          max-width: calc(100vw - 40px);
          height: 650px;
          max-height: calc(100vh - 120px);
          background: #2a2a2a;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        #bright-lease-window.open {
          display: flex;
        }
        #bright-lease-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #bright-lease-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }
        #bright-lease-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          color: #e5e5e5;
        }
        .lease-input, .lease-select, .lease-textarea {
          width: 100%;
          padding: 12px;
          margin-bottom: 12px;
          background: #1a1a1a;
          border: 1px solid #3a3a3a;
          border-radius: 8px;
          color: #e5e5e5;
          font-size: 14px;
          box-sizing: border-box;
        }
        .lease-input:focus, .lease-select:focus, .lease-textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        .lease-input.error, .lease-select.error, .lease-textarea.error {
          border-color: #ef4444;
        }
        .lease-textarea {
          resize: vertical;
          min-height: 80px;
        }
        .lease-locked-field {
          background: #333;
          cursor: not-allowed;
          opacity: 0.7;
        }
        .lease-summary {
          background: #1a1a1a;
          border: 2px solid #667eea;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }
        .lease-summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .lease-summary-total {
          border-top: 2px solid #667eea;
          padding-top: 12px;
          margin-top: 12px;
          font-size: 16px;
          font-weight: 700;
          color: #667eea;
        }
        .lease-checkbox-container {
          display: flex;
          gap: 8px;
          margin: 16px 0;
          align-items: flex-start;
        }
        .lease-checkbox {
          margin-top: 4px;
        }
        .lease-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .lease-submit:disabled {
          background: #3a3a3a;
          cursor: not-allowed;
          opacity: 0.5;
        }
        .lease-submit:not(:disabled):hover {
          opacity: 0.9;
        }
        .lease-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #9ca3af;
        }
        .lease-success {
          background: #059669;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          color: white;
        }
        .lease-error {
          background: #ef4444;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          color: white;
        }
        .lease-info {
          background: #1a1a1a;
          border: 1px solid #3a3a3a;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #9ca3af;
        }
      \`;
      document.head.appendChild(style);

      // Create widget HTML
      const widgetHTML = \`
        <div id="bright-lease-widget">
          <button id="bright-lease-button" title="Apply for Lease-to-Own">💳</button>
          <div id="bright-lease-window">
            <div id="bright-lease-header">
              <h3 style="margin: 0; font-size: 18px;">Lease-to-Own Application</h3>
              <button id="bright-lease-close">×</button>
            </div>
            <div id="bright-lease-body">
              <div id="lease-form">
                <div class="lease-info">
                  Apply for lease-to-own financing. All fields are required. Interest rate is locked at 6.5%.
                </div>
                <div id="lease-error" style="display: none;"></div>
                
                <label class="lease-label">Your Name *</label>
                <input type="text" id="lease-name" class="lease-input" placeholder="Full Name" required />
                
                <label class="lease-label">Email Address *</label>
                <input type="email" id="lease-email" class="lease-input" placeholder="email@example.com" required />
                
                <label class="lease-label">Phone Number *</label>
                <input type="tel" id="lease-phone" class="lease-input" placeholder="(555) 555-5555" required />
                
                <label class="lease-label">Driver's License / ID Number *</label>
                <input type="text" id="lease-license" class="lease-input" placeholder="DL123456789" required />
                
                <label class="lease-label">Business Name</label>
                <input type="text" id="lease-business-name" class="lease-input" placeholder="Your Business LLC" />
                
                <label class="lease-label">Business Address</label>
                <input type="text" id="lease-business-address" class="lease-input" placeholder="123 Main St, City, ST 12345" />
                
                <label class="lease-label">Business EIN</label>
                <input type="text" id="lease-business-ein" class="lease-input" placeholder="12-3456789" />
                
                <label class="lease-label">Lease Amount *</label>
                <input type="number" id="lease-amount" class="lease-input" placeholder="10000" min="1" step="1" required />
                
                <label class="lease-label">Sales Tax Rate (%) *</label>
                <input type="number" id="lease-tax-rate" class="lease-input" value="8.25" step="0.01" min="0" required />
                
                <label class="lease-label">Lease Term *</label>
                <select id="lease-term" class="lease-select" required>
                  <option value="">Select term...</option>
                  <option value="12">12 Months</option>
                  <option value="24">24 Months</option>
                  <option value="36">36 Months</option>
                  <option value="48">48 Months</option>
                </select>
                
                <label class="lease-label">Interest Rate (Locked) *</label>
                <input type="text" id="lease-interest-rate" class="lease-input lease-locked-field" value="6.5%" readonly />
                
                <label class="lease-label">Equipment Description *</label>
                <textarea id="lease-equipment" class="lease-textarea" placeholder="Describe the equipment you wish to lease..." required></textarea>
                
                <div id="lease-summary" style="display: none;"></div>
                
                <div class="lease-checkbox-container">
                  <input type="checkbox" id="lease-terms" class="lease-checkbox" />
                  <label for="lease-terms" style="font-size: 13px; color: #9ca3af; cursor: pointer;">
                    I agree to the lease-to-own terms and authorize Bright Audio to process this application. 
                    I understand this is a legally binding agreement.
                  </label>
                </div>
                
                <button id="lease-submit" class="lease-submit" disabled>Submit Application</button>
              </div>
              <div id="lease-success" style="display: none;"></div>
            </div>
          </div>
        </div>
      \`;

      document.body.insertAdjacentHTML('beforeend', widgetHTML);

      // Get elements
      const button = document.getElementById('bright-lease-button');
      const window = document.getElementById('bright-lease-window');
      const closeBtn = document.getElementById('bright-lease-close');
      const submitBtn = document.getElementById('lease-submit');
      const termsCheckbox = document.getElementById('lease-terms');
      const form = document.getElementById('lease-form');
      const successDiv = document.getElementById('lease-success');
      const errorDiv = document.getElementById('lease-error');
      const summaryDiv = document.getElementById('lease-summary');

      // Required fields
      const requiredFields = [
        'lease-name', 'lease-email', 'lease-phone', 
        'lease-license', 'lease-amount', 'lease-tax-rate', 
        'lease-term', 'lease-equipment'
      ];

      // Toggle window
      button.addEventListener('click', () => {
        window.classList.toggle('open');
      });

      closeBtn.addEventListener('click', () => {
        window.classList.remove('open');
      });

      // Calculate payment summary
      function updateSummary() {
        const amount = parseFloat(document.getElementById('lease-amount').value) || 0;
        const taxRate = parseFloat(document.getElementById('lease-tax-rate').value) || 0;
        const term = parseInt(document.getElementById('lease-term').value) || 0;

        if (amount > 0 && taxRate >= 0 && term > 0) {
          const monthlyRate = (INTEREST_RATE / 100) / 12;
          const basePayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                             (Math.pow(1 + monthlyRate, term) - 1);
          const salesTaxPerPayment = basePayment * (taxRate / 100);
          const totalPayment = basePayment + salesTaxPerPayment;
          const totalPaid = totalPayment * term;

          summaryDiv.style.display = 'block';
          summaryDiv.innerHTML = \`
            <div style="color: #667eea; font-weight: 600; margin-bottom: 12px; font-size: 14px;">Payment Summary</div>
            <div class="lease-summary-row">
              <span style="color: #9ca3af;">Equipment Financed:</span>
              <span style="color: #e5e5e5; font-weight: 600;">$\${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="lease-summary-row">
              <span style="color: #9ca3af;">Base Payment:</span>
              <span style="color: #e5e5e5; font-weight: 600;">$\${basePayment.toLocaleString(undefined, {minimumFractionDigits: 2})}/mo</span>
            </div>
            <div class="lease-summary-row">
              <span style="color: #9ca3af;">Sales Tax (\${taxRate}%):</span>
              <span style="color: #e5e5e5; font-weight: 600;">+$\${salesTaxPerPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}/mo</span>
            </div>
            <div class="lease-summary-row lease-summary-total">
              <span>Monthly Payment:</span>
              <span>$\${totalPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}/mo</span>
            </div>
            <div class="lease-summary-row" style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
              <span>Total over \${term} months:</span>
              <span>$\${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          \`;
        } else {
          summaryDiv.style.display = 'none';
        }
      }

      // Validation function
      function validateForm() {
        let allFilled = true;
        
        requiredFields.forEach(fieldId => {
          const field = document.getElementById(fieldId);
          const value = field.value.trim();
          
          if (!value) {
            allFilled = false;
            field.classList.add('error');
          } else {
            field.classList.remove('error');
          }
        });

        const termsAccepted = termsCheckbox.checked;
        submitBtn.disabled = !allFilled || !termsAccepted;
        
        return allFilled && termsAccepted;
      }

      // Add event listeners for validation and summary
      requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field.addEventListener('input', () => {
          validateForm();
          updateSummary();
        });
        field.addEventListener('blur', validateForm);
      });

      termsCheckbox.addEventListener('change', validateForm);

      // Submit form
      submitBtn.addEventListener('click', async () => {
        if (!validateForm()) {
          errorDiv.textContent = 'Please fill out all required fields and accept the terms.';
          errorDiv.style.display = 'block';
          return;
        }

        errorDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
          const applicationData = {
            client_name: document.getElementById('lease-name').value,
            client_email: document.getElementById('lease-email').value,
            client_phone: document.getElementById('lease-phone').value,
            drivers_license_number: document.getElementById('lease-license').value,
            business_name: document.getElementById('lease-business-name').value || null,
            business_address: document.getElementById('lease-business-address').value || null,
            business_ein: document.getElementById('lease-business-ein').value || null,
            loan_amount: parseFloat(document.getElementById('lease-amount').value),
            sales_tax_rate: parseFloat(document.getElementById('lease-tax-rate').value),
            term_months: parseInt(document.getElementById('lease-term').value),
            interest_rate: INTEREST_RATE,
            equipment_description: document.getElementById('lease-equipment').value,
            terms_accepted: true,
            source: 'website_widget'
          };

          const response = await fetch('${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/lease-application/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
          });

          if (!response.ok) {
            throw new Error('Failed to submit application');
          }

          const result = await response.json();

          form.style.display = 'none';
          successDiv.style.display = 'block';
          successDiv.innerHTML = \`
            <div class="lease-success">
              <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
              <h3 style="margin: 0 0 8px 0;">Application Submitted!</h3>
              <p style="margin: 0; font-size: 14px;">
                Thank you! We've received your lease-to-own application. 
                We'll review it and contact you shortly at <strong>\${applicationData.client_email}</strong>.
              </p>
            </div>
          \`;

          setTimeout(() => {
            window.classList.remove('open');
            setTimeout(() => {
              form.style.display = 'block';
              successDiv.style.display = 'none';
              // Reset form
              requiredFields.forEach(id => document.getElementById(id).value = '');
              document.getElementById('lease-tax-rate').value = '8.25';
              termsCheckbox.checked = false;
              submitBtn.disabled = true;
              submitBtn.textContent = 'Submit Application';
              summaryDiv.style.display = 'none';
            }, 500);
          }, 3000);

        } catch (error) {
          console.error('Submission error:', error);
          errorDiv.textContent = 'Failed to submit application. Please try again.';
          errorDiv.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Application';
        }
      });

      // Initial validation
      validateForm();
    })();
  `;

  return new NextResponse(widgetCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
