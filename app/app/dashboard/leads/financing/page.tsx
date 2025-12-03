'use client';
// @ts-nocheck

import { useState, useEffect } from 'react';
import { FaDollarSign, FaCalculator, FaFileSignature, FaChartLine, FaCog, FaUniversity, FaBell, FaCreditCard, FaArchive, FaCode } from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';
import { loadStripe } from '@stripe/stripe-js';

export default function FinancingPage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'applications' | 'active' | 'payments' | 'section179' | 'website' | 'archive'>('calculator');
  
  // Calculator state
  const [financeAmount, setFinanceAmount] = useState('50000');
  const [termMonths, setTermMonths] = useState('36');
  const [interestRate, setInterestRate] = useState('6.5');
  const [monthlyPayment, setMonthlyPayment] = useState('0');
  
  // Cost Estimator state
  const [estimatorItems, setEstimatorItems] = useState<Array<{id: string, description: string, quantity: number, unitCost: number}>>([]);
  const [laborHours, setLaborHours] = useState('0');
  const [laborRate, setLaborRate] = useState('75');
  
  // Data state
  const [applications, setApplications] = useState<any[]>([]);
  const [activeFinancing, setActiveFinancing] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<any[]>([]);
  const [section179Settings, setSection179Settings] = useState<any>(null);
  const [selectedTaxYear, setSelectedTaxYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form state
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activatingApplication, setActivatingApplication] = useState<any>(null);
  const [processFirstPayment, setProcessFirstPayment] = useState(true);
  const [showAddEquipmentForm, setShowAddEquipmentForm] = useState(false);
  const [selectedFinancingForEquipment, setSelectedFinancingForEquipment] = useState<any>(null);
  const [showSection179SettingsModal, setShowSection179SettingsModal] = useState(false);
  const [showEditEquipmentModal, setShowEditEquipmentModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [showTaxableIncomeModal, setShowTaxableIncomeModal] = useState(false);
  const [selectedEquipmentForTaxCalc, setSelectedEquipmentForTaxCalc] = useState<any>(null);
  const [taxableIncomeResult, setTaxableIncomeResult] = useState<any>(null);
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('');
  const [inventorySubcategoryFilter, setInventorySubcategoryFilter] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [editingLeaseAmount, setEditingLeaseAmount] = useState<string | null>(null);
  const [editedAmount, setEditedAmount] = useState('');
  
  const [newApp, setNewApp] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    drivers_license_number: '',
    business_name: '',
    business_address: '',
    business_ein: '',
    loan_amount: '',
    sales_tax_rate: '8.25',
    term_months: '36',
    interest_rate: '6.5',
    equipment_description: '',
    down_payment_percentage: '20',
    down_payment_amount: '',
    terms_accepted: false,
    payment_method_added: false,
    stripe_customer_id: '',
    stripe_payment_method_id: ''
  });
  
  const [newAsset, setNewAsset] = useState({
    asset_name: '',
    asset_description: '',
    asset_category: 'audio_equipment',
    serial_number: '',
    purchase_cost: '',
    depreciation_period_years: '5',
    salvage_value: '',
    purchase_date: new Date().toISOString().split('T')[0],
    placed_in_service_date: new Date().toISOString().split('T')[0],
    insurance_required: false,
    insurance_policy_number: '',
    notes: ''
  });

  const [newEquipment, setNewEquipment] = useState({
    financing_id: '',
    description: '',
    asset_tag: '',
    sku: '',
    serial_number: '',
    purchase_cost: '',
    placed_in_service_date: new Date().toISOString().split('T')[0],
    business_use_percent: '100',
    depreciation_life_years: '5',
    equipment_category: '',
    notes: ''
  });

  useEffect(() => {
    loadApplications();
    loadActiveFinancing();
    loadPayments();
    loadEquipment();
    loadSection179Settings();
    loadInventoryItems();
  }, []);

  // Reload Section 179 settings when tax year changes
  useEffect(() => {
    loadSection179Settings();
  }, [selectedTaxYear]);

  async function loadApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from('financing_applications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setApplications(data);
    setLoading(false);
  }

  async function loadActiveFinancing() {
    const { data, error } = await supabase
      .from('financing_applications')
      .select('*')
      .eq('status', 'active')
      .order('next_payment_due', { ascending: true });
    
    if (!error && data) setActiveFinancing(data);
  }

  async function loadPayments() {
    const { data, error} = await supabase
      .from('financing_payments')
      .select(`
        *,
        application:financing_applications(client_name, business_name)
      `)
      .order('due_date', { ascending: false })
      .limit(50);
    
    if (!error && data) setPayments(data);
  }

  async function loadEquipment() {
    const { data, error } = await supabase
      .from('equipment_items' as any)
      .select(`
        *,
        financing:financing_applications(id, client_name, business_name, status, loan_amount)
      `)
      .eq('status', 'active')
      .order('placed_in_service_date', { ascending: false });
    
    if (!error && data) {
      // Calculate eligible costs and suggestions for each equipment item
      const enrichedEquipment = data.map((item: any) => ({
        ...item,
        eligible_cost: Math.round(item.purchase_cost * (item.business_use_percent / 100) * 100) / 100,
        tax_year: new Date(item.placed_in_service_date).getFullYear(),
        suggested_section_179: item.section_179_elected_amount || 0
      }));
      setEquipmentItems(enrichedEquipment);
    }
  }

  async function loadSection179Settings() {
    const { data, error } = await supabase
      .from('section179_settings' as any)
      .select('*')
      .eq('tax_year', selectedTaxYear)
      .single();
    
    if (!error && data) {
      setSection179Settings(data);
    } else {
      // Use default settings if none exist for this year
      setSection179Settings({
        tax_year: selectedTaxYear,
        max_section_179_deduction: 1220000,
        phaseout_threshold: 3050000,
        bonus_depreciation_allowed: true,
        bonus_depr_percentage: 60,
        min_business_use_percent: 50
      });
    }
  }

  async function loadInventoryItems() {
    const { data, error } = await supabase
      .from('inventory_items' as any)
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && data) {
      console.log('Loaded inventory items:', data.length);
      console.log('Categories found:', Array.from(new Set(data.map((i: any) => i.category).filter(Boolean))));
      console.log('Sample items:', data.slice(0, 3));
      setAvailableInventory(data);
    } else {
      console.error('Error loading inventory:', error);
    }
  }

  // Cost Estimator functions
  function addEstimatorItem() {
    const newItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitCost: 0
    };
    setEstimatorItems([...estimatorItems, newItem]);
  }

  function updateEstimatorItem(id: string, field: string, value: any) {
    setEstimatorItems(estimatorItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  }

  function removeEstimatorItem(id: string) {
    setEstimatorItems(estimatorItems.filter(item => item.id !== id));
  }

  function calculateEstimate() {
    const equipmentTotal = estimatorItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitCost), 0
    );
    const laborTotal = parseFloat(laborHours) * parseFloat(laborRate);
    const subtotal = equipmentTotal + laborTotal;
    const salesTaxAmount = subtotal * 0.0825; // 8.25% default
    const total = subtotal + salesTaxAmount;
    
    return {
      equipmentTotal,
      laborTotal,
      subtotal,
      salesTaxAmount,
      total
    };
  }

  function applyEstimateToCalculator() {
    const estimate = calculateEstimate();
    setFinanceAmount(estimate.total.toFixed(2));
    alert(`Estimate total of $${estimate.total.toLocaleString()} applied to payment calculator.`);
  }

  async function processPayment(paymentId: string, applicationId: string) {
    if (!confirm('Process this payment? The customer\'s account will be charged.')) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/financing/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          applicationId,
          amount: selectedPayment.payment_amount,
          paymentMethod: 'ach'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Payment processed successfully! Receipt sent to customer.');
        setShowPaymentModal(false);
        loadActiveFinancing();
        loadPayments();
      } else {
        alert('Payment failed: ' + result.error);
      }
    } catch (error: any) {
      alert('Error processing payment: ' + error.message);
    } finally {
      setProcessing(false);
    }
  }

  async function sendPaymentReminder(applicationId: string, reminderType: string) {
    try {
      const response = await fetch('/api/financing/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, reminderType })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Payment reminder sent successfully!');
      } else {
        alert('Failed to send reminder: ' + result.error);
      }
    } catch (error: any) {
      alert('Error sending reminder: ' + error.message);
    }
  }

  async function sendApplicationSMS(phoneNumber: string, clientName: string) {
    // Prompt for phone number if not provided
    let phone = phoneNumber;
    if (!phone) {
      phone = prompt('Enter customer phone number (for SMS):') || '';
      if (!phone) {
        alert('Phone number is required to send SMS');
        return;
      }
    }

    // Prompt for client name if not provided
    let name = clientName;
    if (!name) {
      name = prompt('Enter customer name (optional):') || 'valued customer';
    }

    // Generate application link (in production, this would be a unique URL)
    const applicationUrl = `${window.location.origin}/financing/apply`;
    
    try {
      const response = await fetch('/api/financing/send-application-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: phone, 
          clientName: name,
          applicationUrl 
        })
      });

      console.log('Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        alert(`✅ Lease-to-Own application sent to ${phone}`);
      } else {
        // Show actual error from API
        console.error('SMS Error Details:', result);
        alert(`❌ SMS Failed: ${result.error || 'Unknown error'}\n\nCheck browser console for details.`);
        // Fallback: copy link to clipboard
        navigator.clipboard.writeText(applicationUrl);
      }
    } catch (error: any) {
      // Fallback: copy link to clipboard
      const applicationUrl = `${window.location.origin}/financing/apply`;
      navigator.clipboard.writeText(applicationUrl);
      alert(`Error sending SMS. Application link copied to clipboard:\n\n${applicationUrl}\n\nYou can manually text this to ${phoneNumber}`);
    }
  }

  async function createApplication() {
    if (!newApp.terms_accepted) {
      alert('Client must accept terms and conditions');
      return;
    }

    if (!newApp.payment_method_added) {
      alert('Please add a payment method before submitting');
      return;
    }

    const principal = parseFloat(newApp.loan_amount);
    const months = parseInt(newApp.term_months);
    const rate = parseFloat(newApp.interest_rate) / 100 / 12;
    const basePayment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    const salesTaxRate = parseFloat(newApp.sales_tax_rate) / 100;
    const salesTaxPerPayment = basePayment * salesTaxRate;
    const payment = basePayment + salesTaxPerPayment; // Monthly payment + sales tax per payment

    const { data, error } = await supabase
      .from('financing_applications')
      .insert({
        client_name: newApp.client_name,
        client_email: newApp.client_email,
        client_phone: newApp.client_phone,
        business_name: newApp.business_name,
        business_address: newApp.business_address,
        business_ein: newApp.business_ein,
        loan_amount: principal,
        term_months: months,
        interest_rate: parseFloat(newApp.interest_rate),
        equipment_description: newApp.equipment_description,
        monthly_payment: payment,
        remaining_balance: principal,
        down_payment_percentage: 0,
        down_payment_amount: 0,
        status: 'pending',
        terms_accepted: newApp.terms_accepted,
        terms_accepted_date: new Date().toISOString(),
        stripe_customer_id: newApp.stripe_customer_id,
        stripe_payment_method_id: newApp.stripe_payment_method_id
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
        drivers_license_number: '',
        business_name: '',
        business_address: '',
        business_ein: '',
        loan_amount: '',
        sales_tax_rate: '8.25',
        term_months: '36',
        interest_rate: '6.5',
        equipment_description: '',
        down_payment_percentage: '20',
        down_payment_amount: '',
        terms_accepted: false,
        payment_method_added: false,
        stripe_customer_id: '',
        stripe_payment_method_id: ''
      });
      alert('Application created successfully!');
      loadApplications();
    } else if (error) {
      console.error('Error creating application:', error);
      alert('Error creating application: ' + error.message);
    }
  }

  async function addPaymentMethod(applicationId?: string) {
    const email = applicationId ? 
      applications.find(a => a.id === applicationId)?.client_email : 
      newApp.client_email;
    
    const name = applicationId ? 
      applications.find(a => a.id === applicationId)?.client_name : 
      newApp.client_name;

    if (!email || !name) {
      alert('Please enter client name and email first');
      return;
    }

    setProcessing(true);
    try {
      // Create Stripe SetupIntent
      const response = await fetch('/api/financing/setup-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          name,
          applicationId 
        })
      });

      const result = await response.json();
      
      if (result.error) {
        alert('Error setting up payment: ' + result.error);
        setProcessing(false);
        return;
      }

      const { clientSecret, customerId, paymentMethodId } = result;

      // Load Stripe with publishable key from environment
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

      if (!stripe) {
        alert('Failed to load Stripe');
        setProcessing(false);
        return;
      }

      // Collect bank account with micro-deposits verification
      const { error: stripeError } = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              name,
              email
            }
          }
        },
        expand: ['payment_method']
      });

      if (stripeError) {
        alert('Payment setup failed: ' + stripeError.message);
      } else {
        // Payment method added successfully
        if (applicationId) {
          // Update existing application
          await supabase
            .from('financing_applications')
            .update({
              stripe_customer_id: customerId,
              stripe_payment_method_id: paymentMethodId
            })
            .eq('id', applicationId);
          loadApplications();
          alert('Payment method added successfully!');
        } else {
          // Store for new application
          setNewApp({
            ...newApp, 
            payment_method_added: true,
            stripe_customer_id: customerId,
            stripe_payment_method_id: paymentMethodId
          });
          alert('Payment method added successfully! You can now submit the application.');
        }
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
    setProcessing(false);
  }

  async function updateApplicationStatus(id: string, status: string, shouldProcessFirstPayment: boolean = false) {
    try {
      setProcessing(true);
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

      console.log('Updating application status:', { id, status, updates });
      
      const { data, error } = await supabase.from('financing_applications').update(updates).eq('id', id);
      
      if (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
        return;
      }
      
      console.log('Status updated successfully:', data);
      
      // If activating and should process first payment
      if (status === 'active' && shouldProcessFirstPayment) {
        await processActivationFirstPayment(id);
      }
      
      if (status === 'approved') {
        alert('Application approved! Payment schedule has been generated.');
      }
      
      loadApplications();
      loadActiveFinancing();
    } catch (error: any) {
      console.error('Error in updateApplicationStatus:', error);
      alert('Error updating status: ' + error.message);
    }
    setProcessing(false);
  }

  async function updateLeaseAmount(appId: string, newAmount: string) {
    try {
      setProcessing(true);
      
      const amount = parseFloat(newAmount);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid lease amount');
        return;
      }

      const app = applications.find(a => a.id === appId);
      if (!app) return;

      // Recalculate down payment (20% of new lease amount)
      const downPaymentPercentage = app.down_payment_percentage || 20;
      const newDownPayment = amount * (downPaymentPercentage / 100);

      // Recalculate monthly payment with new amount
      const principal = amount;
      const months = parseInt(app.term_months) || 36;
      const interestRate = parseFloat(app.interest_rate || '6.5');
      const rate = interestRate / 100 / 12;
      const basePayment = (principal * rate * Math.pow(1 + rate, months)) / 
                         (Math.pow(1 + rate, months) - 1);
      const salesTax = parseFloat(app.sales_tax_rate || '8.25');
      const salesTaxRate = salesTax / 100;
      const salesTaxPerPayment = basePayment * salesTaxRate;
      const totalPayment = basePayment + salesTaxPerPayment;
      const totalPaid = totalPayment * months;

      const { error } = await supabase
        .from('financing_applications')
        .update({
          loan_amount: amount,
          monthly_payment: totalPayment,
          total_amount: totalPaid,
          down_payment_amount: newDownPayment
        })
        .eq('id', appId);

      if (error) {
        alert('Error updating lease amount: ' + error.message);
        return;
      }

      setEditingLeaseAmount(null);
      setEditedAmount('');
      await loadApplications();
      alert('✓ Lease amount updated successfully!');
      
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
    setProcessing(false);
  }

  async function processActivationFirstPayment(applicationId: string) {
    try {
      setProcessing(true);
      
      // Get the application details
      const { data: app } = await supabase
        .from('financing_applications')
        .select('*')
        .eq('id', applicationId)
        .single();
      
      if (!app) {
        alert('Application not found');
        return;
      }

      console.log('Application data:', {
        id: app.id,
        stripe_customer_id: app.stripe_customer_id,
        stripe_payment_method_id: app.stripe_payment_method_id,
        client_name: app.client_name
      });

      // Get the first payment record
      const { data: firstPayment } = await supabase
        .from('financing_payments')
        .select('*')
        .eq('application_id', applicationId)
        .eq('payment_number', 1)
        .single();

      if (!firstPayment) {
        alert('First payment record not found. Payment schedule may not have been generated yet.');
        return;
      }

      console.log('Processing payment:', { 
        applicationId, 
        paymentId: firstPayment.id, 
        amount: firstPayment.payment_amount,
        hasStripeCustomer: !!app.stripe_customer_id,
        hasStripePaymentMethod: !!app.stripe_payment_method_id
      });

      // Process the payment via Stripe - let API handle validation
      const response = await fetch('/api/financing/process-payment-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: firstPayment.id,
          applicationId: applicationId,
          amount: firstPayment.payment_amount
        })
      });

      const result = await response.json();
      console.log('Payment result:', result);

      if (response.ok && result.success) {
        alert('First payment processed successfully! Financing is now active.');
        loadPayments();
      } else {
        alert('Payment processing failed: ' + (result.error || 'Unknown error') + '\n\nCheck console for details.');
      }
    } catch (error: any) {
      console.error('Error processing first payment:', error);
      alert('Error processing first payment: ' + error.message);
    } finally {
      setProcessing(false);
    }
  }

  const calculatePayment = () => {
    const principal = parseFloat(financeAmount);
    const months = parseInt(termMonths);
    const rate = parseFloat(interestRate) / 100 / 12;

    if (principal && months && rate) {
      const payment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
      setMonthlyPayment(payment.toFixed(2));
    }
  };
  
  async function createEquipment() {
    // Validation
    if (!newEquipment.financing_id) {
      alert('Please select a leasing account');
      return;
    }
    if (!newEquipment.description.trim()) {
      alert('Please enter an equipment description');
      return;
    }
    if (!newEquipment.purchase_cost || parseFloat(newEquipment.purchase_cost) <= 0) {
      alert('Please enter a valid purchase cost');
      return;
    }
    const businessUse = parseFloat(newEquipment.business_use_percent);
    if (isNaN(businessUse) || businessUse < 0 || businessUse > 100) {
      alert('Business use percentage must be between 0 and 100');
      return;
    }
    if (businessUse < 50) {
      if (!confirm('Warning: Equipment with less than 50% business use does NOT qualify for Section 179 deduction. Continue anyway?')) {
        return;
      }
    }

    try {
      const purchaseCost = parseFloat(newEquipment.purchase_cost);
      const insuranceRequired = purchaseCost >= 10000;

      const { data, error } = await supabase
        .from('equipment_items' as any)
        .insert([{
          financing_id: newEquipment.financing_id,
          description: newEquipment.description,
          asset_tag: newEquipment.asset_tag || null,
          sku: newEquipment.sku || null,
          serial_number: newEquipment.serial_number || null,
          purchase_cost: purchaseCost,
          placed_in_service_date: newEquipment.placed_in_service_date,
          business_use_percent: businessUse,
          depreciation_life_years: parseInt(newEquipment.depreciation_life_years),
          equipment_category: newEquipment.equipment_category || null,
          insurance_required: insuranceRequired,
          notes: newEquipment.notes || null,
          status: 'active'
        }])
        .select();

      if (error) throw error;

      // Update inventory item location if linked
      if (selectedInventoryItem) {
        await supabase
          .from('inventory_items' as any)
          .update({ location: 'Section 179 - Financed Equipment' })
          .eq('id', selectedInventoryItem.id);
      }

      const eligibleCost = Math.round(purchaseCost * (businessUse / 100) * 100) / 100;
      alert(
        `✅ Equipment Added Successfully!\n\n` +
        `Cost: $${purchaseCost.toLocaleString()}\n` +
        `Business Use: ${businessUse}%\n` +
        `Eligible for Section 179: $${eligibleCost.toLocaleString()}\n\n` +
        (insuranceRequired ? '⚠️ Insurance Required (equipment $10k+)\n' : '') +
        (selectedInventoryItem ? '📦 Inventory location updated' : '')
      );
      
      // Reset form
      setNewEquipment({
        financing_id: '',
        description: '',
        asset_tag: '',
        sku: '',
        serial_number: '',
        purchase_cost: '',
        placed_in_service_date: new Date().toISOString().split('T')[0],
        business_use_percent: '100',
        depreciation_life_years: '5',
        equipment_category: '',
        notes: ''
      });
      setSelectedInventoryItem(null);
      setInventoryCategoryFilter('');
      setInventorySubcategoryFilter('');
      setInventorySearch('');
      setShowAddEquipmentForm(false);
      setSelectedFinancingForEquipment(null);
      
      // Reload equipment list
      loadEquipment();
    } catch (err) {
      console.error('Error creating equipment:', err);
      alert('Failed to add equipment. Please try again.');
    }
  }

  async function updateEquipment() {
    if (!editingEquipment) return;

    // Validation
    if (!editingEquipment.description) {
      alert('Please enter equipment description');
      return;
    }
    if (!editingEquipment.purchase_cost || parseFloat(editingEquipment.purchase_cost) <= 0) {
      alert('Please enter valid purchase cost');
      return;
    }
    if (!editingEquipment.placed_in_service_date) {
      alert('Please enter placed in service date');
      return;
    }
    if (!editingEquipment.business_use_percent || parseFloat(editingEquipment.business_use_percent) < 0 || parseFloat(editingEquipment.business_use_percent) > 100) {
      alert('Business use percentage must be between 0 and 100');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('equipment_items' as any)
        .update({
          description: editingEquipment.description,
          asset_tag: editingEquipment.asset_tag || null,
          sku: editingEquipment.sku || null,
          serial_number: editingEquipment.serial_number || null,
          purchase_cost: parseFloat(editingEquipment.purchase_cost),
          placed_in_service_date: editingEquipment.placed_in_service_date,
          business_use_percent: parseFloat(editingEquipment.business_use_percent),
          depreciation_life_years: parseInt(editingEquipment.depreciation_life_years),
          equipment_category: editingEquipment.equipment_category || null,
          section_179_elected_amount: parseFloat(editingEquipment.section_179_elected_amount) || 0,
          bonus_depreciation_percentage: parseFloat(editingEquipment.bonus_depreciation_percentage) || 0,
          notes: editingEquipment.notes || null
        })
        .eq('id', editingEquipment.id)
        .select()
        .single();

      if (!error && data) {
        alert('Equipment updated successfully!');
        setShowEditEquipmentModal(false);
        setEditingEquipment(null);
        loadEquipment();
      } else {
        throw error;
      }
    } catch (err) {
      console.error('Error updating equipment:', err);
      alert('Failed to update equipment. Please try again.');
    }
  }

  async function updateSection179Settings() {
    if (!section179Settings) {
      alert('No settings to update');
      return;
    }

    // Validation
    const maxDeduction = parseFloat(section179Settings.max_section_179_deduction);
    const phaseoutThreshold = parseFloat(section179Settings.phaseout_threshold);
    const bonusPercentage = parseFloat(section179Settings.bonus_depr_percentage);
    const minBusinessUse = parseFloat(section179Settings.min_business_use_percent);

    if (isNaN(maxDeduction) || maxDeduction < 0) {
      alert('Please enter a valid maximum deduction amount');
      return;
    }
    if (isNaN(phaseoutThreshold) || phaseoutThreshold < 0) {
      alert('Please enter a valid phaseout threshold');
      return;
    }
    if (isNaN(bonusPercentage) || bonusPercentage < 0 || bonusPercentage > 100) {
      alert('Bonus depreciation percentage must be between 0 and 100');
      return;
    }
    if (isNaN(minBusinessUse) || minBusinessUse < 0 || minBusinessUse > 100) {
      alert('Minimum business use percentage must be between 0 and 100');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('section179_settings' as any)
        .upsert({
          tax_year: selectedTaxYear,
          max_section_179_deduction: maxDeduction.toString(),
          phaseout_threshold: phaseoutThreshold.toString(),
          bonus_depreciation_allowed: section179Settings.bonus_depreciation_allowed ?? true,
          bonus_depr_percentage: bonusPercentage.toString(),
          min_business_use_percent: minBusinessUse.toString(),
          notes: section179Settings.notes || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tax_year'
        });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      alert('Section 179 settings updated successfully!');
      setShowSection179SettingsModal(false);
      loadSection179Settings();
    } catch (err) {
      console.error('Error updating settings:', err);
      alert(`Failed to update settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function autoAllocateSection179() {
    if (!section179Settings) {
      alert('Please load Section 179 settings first');
      return;
    }

    if (!confirm(
      `Auto-Allocate Section 179 for ${selectedTaxYear}?\n\n` +
      `This will distribute the $${(section179Settings.max_section_179_deduction || 0).toLocaleString()} deduction limit ` +
      `across eligible equipment (largest items first).\n\n` +
      `Review the allocations with your CPA before filing taxes.`
    )) {
      return;
    }

    try {
      setProcessing(true);

      // Filter eligible equipment for this tax year
      const eligibleEquipment = equipmentItems.filter((item: any) => {
        const itemYear = new Date(item.placed_in_service_date).getFullYear();
        const businessUse = parseFloat(item.business_use_percent);
        const minBusinessUse = section179Settings.min_business_use_percent || 50;
        
        return itemYear === selectedTaxYear && businessUse >= minBusinessUse;
      });

      if (eligibleEquipment.length === 0) {
        alert(`No eligible equipment found for ${selectedTaxYear}.\n\nEquipment must be placed in service during ${selectedTaxYear} with ≥${section179Settings.min_business_use_percent || 50}% business use.`);
        setProcessing(false);
        return;
      }

      // Sort by eligible cost (largest first) - greedy algorithm
      const sortedEquipment = [...eligibleEquipment].sort((a: any, b: any) => {
        const aEligible = parseFloat(a.purchase_cost) * (parseFloat(a.business_use_percent) / 100);
        const bEligible = parseFloat(b.purchase_cost) * (parseFloat(b.business_use_percent) / 100);
        return bEligible - aEligible;
      });

      // Calculate total costs
      const totalEquipmentCost = eligibleEquipment.reduce((sum: number, item: any) => 
        sum + parseFloat(item.purchase_cost), 0
      );
      const totalEligibleCost = eligibleEquipment.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.purchase_cost) * (parseFloat(item.business_use_percent) / 100)), 0
      );

      // Apply phaseout threshold reduction if total equipment exceeds threshold
      let maxDeduction = parseFloat(section179Settings.max_section_179_deduction);
      const phaseoutThreshold = parseFloat(section179Settings.phaseout_threshold);
      let phaseoutMessage = '';

      if (totalEquipmentCost > phaseoutThreshold) {
        const excessAmount = totalEquipmentCost - phaseoutThreshold;
        const reducedMaxDeduction = Math.max(0, maxDeduction - excessAmount);
        
        phaseoutMessage = `\n\n⚠️ PHASEOUT APPLIED:\n` +
          `Total Equipment: $${totalEquipmentCost.toLocaleString()}\n` +
          `Phaseout Threshold: $${phaseoutThreshold.toLocaleString()}\n` +
          `Excess Amount: $${excessAmount.toLocaleString()}\n` +
          `Original Max Deduction: $${maxDeduction.toLocaleString()}\n` +
          `Reduced Max Deduction: $${reducedMaxDeduction.toLocaleString()}`;
        
        maxDeduction = reducedMaxDeduction;

        if (maxDeduction === 0) {
          alert(
            `❌ Section 179 Fully Phased Out\n\n` +
            `Total equipment purchases ($${totalEquipmentCost.toLocaleString()}) exceed ` +
            `the phaseout threshold ($${phaseoutThreshold.toLocaleString()}) by ` +
            `$${excessAmount.toLocaleString()}.\n\n` +
            `The Section 179 deduction has been reduced to $0.\n\n` +
            `You can still claim ${section179Settings.bonus_depr_percentage}% bonus depreciation.`
          );
          setProcessing(false);
          return;
        }
      }

      // Allocate Section 179 using greedy approach with phaseout-adjusted limit
      let remainingCapacity = maxDeduction;
      let totalAllocated = 0;
      const updates = [];

      for (const item of sortedEquipment) {
        if (remainingCapacity <= 0) break;

        const eligibleCost = parseFloat(item.purchase_cost) * (parseFloat(item.business_use_percent) / 100);
        const allocatedAmount = Math.min(eligibleCost, remainingCapacity);
        
        // If Section 179 fully covers eligible cost, no remaining basis for bonus depreciation
        const remainingBasis = eligibleCost - allocatedAmount;
        const bonusPercentage = remainingBasis > 0 ? (section179Settings.bonus_depr_percentage || 60) : 0;

        updates.push({
          id: item.id,
          section_179_elected_amount: allocatedAmount,
          bonus_depreciation_percentage: bonusPercentage
        });

        totalAllocated += allocatedAmount;
        remainingCapacity -= allocatedAmount;
      }

      // Update all equipment items
      for (const update of updates) {
        const { error } = await supabase
          .from('equipment_items' as any)
          .update({
            section_179_elected_amount: update.section_179_elected_amount,
            bonus_depreciation_percentage: update.bonus_depreciation_percentage,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Create audit record
      const { error: auditError } = await supabase
        .from('section179_batch_runs' as any)
        .insert([{
          tax_year: selectedTaxYear,
          total_equipment_cost: totalEquipmentCost,
          total_eligible_cost: totalEligibleCost,
          total_section_179_allocated: totalAllocated,
          equipment_count: eligibleEquipment.length,
          eligible_equipment_count: updates.length,
          max_deduction_limit: maxDeduction,
          remaining_capacity: remainingCapacity,
          allocation_method: 'greedy_largest_first',
          notes: phaseoutMessage ? 
            `Auto-allocation run for ${selectedTaxYear}. Phaseout applied. Allocated $${totalAllocated.toLocaleString()} across ${updates.length} items.` :
            `Auto-allocation run for ${selectedTaxYear}. Allocated $${totalAllocated.toLocaleString()} across ${updates.length} items.`,
          run_at: new Date().toISOString()
        }]);

      if (auditError) console.error('Audit log error:', auditError);

      alert(
        `✅ Section 179 Auto-Allocation Complete!\n\n` +
        `Tax Year: ${selectedTaxYear}\n` +
        `Eligible Equipment: ${updates.length} of ${eligibleEquipment.length}\n` +
        `Total Allocated: $${totalAllocated.toLocaleString()}\n` +
        `Remaining Capacity: $${remainingCapacity.toLocaleString()}` +
        phaseoutMessage +
        `\n\nReview with your CPA before filing.`
      );

      // Reload equipment to show updated allocations
      loadEquipment();
    } catch (err) {
      console.error('Error in auto-allocation:', err);
      alert('Failed to allocate Section 179. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function autoAssignCategories() {
    if (!confirm('Auto-assign equipment categories based on description keywords?\n\nThis will set FMV calculation categories for all uncategorized equipment.')) {
      return;
    }

    try {
      setProcessing(true);
      const uncategorized = equipmentItems.filter((item: any) => !item.equipment_category);

      if (uncategorized.length === 0) {
        alert('All equipment already has categories assigned.');
        setProcessing(false);
        return;
      }

      let updated = 0;
      for (const item of uncategorized) {
        const desc = (item.description || '').toLowerCase();
        let category = 'other';

        // Auto-detect category from description
        if (desc.includes('speaker') || desc.includes('sub') || desc.includes('top') || desc.includes('line array') || desc.includes('wedge') || desc.includes('monitor')) {
          category = 'speakers';
        } else if (desc.includes('light') || desc.includes('led') || desc.includes('par') || desc.includes('moving head') || desc.includes('fixture')) {
          category = 'lighting';
        } else if (desc.includes('mixer') || desc.includes('console') || desc.includes('controller') || desc.includes('interface') || desc.includes('processor')) {
          category = 'mixers_controllers';
        } else if (desc.includes('mic') || desc.includes('cable') || desc.includes('amp') || desc.includes('rack') || desc.includes('snake') || desc.includes('di box')) {
          category = 'audio_gear';
        }

        const { error } = await supabase
          .from('equipment_items' as any)
          .update({ equipment_category: category })
          .eq('id', item.id);

        if (!error) updated++;
      }

      alert(`✅ Categories assigned to ${updated} equipment items!\n\nFMV will now calculate automatically.`);
      loadEquipment();
    } catch (err) {
      console.error('Error assigning categories:', err);
      alert('Failed to assign categories. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function recalculateFMV() {
    if (!confirm('Recalculate FMV for all equipment with categories?\n\nThis will update FMV values based on current category and lease terms.')) {
      return;
    }

    try {
      setProcessing(true);
      const categorized = equipmentItems.filter((item: any) => item.equipment_category);

      if (categorized.length === 0) {
        alert('No equipment has categories assigned. Please assign categories first.');
        setProcessing(false);
        return;
      }

      let updated = 0;
      for (const item of categorized) {
        // Trigger update to force FMV recalculation via trigger
        const { error } = await supabase
          .from('equipment_items' as any)
          .update({ 
            equipment_category: item.equipment_category // Update with same value to trigger FMV calc
          })
          .eq('id', item.id);

        if (!error) updated++;
      }

      alert(`✅ FMV recalculated for ${updated} equipment items!`);
      loadEquipment();
    } catch (err) {
      console.error('Error recalculating FMV:', err);
      alert('Failed to recalculate FMV. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function calculateTaxableIncome(equipment: any) {
    try {
      setProcessing(true);
      
      // Get total lease payments from financing application
      const { data: payments, error: paymentsError } = await supabase
        .from('financing_payments')
        .select('amount')
        .eq('application_id', equipment.financing_id)
        .eq('status', 'paid');
      
      if (paymentsError) throw paymentsError;
      
      const totalLeasePayments = payments?.reduce((sum, p) => sum + parseFloat((p as any).amount || 0), 0) || 0;
      const purchaseCost = parseFloat(equipment.purchase_cost) || 0;
      const section179 = parseFloat(equipment.section_179_elected_amount) || 0;
      const bonusPercent = parseFloat(equipment.bonus_depreciation_percentage) || 0;
      const fmv = parseFloat(equipment.calculated_fmv) || 0;
      
      // Calculate bonus depreciation amount
      const bonusDepreciation = (purchaseCost - section179) * (bonusPercent / 100);
      
      // Calculate adjusted basis: PurchaseCost - Section179 - BonusDepreciation
      const adjustedBasis = purchaseCost - section179 - bonusDepreciation;
      
      // Calculate taxable income: TotalLeasePayments + FMV - AdjustedBasis
      const taxableIncome = totalLeasePayments + fmv - adjustedBasis;
      
      setTaxableIncomeResult({
        totalLeasePayments,
        fmv,
        adjustedBasis,
        purchaseCost,
        section179,
        bonusDepreciation,
        taxableIncome
      });
      
      setSelectedEquipmentForTaxCalc(equipment);
      setShowTaxableIncomeModal(true);
    } catch (err) {
      console.error('Error calculating taxable income:', err);
      alert('Failed to calculate taxable income. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function completeLeaseTransfer(equipmentId: string) {
    if (!confirm('Complete lease transfer and record taxable income?\n\nThis will:\n- Mark equipment as transferred to customer\n- Record FMV sale for tax purposes\n- Calculate final taxable income')) {
      return;
    }
    
    try {
      setProcessing(true);
      
      const { error } = await (supabase as any).rpc('complete_lease_transfer', {
        equipment_id: equipmentId
      });
      
      if (error) throw error;
      
      alert('✅ Lease transfer completed successfully!\n\nTaxable income has been recorded for tax reporting.');
      setShowTaxableIncomeModal(false);
      loadEquipment();
    } catch (err) {
      console.error('Error completing lease transfer:', err);
      alert('Failed to complete lease transfer. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function exportAccountantReport() {
    try {
      // Filter equipment for selected tax year
      const yearEquipment = equipmentItems.filter((item: any) => {
        const itemYear = new Date(item.placed_in_service_date).getFullYear();
        return itemYear === selectedTaxYear;
      });

      if (yearEquipment.length === 0) {
        alert(`No equipment found for ${selectedTaxYear}.`);
        return;
      }

      // Calculate totals
      let totalCost = 0;
      let totalEligible = 0;
      let totalSection179 = 0;
      let totalBonus = 0;

      const equipmentData = yearEquipment.map((item: any) => {
        const purchaseCost = parseFloat(item.purchase_cost) || 0;
        const businessUse = parseFloat(item.business_use_percent) || 0;
        const section179Amount = parseFloat(item.section_179_elected_amount) || 0;
        const bonusPercent = parseFloat(item.bonus_depreciation_percentage) || 0;

        const eligibleCost = purchaseCost * (businessUse / 100);
        const remainingBasis = eligibleCost - section179Amount;
        const bonusDepreciation = remainingBasis * (bonusPercent / 100);

        totalCost += purchaseCost;
        totalEligible += eligibleCost;
        totalSection179 += section179Amount;
        totalBonus += bonusDepreciation;

        return {
          ...item,
          purchaseCost,
          businessUse,
          section179Amount,
          bonusPercent,
          eligibleCost,
          remainingBasis,
          bonusDepreciation
        };
      });

      // Create PDF window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to generate the PDF report.');
        return;
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Section 179 Equipment Report - ${selectedTaxYear}</title>
  <style>
    @media print {
      @page { margin: 0.5in; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 20px;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 10px 0;
      color: #1a1a1a;
    }
    h2 {
      font-size: 14px;
      margin: 20px 0 10px 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 5px;
    }
    .header {
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid #667eea;
    }
    .meta {
      font-size: 10px;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 10px;
    }
    th {
      background: #667eea;
      color: white;
      padding: 8px 4px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 6px 4px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .summary-box {
      background: #f0f0f0;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #667eea;
    }
    .summary-box table {
      margin: 0;
    }
    .summary-box td {
      border: none;
      padding: 4px 8px;
    }
    .summary-box .label {
      font-weight: 600;
      width: 60%;
    }
    .summary-box .value {
      text-align: right;
      font-weight: 600;
      color: #667eea;
    }
    .total-row {
      background: #e8edff !important;
      font-weight: 700;
      font-size: 11px;
    }
    .gl-entry {
      background: #fff9e6;
      padding: 15px;
      margin: 15px 0;
      border: 1px solid #ffd700;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px;
      margin: 15px 0;
      font-size: 10px;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Section 179 Equipment Tax Deduction Report</h1>
    <div class="meta">
      <strong>Tax Year:</strong> ${selectedTaxYear} | 
      <strong>Generated:</strong> ${new Date().toLocaleString()} | 
      <strong>Equipment Count:</strong> ${yearEquipment.length}
    </div>
  </div>

  ${section179Settings ? `
  <div class="summary-box">
    <h2 style="margin-top: 0; border: none;">Tax Year Settings (IRS Limits)</h2>
    <table>
      <tr>
        <td class="label">Max Section 179 Deduction</td>
        <td class="value">$${section179Settings.max_section_179_deduction?.toLocaleString()}</td>
      </tr>
      <tr>
        <td class="label">Phaseout Threshold</td>
        <td class="value">$${section179Settings.phaseout_threshold?.toLocaleString()}</td>
      </tr>
      <tr>
        <td class="label">Bonus Depreciation Percentage</td>
        <td class="value">${section179Settings.bonus_depr_percentage}%</td>
      </tr>
      <tr>
        <td class="label">Minimum Business Use Required</td>
        <td class="value">${section179Settings.min_business_use_percent}%</td>
      </tr>
    </table>
  </div>
  ` : ''}

  <h2>Equipment Details</h2>
  <table>
    <thead>
      <tr>
        <th>Customer</th>
        <th>Description</th>
        <th class="text-right">Purchase Cost</th>
        <th class="text-center">In-Service</th>
        <th class="text-center">Business Use</th>
        <th class="text-right">Eligible Cost</th>
        <th class="text-right">§179 Elected</th>
        <th class="text-right">Bonus %</th>
        <th class="text-right">Bonus Depr.</th>
      </tr>
    </thead>
    <tbody>
      ${equipmentData.map(item => `
        <tr>
          <td>${item.financing?.client_name || 'N/A'}</td>
          <td>${item.description}</td>
          <td class="text-right">$${item.purchaseCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td class="text-center">${new Date(item.placed_in_service_date).toLocaleDateString()}</td>
          <td class="text-center">${item.businessUse}%</td>
          <td class="text-right">$${item.eligibleCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td class="text-right">$${item.section179Amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td class="text-center">${item.bonusPercent}%</td>
          <td class="text-right">$${item.bonusDepreciation.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="2"><strong>TOTALS</strong></td>
        <td class="text-right">$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td></td>
        <td></td>
        <td class="text-right">$${totalEligible.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td class="text-right">$${totalSection179.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        <td></td>
        <td class="text-right">$${totalBonus.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-box">
    <h2 style="margin-top: 0; border: none;">Summary Totals</h2>
    <table>
      <tr>
        <td class="label">Total Equipment Cost</td>
        <td class="value">$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
      <tr>
        <td class="label">Total Eligible Cost (Business Use Adjusted)</td>
        <td class="value">$${totalEligible.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
      <tr>
        <td class="label">Total Section 179 Elected</td>
        <td class="value">$${totalSection179.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
      <tr>
        <td class="label">Total Bonus Depreciation</td>
        <td class="value">$${totalBonus.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
      <tr style="background: #667eea; color: white;">
        <td class="label" style="color: white; font-size: 12px;">TOTAL FIRST-YEAR DEDUCTION</td>
        <td class="value" style="color: white; font-size: 12px;">$${(totalSection179 + totalBonus).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <h2>Suggested General Ledger Journal Entries</h2>
  <div class="warning">
    <strong>⚠️ IMPORTANT:</strong> These are suggested journal entries only. Review with your CPA before posting to your accounting system.
  </div>

  <div class="gl-entry">
    <h3 style="margin: 0 0 10px 0; font-size: 12px;">Entry 1: Capitalize Equipment Purchases</h3>
    <table>
      <thead>
        <tr>
          <th>Account</th>
          <th class="text-right">Debit</th>
          <th class="text-right">Credit</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Equipment Asset</td>
          <td class="text-right">$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td class="text-right">—</td>
          <td>Capitalized equipment purchases</td>
        </tr>
        <tr>
          <td>Cash / Accounts Payable</td>
          <td class="text-right">—</td>
          <td class="text-right">$${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td>Payment for equipment</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="gl-entry">
    <h3 style="margin: 0 0 10px 0; font-size: 12px;">Entry 2: Record First-Year Depreciation (§179 + Bonus)</h3>
    <table>
      <thead>
        <tr>
          <th>Account</th>
          <th class="text-right">Debit</th>
          <th class="text-right">Credit</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Depreciation Expense</td>
          <td class="text-right">$${(totalSection179 + totalBonus).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td class="text-right">—</td>
          <td>Section 179 + Bonus depreciation</td>
        </tr>
        <tr>
          <td>Accumulated Depreciation</td>
          <td class="text-right">—</td>
          <td class="text-right">$${(totalSection179 + totalBonus).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
          <td>First-year depreciation</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="warning" style="margin-top: 30px;">
    <p style="margin: 0 0 8px 0;"><strong>Important Notes:</strong></p>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Equipment must be used more than 50% for business to qualify for Section 179</li>
      <li>Section 179 deduction cannot exceed business taxable income</li>
      <li>Equipment must be purchased and placed in service during the tax year</li>
      <li>Consult with your CPA regarding state tax treatment</li>
      <li>Keep detailed records of equipment usage for audit purposes</li>
      <li>Form 4562 must be filed with your tax return to claim these deductions</li>
    </ul>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 9px; color: #666;">
    <p>This report was generated automatically. All calculations should be reviewed and verified by a qualified tax professional before filing.</p>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
    window.onafterprint = function() {
      window.close();
    };
  </script>
</body>
</html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report. Please try again.');
    }
  }
  
  async function setDownPayment(applicationId: string) {
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;
    
    const loanAmount = parseFloat(app.loan_amount);
    const amounts = [
      { label: '$500', value: 500 },
      { label: '$1,000', value: 1000 },
      { label: '$2,500', value: 2500 },
      { label: '$5,000', value: 5000 },
      { label: '$7,500', value: 7500 },
      { label: '$10,000', value: 10000 },
      { label: '$15,000', value: 15000 },
      { label: '$20,000', value: 20000 },
    ].filter(a => a.value < loanAmount);
    
    const amountStr = prompt(
      `Select down payment amount:\n\n` + 
      amounts.map((a, i) => `${i + 1}. ${a.label} (${((a.value / loanAmount) * 100).toFixed(1)}%)`).join('\n') +
      `\n\nEnter number (1-${amounts.length}) or custom dollar amount:`,
      '1'
    );
    
    if (!amountStr) return;
    
    let downPaymentAmount = 0;
    const choice = parseInt(amountStr);
    
    if (choice >= 1 && choice <= amounts.length) {
      downPaymentAmount = amounts[choice - 1].value;
    } else {
      downPaymentAmount = parseFloat(amountStr.replace(/[$,]/g, ''));
    }
    
    if (isNaN(downPaymentAmount) || downPaymentAmount <= 0 || downPaymentAmount >= loanAmount) {
      alert('Invalid amount');
      return;
    }
    
    const percentage = ((downPaymentAmount / loanAmount) * 100).toFixed(2);
    
    if (!confirm(`Set down payment to $${downPaymentAmount.toLocaleString()} (${percentage}%)?`)) return;
    
    const { error } = await supabase
      .from('financing_applications')
      .update({
        down_payment_percentage: parseFloat(percentage),
        down_payment_amount: downPaymentAmount
      } as any)
      .eq('id', applicationId);
    
    if (!error) {
      alert('Down payment set successfully');
      loadApplications();
    } else {
      alert('Error: ' + error.message);
    }
  }
  
  async function chargeDownPayment(applicationId: string) {
    const app = applications.find(a => a.id === applicationId);
    if (!app || !app.down_payment_amount || !app.stripe_payment_method_id) {
      alert('Missing payment information');
      return;
    }
    
    if (!confirm(`Charge down payment of $${parseFloat(app.down_payment_amount).toLocaleString()} to ${app.client_name}?`)) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/financing/process-payment-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          amount: parseFloat(app.down_payment_amount),
          description: 'Down Payment',
          isDownPayment: true
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Recalculate monthly payment with new balance
        const newBalance = parseFloat(app.loan_amount) - parseFloat(app.down_payment_amount);
        const months = parseInt(app.term_months);
        const rate = parseFloat(app.interest_rate) / 100 / 12;
        const newMonthlyPayment = (newBalance * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
        
        // Update application with new values
        await supabase
          .from('financing_applications')
          .update({
            down_payment_paid: true,
            down_payment_date: new Date().toISOString(),
            remaining_balance: newBalance,
            monthly_payment: newMonthlyPayment
          } as any)
          .eq('id', app.id);
        
        alert(`Down payment charged successfully!\n\nNew monthly payment: $${newMonthlyPayment.toFixed(2)}`);
        loadApplications();
      } else {
        alert('Payment failed: ' + result.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  }
  
  async function addLateFee(loanId: string) {
    const loan = activeFinancing.find(l => l.id === loanId);
    if (!loan) return;
    
    const monthlyPayment = parseFloat(loan.monthly_payment);
    const lateFee = (monthlyPayment * 0.05).toFixed(2);
    
    if (!confirm(`Add 5% late fee ($${lateFee}) to ${loan.client_name}'s account?`)) return;
    
    // Get the next unpaid payment
    const { data: nextPayment, error: paymentError } = await supabase
      .from('financing_payments')
      .select('*')
      .eq('application_id', loanId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(1)
      .single();
    
    if (paymentError || !nextPayment) {
      alert('Could not find next payment to apply late fee');
      return;
    }
    
    // Update payment with late fee
    const newPaymentAmount = parseFloat(nextPayment.payment_amount.toString()) + parseFloat(lateFee);
    
    const { error } = await supabase
      .from('financing_payments')
      .update({
        payment_amount: newPaymentAmount,
        late_fee: parseFloat(lateFee)
      } as any)
      .eq('id', nextPayment.id);
    
    if (!error) {
      alert(`Late fee of $${lateFee} added successfully`);
      loadPayments();
      loadActiveFinancing();
    } else {
      alert('Error adding late fee: ' + error.message);
    }
  }

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
          Manage financing applications, active leases, and payment tracking
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #3a3a3a', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { id: 'calculator', label: 'Calculator', icon: <FaCalculator /> },
            { id: 'applications', label: 'Applications', icon: <FaFileSignature /> },
            { id: 'active', label: 'Active Leases', icon: <FaChartLine /> },
            { id: 'payments', label: 'Payments', icon: <FaDollarSign /> },
            { id: 'section179', label: 'Section 179', icon: <FaCog /> },
            { id: 'website', label: 'Website Widget', icon: <FaCode /> },
            { id: 'archive', label: 'Archive', icon: <FaArchive /> }
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 500px', 
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* Left Column: Cost Estimator */}
          <div style={{ background: '#2a2a2a', borderRadius: '12px', padding: '2rem', border: '1px solid #3a3a3a' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '1.5rem' }}>📋 Cost Estimator</h2>

            {/* Equipment Items Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Equipment & Materials</h3>
                <button
                  onClick={addEstimatorItem}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  + Add Item
                </button>
              </div>

              {estimatorItems.length > 0 ? (
                <div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1a1a1a' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '14px', fontWeight: 600, borderBottom: '1px solid #3a3a3a' }}>Description</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '14px', fontWeight: 600, width: '80px', borderBottom: '1px solid #3a3a3a' }}>Qty</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '14px', fontWeight: 600, width: '100px', borderBottom: '1px solid #3a3a3a' }}>Unit Cost</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '14px', fontWeight: 600, width: '100px', borderBottom: '1px solid #3a3a3a' }}>Total</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '14px', fontWeight: 600, width: '60px', borderBottom: '1px solid #3a3a3a' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimatorItems.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #3a3a3a' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateEstimatorItem(item.id, 'description', e.target.value)}
                              placeholder="Item description"
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#1a1a1a',
                                border: '1px solid #3a3a3a',
                                borderRadius: '4px',
                                color: '#e5e5e5',
                                fontSize: '14px'
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateEstimatorItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                              min="1"
                              style={{
                                width: '60px',
                                padding: '0.5rem',
                                background: '#1a1a1a',
                                border: '1px solid #3a3a3a',
                                borderRadius: '4px',
                                color: '#e5e5e5',
                                fontSize: '14px',
                                textAlign: 'center'
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <input
                              type="number"
                              value={item.unitCost}
                              onChange={(e) => updateEstimatorItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              style={{
                                width: '90px',
                                padding: '0.5rem',
                                background: '#1a1a1a',
                                border: '1px solid #3a3a3a',
                                borderRadius: '4px',
                                color: '#e5e5e5',
                                fontSize: '14px',
                                textAlign: 'right'
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: '#e5e5e5' }}>
                            ${(item.quantity * item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button
                              onClick={() => removeEstimatorItem(item.id)}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#9ca3af',
                  background: '#1a1a1a',
                  borderRadius: '8px',
                  border: '1px dashed #3a3a3a',
                  marginBottom: '1rem'
                }}>
                  No items added yet. Click "+ Add Item" to start building your estimate.
                </div>
              )}
            </div>

            {/* Labor Section */}
            <div style={{ marginBottom: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #3a3a3a' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1rem' }}>Labor / Installation</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                    Hours
                  </label>
                  <input
                    type="number"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    min="0"
                    step="0.5"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: 500 }}>
                    Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                    min="0"
                    step="5"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ 
                padding: '1rem', 
                background: '#1a1a1a',
                borderRadius: '8px',
                border: '1px solid #3a3a3a'
              }}>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '0.25rem' }}>Labor Total:</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#e5e5e5' }}>
                  ${(parseFloat(laborHours) * parseFloat(laborRate)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Estimate Summary */}
            <div style={{ 
              padding: '1.5rem',
              background: '#1a1a1a',
              borderRadius: '8px',
              border: '2px solid #667eea',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '14px', color: '#9ca3af' }}>
                <span>Equipment Subtotal:</span>
                <span style={{ fontWeight: 500, color: '#e5e5e5' }}>${calculateEstimate().equipmentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '14px', color: '#9ca3af' }}>
                <span>Labor Subtotal:</span>
                <span style={{ fontWeight: 500, color: '#e5e5e5' }}>${calculateEstimate().laborTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '14px', color: '#9ca3af', paddingTop: '0.75rem', borderTop: '1px solid #3a3a3a' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600, color: '#e5e5e5' }}>${calculateEstimate().subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '14px', color: '#9ca3af' }}>
                <span>Sales Tax (8.25%):</span>
                <span style={{ fontWeight: 500, color: '#e5e5e5' }}>${calculateEstimate().salesTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: '1rem', 
                borderTop: '2px solid #667eea',
                marginTop: '0.75rem'
              }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#e5e5e5' }}>Total Estimate:</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#667eea' }}>
                  ${calculateEstimate().total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Apply to Calculator Button */}
            <button
              onClick={applyEstimateToCalculator}
              disabled={calculateEstimate().total === 0}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: calculateEstimate().total === 0 ? '#4a4a4a' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: calculateEstimate().total === 0 ? 'not-allowed' : 'pointer',
                opacity: calculateEstimate().total === 0 ? 0.5 : 1
              }}
            >
              → Use This Amount in Calculator
            </button>
          </div>

          {/* Right Column: Payment Calculator */}
          <div style={{ background: '#2a2a2a', borderRadius: '12px', padding: '2rem', border: '1px solid #3a3a3a' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '1.5rem' }}>💳 Payment Calculator</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Lease Amount</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>$</span>
                  <input
                    type="number"
                    value={financeAmount}
                    onChange={(e) => setFinanceAmount(e.target.value)}
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
        </div>
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Lease-to-Own Applications</h2>
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
              + New Lease-to-Own Application
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
                <h3 style={{ fontSize: '24px', marginBottom: '1.5rem' }}>New Lease-to-Own Application</h3>
                
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
                    placeholder="Driver's License / ID Number"
                    value={newApp.drivers_license_number}
                    onChange={(e) => setNewApp({...newApp, drivers_license_number: e.target.value})}
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
                    placeholder="Lease Amount"
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
                  
                  <input
                    placeholder="Sales Tax Rate (%)"
                    type="number"
                    step="0.01"
                    value={newApp.sales_tax_rate}
                    onChange={(e) => setNewApp({...newApp, sales_tax_rate: e.target.value})}
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
                  
                  {/* Locked Interest Rate */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>
                      Interest Rate (Locked)
                    </label>
                    <input
                      type="text"
                      value={`${newApp.interest_rate}%`}
                      readOnly
                      style={{
                        padding: '0.75rem',
                        background: '#333',
                        border: '1px solid #3a3a3a',
                        borderRadius: '8px',
                        color: '#9ca3af',
                        cursor: 'not-allowed',
                        opacity: 0.7
                      }}
                    />
                  </div>
                  
                  <input
                    placeholder="Business Address"
                    value={newApp.business_address}
                    onChange={(e) => setNewApp({...newApp, business_address: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <input
                    placeholder="Business EIN"
                    value={newApp.business_ein}
                    onChange={(e) => setNewApp({...newApp, business_ein: e.target.value})}
                    style={{
                      padding: '0.75rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
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

                  {/* Lease Summary with Sales Tax */}
                  {newApp.loan_amount && newApp.sales_tax_rate && newApp.term_months && newApp.interest_rate && (() => {
                    const principal = parseFloat(newApp.loan_amount);
                    const months = parseInt(newApp.term_months);
                    const rate = parseFloat(newApp.interest_rate) / 100 / 12;
                    const basePayment = (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
                    const salesTaxRate = parseFloat(newApp.sales_tax_rate) / 100;
                    const salesTaxPerPayment = basePayment * salesTaxRate;
                    const totalPayment = basePayment + salesTaxPerPayment;
                    const totalPaid = totalPayment * months;
                    
                    return (
                      <div style={{
                        padding: '1rem',
                        background: '#1a1a1a',
                        border: '1px solid #667eea',
                        borderRadius: '8px',
                        marginTop: '1rem'
                      }}>
                        <h4 style={{ color: '#667eea', marginBottom: '0.75rem', fontSize: '14px', fontWeight: 600 }}>Payment Summary</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#9ca3af' }}>Equipment Financed:</span>
                            <span style={{ color: '#e5e5e5', fontWeight: 600 }}>${principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#9ca3af' }}>Base Payment:</span>
                            <span style={{ color: '#e5e5e5', fontWeight: 600 }}>${basePayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}/mo</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#9ca3af' }}>Sales Tax ({newApp.sales_tax_rate}%):</span>
                            <span style={{ color: '#e5e5e5', fontWeight: 600 }}>+${salesTaxPerPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}/mo</span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            paddingTop: '0.5rem',
                            borderTop: '1px solid #3a3a3a',
                            marginTop: '0.25rem'
                          }}>
                            <span style={{ color: '#667eea', fontWeight: 600 }}>Monthly Payment:</span>
                            <span style={{ color: '#667eea', fontWeight: 700, fontSize: '16px' }}>${totalPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}/mo</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Total over {months} months:</span>
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>${totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {newApp.loan_amount && newApp.sales_tax_rate && (!newApp.term_months || !newApp.interest_rate) && (
                    <div style={{
                      padding: '1rem',
                      background: '#1a1a1a',
                      border: '1px solid #667eea',
                      borderRadius: '8px',
                      marginTop: '1rem'
                    }}>
                      <p style={{ color: '#9ca3af', fontSize: '14px' }}>Enter term and interest rate to see payment breakdown</p>
                    </div>
                  )}

                  {/* Secure Payment Method Section */}
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem',
                    background: '#1a1a1a',
                    border: '2px solid #667eea',
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ marginBottom: '0.75rem', color: '#667eea', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FaCreditCard />
                      Secure Payment Method
                    </h4>
                    <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '1rem' }}>
                      Payment information is securely encrypted by Stripe. Your bank details are never stored on our servers.
                    </p>
                    {newApp.payment_method_added ? (
                      <div style={{ 
                        padding: '1rem', 
                        background: '#059669', 
                        borderRadius: '6px',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaCreditCard />
                        <span>✓ Payment method added securely</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => addPaymentMethod()}
                        disabled={!newApp.client_email || !newApp.client_name || processing}
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: newApp.client_email && newApp.client_name && !processing ? '#667eea' : '#4a5568',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: newApp.client_email && newApp.client_name && !processing ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <FaCreditCard />
                        {processing ? 'Processing...' : 'Add Bank Account'}
                      </button>
                    )}
                    {!newApp.client_email || !newApp.client_name ? (
                      <p style={{ fontSize: '12px', color: '#f87171', marginTop: '0.5rem' }}>
                        Please enter client name and email first
                      </p>
                    ) : null}
                  </div>

                  {/* Terms and Conditions */}
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#1a1a1a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ marginBottom: '0.75rem', color: '#667eea', fontSize: '16px' }}>Equipment Financing Agreement – Standard Terms & Conditions</h4>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1rem', maxHeight: '300px', overflow: 'auto', lineHeight: '1.6', padding: '0.5rem' }}>
                      <p style={{ marginBottom: '0.75rem', fontSize: '13px' }}>
                        By electronically signing or checking the acceptance box, the Borrower agrees to be bound by the following Terms and Conditions. 
                        These Terms apply in all 50 U.S. states and are governed by the Uniform Commercial Code ("UCC") as adopted in the Borrower's state.
                      </p>
                      
                      <p style={{ fontWeight: '600', marginTop: '1rem', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '13px' }}>1. Payment Obligations</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>1.1 Monthly Payments.</strong> The Borrower shall make each monthly payment in the amount and on the schedule stated in the Financing Agreement. Payments are due on or before the stated due date.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>1.2 Automatic Payments.</strong> Borrower authorizes the Lender to initiate automatic ACH debits from the bank account provided for all scheduled payments, fees, and authorized charges.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>1.3 Late Fees.</strong> A late fee of 5% of the scheduled payment may be charged if payment is not received within five (5) calendar days after the due date, or the maximum amount permitted under applicable state law, whichever is lower.</p>
                      <p style={{ marginBottom: '0.75rem' }}><strong>1.4 Returned Payment Fees.</strong> Borrower is responsible for any returned ACH or insufficient-funds fees charged by financial institutions or applicable law.</p>
                      
                      <p style={{ fontWeight: '600', marginTop: '1rem', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '13px' }}>2. Lease-to-Own Agreement</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>2.1 Lease Term.</strong> You lease the equipment during the term stated in your agreement. The Lessor retains full ownership during the lease.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>2.2 Automatic Ownership Transfer.</strong> When you make all required payments and satisfy all obligations under this Agreement, the Lessor will automatically transfer ownership of the equipment to you. No additional payment from you is required beyond the scheduled lease payments.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>2.3 No Additional Charges.</strong> You will not be required to pay any buyout fee, balloon payment, or end-of-lease payment. All ownership transfer considerations are included in your lease payments.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>2.5 Maintenance.</strong> You shall keep the equipment in good working condition, use it in a commercially reasonable manner, and comply with manufacturer guidelines.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>2.6 Restrictions on Transfer.</strong> You shall not sell, lease, transfer, assign, or encumber the equipment without the Lessor's prior written consent while any amount remains outstanding under this Agreement.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>2.7 Insurance.</strong> For equipment valued at $10,000 or more, you must maintain insurance against loss, theft, and damage naming the Lessor as a loss payee until all payments are completed.</p>
                      <p style={{ marginBottom: '0.75rem' }}><strong>2.8 Inspection.</strong> You shall permit the Lessor to inspect the equipment upon reasonable notice and at reasonable times during the lease term.</p>
                      
                      <p style={{ fontWeight: '600', marginTop: '1rem', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '13px' }}>3. Payment Processing & Banking Information</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>3.1 Accurate Information.</strong> You must provide current, accurate, and complete banking information.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>3.2 Notice of Changes.</strong> You must notify the Lessor within three (3) business days of any changes to banking information.</p>
                      <p style={{ marginBottom: '0.75rem' }}><strong>3.3 Secure Processing.</strong> You understand that payment information is processed through secure, encrypted systems (e.g., Stripe). Lessor may use third-party processors to facilitate payments.</p>
                      
                      <p style={{ fontWeight: '600', marginTop: '1rem', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '13px' }}>4. Default & Remedies</p>
                      <p style={{ marginBottom: '0.5rem' }}>You shall be in default if any of the following occur:</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>4.1 Missed Payment.</strong> Failure to make any payment when due.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>4.2 Banking Failure.</strong> Returned or rejected ACH payments not cured promptly.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>4.3 Unauthorized Transfer.</strong> Attempting to sell, transfer, or dispose of the equipment.</p>
                      <p style={{ marginBottom: '0.5rem' }}><strong>4.4 Breach.</strong> Failure to comply with any term of this Agreement.</p>
                      
                      <p style={{ marginBottom: '0.5rem', fontStyle: 'italic' }}>Upon Default, Lessor May Take Any Legally Permitted Action, Including:</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>4.5 Acceleration.</strong> Declaring the entire remaining balance immediately due and payable.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>4.6 Repossession.</strong> Taking possession of the equipment without breach of the peace, and disposing of it in accordance with applicable law.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>4.7 Deficiency Balance.</strong> You remain liable for any deficiency after disposition, plus interest and fees permitted by law.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>4.8 Collections & Reporting.</strong> Initiating collection actions and reporting delinquent accounts to credit bureaus to the extent permitted by law.</p>
                      <p style={{ marginBottom: '0.75rem' }}><strong>4.9 Legal Costs.</strong> You shall pay all reasonable collection costs, including attorney's fees, court costs, and repossession expenses, as permitted by state law.</p>
                      
                      <p style={{ fontWeight: '600', marginTop: '1rem', marginBottom: '0.5rem', color: '#e5e5e5', fontSize: '13px' }}>5. Additional Terms</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>5.1 Payment Terms.</strong> The payment schedule and term length are disclosed in this agreement upon approval.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>5.2 Early Payoff.</strong> Early payoff is permitted and may be completed without penalty, unless expressly stated otherwise and where allowed by state law.</p>
                      <p style={{ marginBottom: '0.25rem' }}><strong>5.3 Electronic Signature.</strong> By checking the acceptance box or electronically signing, you agree to these Terms under the Electronic Signatures in Global and National Commerce Act (E-SIGN Act).</p>
                      <p style={{ marginBottom: '0.75rem' }}><strong>5.4 Governing Law.</strong> This Agreement is governed by state law where you reside, including that state's adoption of the Uniform Commercial Code.</p>
                      
                      <p style={{ marginTop: '1rem', padding: '0.75rem', background: '#374151', borderRadius: '4px', fontSize: '11px', fontStyle: 'italic', color: '#d1d5db' }}>
                        <strong>IMPORTANT NOTICE:</strong> This is a legally binding lease-to-own agreement. Please read carefully. By checking the box below, you acknowledge 
                        that you have read, understood, and agree to all terms and conditions, and you authorize electronic processing of payments from your bank account.
                      </p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', background: '#1f2937', borderRadius: '6px', border: '2px solid #3a3a3a' }}>
                      <input
                        type="checkbox"
                        checked={newApp.terms_accepted}
                        onChange={(e) => setNewApp({...newApp, terms_accepted: e.target.checked})}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: '500', lineHeight: '1.5' }}>
                        I have read, understand, and electronically agree to the Equipment Financing Agreement Terms & Conditions. 
                        I authorize automatic ACH payment processing and acknowledge this constitutes a legally binding electronic signature.
                      </span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      onClick={() => sendApplicationSMS(newApp.client_phone, newApp.client_name)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: newApp.client_phone && newApp.client_name ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      📱 Send via SMS
                    </button>
                    <button
                      onClick={createApplication}
                      disabled={!newApp.terms_accepted || !newApp.client_name || !newApp.client_email || !newApp.client_phone || !newApp.drivers_license_number || !newApp.loan_amount || !newApp.equipment_description}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: (newApp.terms_accepted && newApp.client_name && newApp.client_email && newApp.client_phone && newApp.drivers_license_number && newApp.loan_amount && newApp.equipment_description) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#3a3a3a',
                        border: 'none',
                        borderRadius: '8px',
                        color: (newApp.terms_accepted && newApp.client_name && newApp.client_email && newApp.client_phone && newApp.drivers_license_number && newApp.loan_amount && newApp.equipment_description) ? 'white' : '#6b7280',
                        fontWeight: 600,
                        cursor: (newApp.terms_accepted && newApp.client_name && newApp.client_email && newApp.client_phone && newApp.drivers_license_number && newApp.loan_amount && newApp.equipment_description) ? 'pointer' : 'not-allowed',
                        opacity: (newApp.terms_accepted && newApp.client_name && newApp.client_email && newApp.client_phone && newApp.drivers_license_number && newApp.loan_amount && newApp.equipment_description) ? 1 : 0.5
                      }}
                    >
                      Submit Application
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
            {applications.filter(app => app.status === 'pending').map((app) => (
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
                    <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '0.5rem' }}>Lease Amount</div>
                    {editingLeaseAmount === app.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={editedAmount}
                          onChange={(e) => setEditedAmount(e.target.value)}
                          placeholder="Enter new amount"
                          style={{
                            padding: '0.5rem',
                            background: '#1a1a1a',
                            border: '1px solid #667eea',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontSize: '16px',
                            width: '140px'
                          }}
                        />
                        <button
                          onClick={() => updateLeaseAmount(app.id, editedAmount)}
                          disabled={processing || !editedAmount}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: processing || !editedAmount ? '#4b5563' : '#10b981',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '14px',
                            cursor: processing || !editedAmount ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingLeaseAmount(null);
                            setEditedAmount('');
                          }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#3a3a3a',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#e5e5e5',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>${parseFloat(app.loan_amount).toLocaleString()}</div>
                        <button
                          onClick={() => {
                            setEditingLeaseAmount(app.id);
                            setEditedAmount(app.loan_amount);
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#667eea',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    )}
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
                
                {/* Down Payment Section */}
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  background: '#1a1a1a', 
                  borderRadius: '8px',
                  border: '1px solid #3a3a3a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ color: '#9ca3af', fontSize: '14px', fontWeight: 600 }}>Down Payment</div>
                    {!app.down_payment_percentage && (
                      <button
                        onClick={() => setDownPayment(app.id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#667eea',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Set Down Payment
                      </button>
                    )}
                  </div>
                  {app.down_payment_percentage > 0 ? (
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#4ade80', marginBottom: '0.5rem' }}>
                        ${parseFloat(app.down_payment_amount).toLocaleString()} ({app.down_payment_percentage}%)
                      </div>
                      {!app.down_payment_paid ? (
                        <button
                          onClick={() => chargeDownPayment(app.id)}
                          disabled={processing}
                          style={{
                            padding: '0.5rem 1rem',
                            background: processing ? '#4b5563' : '#10b981',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '14px',
                            cursor: processing ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          💳 {processing ? 'Processing...' : 'Charge Down Payment'}
                        </button>
                      ) : (
                        <div style={{ color: '#10b981', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          ✅ Paid on {new Date(app.down_payment_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                      No down payment required
                    </div>
                  )}
                </div>

                {app.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'approved')}
                      disabled={processing}
                      style={{
                        padding: '0.5rem 1rem',
                        background: processing ? '#4b5563' : '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processing ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateApplicationStatus(app.id, 'rejected')}
                      disabled={processing}
                      style={{
                        padding: '0.5rem 1rem',
                        background: processing ? '#4b5563' : '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {app.status === 'approved' && (
                  <button
                    onClick={() => {
                      setActivatingApplication(app);
                      setShowActivationModal(true);
                      setProcessFirstPayment(true);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#667eea',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Activate Financing
                  </button>
                )}
              </div>
            ))}

            {applications.filter(app => app.status === 'pending').length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                No pending applications
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Leases Tab */}
      {activeTab === 'active' && (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '1.5rem' }}>Active Leases</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeFinancing.map((loan: any) => {
              const daysUntilDue = loan.next_payment_due 
                ? Math.ceil((new Date(loan.next_payment_due).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              
              return (
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
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '0.25rem' }}>
                      {loan.client_email}
                    </div>
                    {loan.client_phone && (
                      <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '0.25rem' }}>
                        📞 {loan.client_phone}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Next Payment Due</div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 600, 
                      color: daysUntilDue !== null && daysUntilDue < 0 ? '#ef4444' : daysUntilDue !== null && daysUntilDue <= 7 ? '#f59e0b' : '#667eea' 
                    }}>
                      {loan.next_payment_due ? new Date(loan.next_payment_due).toLocaleDateString() : 'N/A'}
                    </div>
                    {daysUntilDue !== null && (
                      <div style={{ fontSize: '12px', color: daysUntilDue < 0 ? '#ef4444' : '#9ca3af' }}>
                        {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : 
                         daysUntilDue === 0 ? 'Due today' : 
                         `${daysUntilDue} days`}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Lease Amount</div>
                    <div style={{ fontWeight: 600 }}>${parseFloat(loan.loan_amount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Term Length</div>
                    <div style={{ fontWeight: 600 }}>{loan.term_months} months ({(loan.term_months / 12).toFixed(1)} years)</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Remaining Balance</div>
                    <div style={{ fontWeight: 600 }}>${parseFloat(loan.remaining_balance || loan.loan_amount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Total Paid</div>
                    <div style={{ fontWeight: 600, color: '#10b981' }}>${parseFloat(loan.total_paid || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Monthly Payment</div>
                    <div style={{ fontWeight: 600 }}>
                      ${(() => {
                        const basePayment = parseFloat(loan.monthly_payment);
                        const taxRate = parseFloat(loan.sales_tax_rate || 0) / 100;
                        const salesTax = basePayment * taxRate;
                        const totalPayment = basePayment + salesTax;
                        return totalPayment.toFixed(2);
                      })()}
                      {loan.sales_tax_rate && parseFloat(loan.sales_tax_rate) > 0 && (
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'normal', marginTop: '2px' }}>
                          (${parseFloat(loan.monthly_payment).toFixed(2)} + ${(parseFloat(loan.monthly_payment) * parseFloat(loan.sales_tax_rate) / 100).toFixed(2)} tax)
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>Missed Payments</div>
                    <div style={{ fontWeight: 600, color: loan.missed_payments > 0 ? '#ef4444' : '#10b981' }}>
                      {loan.missed_payments || 0}
                    </div>
                  </div>
                </div>

                {/* Payment Method Info */}
                {loan.bank_account_last4 && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    padding: '0.75rem', 
                    background: '#1a1a1a', 
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}>
                    <FaUniversity style={{ display: 'inline', marginRight: '0.5rem', color: '#667eea' }} />
                    Payment Method: {loan.bank_account_type === 'checking' ? 'Checking' : 'Savings'} •••• {loan.bank_account_last4}
                  </div>
                )}

                {/* Progress Bar */}
                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#9ca3af', marginBottom: '0.5rem' }}>
                    <span>Lease Progress</span>
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

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      const { data: nextPayment } = await supabase
                        .from('financing_payments')
                        .select('*')
                        .eq('application_id', loan.id)
                        .eq('status', 'pending')
                        .order('due_date', { ascending: true })
                        .limit(1)
                        .single();
                      
                      if (nextPayment) {
                        setSelectedPayment(nextPayment);
                        setSelectedApplication(loan);
                        setShowPaymentModal(true);
                      } else {
                        alert('No pending payments found');
                      }
                    }}
                    disabled={!loan.bank_account_last4}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      padding: '0.75rem 1.5rem',
                      background: loan.bank_account_last4 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#3a3a3a',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      cursor: loan.bank_account_last4 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: loan.bank_account_last4 ? 1 : 0.5
                    }}
                  >
                    <FaCreditCard />
                    Process Payment
                  </button>

                  <button
                    onClick={() => sendPaymentReminder(loan.id, daysUntilDue !== null && daysUntilDue < 0 ? 'overdue' : 'upcoming')}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      padding: '0.75rem 1.5rem',
                      background: '#f59e0b',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <FaBell />
                    Send Reminder
                  </button>
                  
                  {daysUntilDue !== null && daysUntilDue < 0 && (
                    <button
                      onClick={() => addLateFee(loan.id)}
                      style={{
                        flex: 1,
                        minWidth: '180px',
                        padding: '0.75rem 1.5rem',
                        background: '#dc2626',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      💰 Add 5% Late Fee
                    </button>
                  )}
                  
                  <button
                    onClick={async () => {
                      if (confirm(`Cancel lease for ${loan.client_name}? Equipment will be archived and FMV recalculated based on actual lease term.`)) {
                        try {
                          // Calculate actual lease term in months
                          const startDate = new Date(loan.start_date);
                          const endDate = new Date();
                          const actualTermMonths = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                          
                          // Get all equipment for this lease
                          const { data: equipment, error: equipError } = await supabase
                            .from('equipment_items')
                            .select('*')
                            .eq('financing_id', loan.id);
                          
                          if (equipError) throw equipError;
                          
                          // Recalculate FMV for each equipment based on actual term
                          if (equipment && equipment.length > 0) {
                            for (const item of equipment) {
                              // Calculate new FMV based on actual lease term
                              let baseResidual = parseFloat(String(item.residual_percentage || 15));
                              let termAdjustment = 0;
                              
                              // Adjust residual based on actual term (shorter term = higher FMV)
                              if (actualTermMonths <= 12) {
                                termAdjustment = 10; // +10% for early cancellation
                              } else if (actualTermMonths <= 24) {
                                termAdjustment = 5; // +5% for mid-term cancellation
                              } else if (actualTermMonths >= 36) {
                                termAdjustment = -5; // -5% for longer term
                              }
                              
                              const adjustedResidual = baseResidual + termAdjustment;
                              const newFMV = parseFloat(String(item.purchase_cost)) * (adjustedResidual / 100);
                              
                              // Update equipment with new FMV and archive status
                              await supabase
                                .from('equipment_items')
                                .update({
                                  calculated_fmv: newFMV,
                                  fmv_calculation_date: new Date().toISOString(),
                                  status: 'archived',
                                  notes: `Archived on lease cancellation. Actual lease term: ${actualTermMonths} months. FMV recalculated from ${baseResidual}% to ${adjustedResidual}% = $${newFMV.toFixed(2)}`
                                })
                                .eq('id', item.id);
                            }
                          }
                          
                          // Update financing application status to cancelled
                          const { error: updateError } = await supabase
                            .from('financing_applications')
                            .update({
                              status: 'cancelled',
                              cancelled_date: new Date().toISOString(),
                              actual_term_months: actualTermMonths
                            })
                            .eq('id', loan.id);
                          
                          if (updateError) throw updateError;
                          
                          alert(`Lease cancelled successfully. ${equipment?.length || 0} equipment items archived with recalculated FMV based on ${actualTermMonths} month term.`);
                          loadActiveFinancing();
                          loadApplications();
                        } catch (error: any) {
                          alert('Error: ' + error.message);
                        }
                      }
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#ef4444',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel Lease
                  </button>
                </div>
              </div>
              );
            })}

            {activeFinancing.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                No active leases yet
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

      {/* Payment Processing Modal */}
      {showPaymentModal && selectedPayment && selectedApplication && (
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
            maxWidth: '500px',
            width: '90%',
            border: '1px solid #3a3a3a'
          }}>
            <h3 style={{ fontSize: '24px', marginBottom: '1.5rem' }}>
              <FaCreditCard style={{ display: 'inline', marginRight: '0.5rem', color: '#667eea' }} />
              Process Payment
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Customer</div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{selectedApplication.client_name}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Payment Amount</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#667eea' }}>
                  ${parseFloat(selectedPayment.payment_amount).toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>Payment Method</div>
                <div style={{ 
                  padding: '0.75rem', 
                  background: '#1a1a1a', 
                  borderRadius: '8px',
                  marginTop: '0.5rem'
                }}>
                  <FaUniversity style={{ display: 'inline', marginRight: '0.5rem', color: '#667eea' }} />
                  {selectedApplication.bank_account_type === 'checking' ? 'Checking' : 'Savings'} Account •••• {selectedApplication.bank_account_last4}
                </div>
              </div>

              <div style={{ 
                padding: '1rem', 
                background: '#1a1a1a', 
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Principal:</span>
                  <span>${parseFloat(selectedPayment.principal_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Interest:</span>
                  <span>${parseFloat(selectedPayment.interest_amount).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ 
                padding: '1rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#fca5a5'
              }}>
                <strong>⚠️ Confirm Payment Processing</strong>
                <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                  This will debit ${parseFloat(selectedPayment.payment_amount).toFixed(2)} from the customer's account
                  and send a receipt to {selectedApplication.client_email}.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => processPayment(selectedPayment.id, selectedApplication.id)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: processing ? '#3a3a3a' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.5 : 1
                }}
              >
                {processing ? 'Processing...' : 'Process Payment'}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#3a3a3a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#e5e5e5',
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 179 Tab */}
      {activeTab === 'section179' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem' 
          }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '0.5rem' }}>Section 179 Tax Deduction</h2>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                Attach equipment used for financing. Mark when it was first put in service and how much it's used for business. We'll suggest safe Section 179 allocations — review with your accountant before filing.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={() => {
                  console.log('Tax Year Settings button clicked');
                  setShowSection179SettingsModal(true);
                }}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#3a3a3a',
                  border: '1px solid #4a4a4a',
                  borderRadius: '8px',
                  color: '#e5e5e5',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ⚙️ Tax Year Settings
              </button>
              <button
                onClick={autoAssignCategories}
                disabled={processing}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#ec4899',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🏷️ Auto-Assign Categories
              </button>
              <button
                onClick={recalculateFMV}
                disabled={processing}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#f59e0b',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  opacity: processing ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🔄 Recalculate FMV
              </button>
              <button
                onClick={() => alert(
                  '💡 Fair Market Value (FMV) Explained\n\n' +
                  'FMV = The price equipment would sell for at lease end, considering age, condition, and depreciation.\n\n' +
                  '🏷️ Equipment Categories (Residual %):\n' +
                  'Different equipment types hold value differently:\n\n' +
                  '• SPEAKERS (25%): Hold value best\n' +
                  '  Pro-grade speakers (line arrays, subs, tops) depreciate slower due to build quality and demand in used market.\n\n' +
                  '• LIGHTING (20%): Moderate depreciation\n' +
                  '  LEDs and fixtures hold decent value but tech advances faster than speakers.\n\n' +
                  '• AUDIO GEAR (15%): Faster depreciation\n' +
                  '  Cables, mics, amps, racks, snakes depreciate faster - more wear & tear, less resale demand.\n\n' +
                  '• MIXERS/CONTROLLERS (15%): Tech obsolescence\n' +
                  '  Digital consoles and interfaces depreciate quickly as new models with better features release often.\n\n' +
                  '⏱️ Lease Term Bonus (Shorter = Higher FMV):\n' +
                  'Equipment is worth MORE after shorter leases because it\'s newer:\n\n' +
                  '• 12-month lease: +10% bonus (barely used)\n' +
                  '• 24-month lease: +5% bonus (moderately used)\n' +
                  '• 36+ month lease: +0% bonus (standard wear)\n\n' +
                  '📝 Examples:\n' +
                  '$10,000 speakers:\n' +
                  '  12mo: $10,000 × (25% + 10%) = $3,500 FMV\n' +
                  '  24mo: $10,000 × (25% + 5%) = $3,000 FMV\n' +
                  '  36mo: $10,000 × (25% + 0%) = $2,500 FMV\n\n' +
                  '$5,000 audio gear (cables/mics):\n' +
                  '  12mo: $5,000 × (15% + 10%) = $1,250 FMV\n' +
                  '  36mo: $5,000 × (15% + 0%) = $750 FMV\n\n' +
                  '🔒 Internal Use Only:\n' +
                  'FMV is for YOUR tax accounting when lease completes. Customer pays $0 to own the equipment. You record the FMV as a sale for tax purposes and write off the difference as a loss.'
                )}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#8b5cf6',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                💡 What is FMV?
              </button>
              <button
                onClick={() => {
                  console.log('Add Equipment button clicked');
                  setShowAddEquipmentForm(true);
                  setSelectedFinancingForEquipment(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                + Add Equipment
              </button>
            </div>
          </div>

          {/* Tax Year Selector and Summary */}
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #3a3a3a',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '14px' }}>
                  Tax Year
                </label>
                <select
                  value={selectedTaxYear}
                  onChange={(e) => setSelectedTaxYear(parseInt(e.target.value))}
                  style={{
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontSize: '16px',
                    fontWeight: 600,
                    width: '200px'
                  }}
                >
                  {[2023, 2024, 2025, 2026, 2027].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', flex: 2 }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '0.25rem' }}>Max Section 179 Deduction</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#4ade80' }}>
                    ${section179Settings?.max_section_179_deduction?.toLocaleString() || '1,220,000'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '0.25rem' }}>Equipment Phaseout Threshold</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#fbbf24' }}>
                    ${section179Settings?.phaseout_threshold?.toLocaleString() || '3,050,000'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '0.25rem' }}>Bonus Depreciation</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: section179Settings?.bonus_depreciation_allowed ? '#4ade80' : '#ef4444' }}>
                    {section179Settings?.bonus_depr_percentage || '60'}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '0.25rem' }}>Min Business Use</div>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#667eea' }}>
                    {section179Settings?.min_business_use_percent || '50'}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: '3rem' }}>Loading equipment...</p>
          ) : equipmentItems.filter(item => {
            const placedDate = new Date(item.placed_in_service_date);
            return placedDate.getFullYear() === selectedTaxYear;
          }).length === 0 ? (
            <div style={{ 
              background: '#2a2a2a', 
              border: '1px solid #3a3a3a', 
              borderRadius: '12px', 
              padding: '3rem', 
              textAlign: 'center' 
            }}>
              <FaCog style={{ fontSize: '48px', color: '#4a4a4a', marginBottom: '1rem' }} />
              <p style={{ color: '#9ca3af', fontSize: '18px' }}>No equipment placed in service for {selectedTaxYear}</p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Add equipment to track Section 179 deductions</p>
            </div>
          ) : (
            <>
              {/* Equipment List Table */}
              <div style={{
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '1.5rem'
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: '#1a1a1a', borderBottom: '2px solid #3a3a3a' }}>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Leasing Account</th>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Asset Tag</th>
                        <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Description</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Cost</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>In Service Date</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Business Use %</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Life (Yrs)</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>§179 Elected</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Bonus %</th>
                        <th style={{ textAlign: 'right', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>FMV</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Status</th>
                        <th style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipmentItems
                        .filter(item => {
                          const placedDate = new Date(item.placed_in_service_date);
                          return placedDate.getFullYear() === selectedTaxYear;
                        })
                        .map((item: any) => {
                          const eligibleCost = item.purchase_cost * (item.business_use_percent / 100);
                          const isEligible = item.business_use_percent >= (section179Settings?.min_business_use_percent || 50);
                          const section179Elected = item.section_179_elected_amount || 0;
                          const bonusPercent = item.bonus_depreciation_percentage || 0;
                          const fmv = item.calculated_fmv || null;
                          
                          // Find leasing account
                          const financing = activeFinancing.find((f: any) => f.id === item.financing_id);
                          
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                              <td style={{ padding: '1rem', color: '#a78bfa', fontSize: '13px' }}>
                                {financing ? (
                                  <div>
                                    <div style={{ fontWeight: 600 }}>{financing.client_name}</div>
                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '0.25rem' }}>
                                      ${financing.loan_amount?.toLocaleString()} / {financing.term_months}mo
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Unknown</span>
                                )}
                              </td>
                              <td style={{ padding: '1rem', color: '#667eea', fontWeight: 600 }}>
                                {item.asset_tag || item.id.substring(0, 8)}
                              </td>
                              <td style={{ padding: '1rem', color: '#e5e5e5' }}>
                                <div>{item.description}</div>
                                {item.serial_number && (
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>
                                    SN: {item.serial_number}
                                  </div>
                                )}
                                {item.equipment_category && (
                                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '0.25rem' }}>
                                    {item.equipment_category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', padding: '1rem', color: '#8b5cf6', fontWeight: 600 }}>
                                ${item.purchase_cost?.toLocaleString() || '0'}
                              </td>
                              <td style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af' }}>
                                {new Date(item.placed_in_service_date).toLocaleDateString()}
                              </td>
                              <td style={{ textAlign: 'center', padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '12px',
                                  background: isEligible ? '#10b98120' : '#ef444420',
                                  color: isEligible ? '#10b981' : '#ef4444',
                                  fontWeight: 600
                                }}>
                                  {item.business_use_percent}%
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', padding: '1rem', color: '#9ca3af' }}>
                                {item.depreciation_life_years || 5}
                              </td>
                              <td style={{ textAlign: 'right', padding: '1rem', color: section179Elected > 0 ? '#4ade80' : '#6b7280', fontWeight: 600 }}>
                                {section179Elected > 0 ? `$${section179Elected.toLocaleString()}` : '-'}
                              </td>
                              <td style={{ textAlign: 'right', padding: '1rem', color: bonusPercent > 0 ? '#fbbf24' : '#6b7280' }}>
                                {bonusPercent > 0 ? `${bonusPercent}%` : '-'}
                              </td>
                              <td style={{ textAlign: 'right', padding: '1rem', color: fmv ? '#ec4899' : '#6b7280', fontSize: '13px' }}>
                                {fmv ? `$${fmv.toLocaleString()}` : (
                                  <span style={{ fontSize: '11px', fontStyle: 'italic' }}>No category</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center', padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '12px',
                                  background: item.status === 'active' ? '#10b98120' : '#6b728020',
                                  color: item.status === 'active' ? '#10b981' : '#6b7280',
                                  fontSize: '12px',
                                  fontWeight: 600
                                }}>
                                  {item.status || 'active'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => {
                                      setEditingEquipment(item);
                                      setShowEditEquipmentModal(true);
                                    }}
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      background: '#667eea',
                                      border: 'none',
                                      borderRadius: '6px',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    onClick={() => calculateTaxableIncome(item)}
                                    disabled={!item.calculated_fmv}
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      background: item.calculated_fmv ? '#10b981' : '#3a3a3a',
                                      border: 'none',
                                      borderRadius: '6px',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: item.calculated_fmv ? 'pointer' : 'not-allowed',
                                      opacity: item.calculated_fmv ? 1 : 0.5
                                    }}
                                    title={item.calculated_fmv ? 'Calculate taxable income' : 'Set equipment category first'}
                                  >
                                    💰 Tax
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                    </tbody>
                  </table>
                </div>

                {/* Summary Footer */}
                <div style={{
                  background: '#1a1a1a',
                  borderTop: '2px solid #3a3a3a',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ fontWeight: 600, color: '#e5e5e5' }}>
                    Total ({equipmentItems.filter(item => new Date(item.placed_in_service_date).getFullYear() === selectedTaxYear).length} items for {selectedTaxYear})
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Equipment Cost: </span>
                      <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                        ${equipmentItems
                          .filter(item => new Date(item.placed_in_service_date).getFullYear() === selectedTaxYear)
                          .reduce((sum, item) => sum + (item.purchase_cost || 0), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Eligible Cost: </span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>
                        ${equipmentItems
                          .filter(item => {
                            const yearMatch = new Date(item.placed_in_service_date).getFullYear() === selectedTaxYear;
                            const eligible = item.business_use_percent >= (section179Settings?.min_business_use_percent || 50);
                            return yearMatch && eligible;
                          })
                          .reduce((sum, item) => sum + (item.purchase_cost * (item.business_use_percent / 100)), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Suggested §179: </span>
                      <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '16px' }}>
                        ${equipmentItems
                          .filter(item => {
                            const yearMatch = new Date(item.placed_in_service_date).getFullYear() === selectedTaxYear;
                            const eligible = item.business_use_percent >= (section179Settings?.min_business_use_percent || 50);
                            return yearMatch && eligible;
                          })
                          .reduce((sum, item) => sum + (item.purchase_cost * (item.business_use_percent / 100)), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <button
                  onClick={autoAllocateSection179}
                  disabled={processing}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: processing ? '#4b5563' : '#3a3a3a',
                    border: '1px solid #4a4a4a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontWeight: 600,
                    cursor: processing ? 'not-allowed' : 'pointer',
                    opacity: processing ? 0.7 : 1
                  }}
                >
                  {processing ? '⏳ Processing...' : '🧮 Auto-Allocate Section 179'}
                </button>
                <button
                  onClick={exportAccountantReport}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  📊 Export Accountant Report
                </button>
              </div>

              {/* Help Text */}
              <div style={{
                background: '#1e3a8a20',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '13px',
                color: '#93c5fd',
                lineHeight: '1.6'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#60a5fa' }}>💡 Section 179 Guidelines:</div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li><strong>Placed-in-Service Date:</strong> Only equipment placed in service during the selected tax year is eligible.</li>
                  <li><strong>Business Use:</strong> Equipment must be used ≥{section179Settings?.min_business_use_percent || 50}% for business purposes to qualify.</li>
                  <li><strong>Annual Limit:</strong> Maximum Section 179 deduction for {selectedTaxYear} is ${(section179Settings?.max_section_179_deduction || 1220000).toLocaleString()}.</li>
                  <li><strong>Bonus Depreciation:</strong> {section179Settings?.bonus_depr_percentage || 60}% bonus depreciation applies to remaining basis after Section 179.</li>
                  <li><strong>Consult Your CPA:</strong> These are suggestions only. Always review with your tax professional before filing.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {showActivationModal && activatingApplication && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1f1f1f',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #333'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #333'
            }}>
              <h2 style={{ margin: 0, color: '#e5e5e5', fontSize: '20px', fontWeight: 600 }}>
                Activate Financing
              </h2>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 1rem 0', color: '#e5e5e5' }}>
                  <strong>{activatingApplication.client_name}</strong>
                </p>
                <p style={{ margin: '0 0 0.5rem 0', color: '#9ca3af', fontSize: '14px' }}>
                  Lease Amount: <strong style={{ color: '#e5e5e5' }}>${parseFloat(activatingApplication.loan_amount).toLocaleString()}</strong>
                </p>
                <p style={{ margin: '0 0 0.5rem 0', color: '#9ca3af', fontSize: '14px' }}>
                  Monthly Payment: <strong style={{ color: '#e5e5e5' }}>${parseFloat(activatingApplication.monthly_payment).toLocaleString()}</strong>
                </p>
                <p style={{ margin: '0', color: '#9ca3af', fontSize: '14px' }}>
                  Term: <strong style={{ color: '#e5e5e5' }}>{activatingApplication.term_months} months</strong>
                </p>
              </div>

              <div style={{
                padding: '1rem',
                background: '#2a2a2a',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #3a3a3a'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  gap: '0.75rem'
                }}>
                  <input
                    type="checkbox"
                    checked={processFirstPayment}
                    onChange={(e) => setProcessFirstPayment(e.target.checked)}
                    style={{
                      marginTop: '0.25rem',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <div>
                    <div style={{ color: '#e5e5e5', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Process First Month's Payment Now
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                      Charge <strong style={{ color: '#10b981' }}>${parseFloat(activatingApplication.monthly_payment).toLocaleString()}</strong> immediately to the customer's payment method on file. This payment will be marked as paid and the next payment will be due in one month.
                    </div>
                  </div>
                </label>
              </div>

              {!processFirstPayment && (
                <div style={{
                  padding: '1rem',
                  background: '#854d0e',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  border: '1px solid #a16207',
                  fontSize: '14px',
                  color: '#fef3c7'
                }}>
                  <strong>Note:</strong> If you skip the first payment now, you'll need to manually collect it later. The payment will still be recorded as due on the scheduled date.
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowActivationModal(false);
                    setActivatingApplication(null);
                  }}
                  disabled={processing}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#3a3a3a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontWeight: 600,
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await updateApplicationStatus(activatingApplication.id, 'active', processFirstPayment);
                    setShowActivationModal(false);
                    setActivatingApplication(null);
                  }}
                  disabled={processing}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: processing ? '#4b5563' : '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {processing ? 'Processing...' : (processFirstPayment ? 'Activate & Charge' : 'Activate Financing')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddEquipmentForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1f1f1f',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #333'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #333'
            }}>
              <h2 style={{ margin: 0, color: '#e5e5e5', fontSize: '20px', fontWeight: 600 }}>
                Add Section 179 Equipment
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
                Track equipment for tax-advantaged Section 179 deduction
              </p>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Leasing Account Selector */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Leasing Account *
                </label>
                <select
                  value={newEquipment.financing_id}
                  onChange={(e) => {
                    setNewEquipment({...newEquipment, financing_id: e.target.value});
                    const financing = activeFinancing.find((f: any) => f.id === e.target.value);
                    setSelectedFinancingForEquipment(financing || null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                >
                  <option value="">Select active lease account...</option>
                  {activeFinancing.map((financing: any) => (
                    <option key={financing.id} value={financing.id}>
                      {financing.client_name} - {financing.business_name} (${parseFloat(financing.loan_amount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Inventory Item Selector */}
              <div style={{ background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: '8px', padding: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  📦 Select from Inventory (Optional)
                </label>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '1rem' }}>
                  Link this equipment to an existing inventory item. Fields will auto-fill. {availableInventory.length > 0 ? `${availableInventory.length} items available` : 'Loading...'}
                </p>

                {/* Search and Filters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '6px',
                      color: '#e5e5e5',
                      fontSize: '13px'
                    }}
                  />
                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => {
                      console.log('Category changed to:', e.target.value);
                      setInventoryCategoryFilter(e.target.value);
                      setInventorySubcategoryFilter('');
                    }}
                    style={{
                      padding: '0.5rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '6px',
                      color: '#e5e5e5',
                      fontSize: '13px'
                    }}
                  >
                    <option value="">All Categories</option>
                    {Array.from(new Set(availableInventory.map(i => i.category).filter(Boolean))).sort().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={inventorySubcategoryFilter}
                    onChange={(e) => {
                      console.log('Subcategory changed to:', e.target.value);
                      setInventorySubcategoryFilter(e.target.value);
                    }}
                    style={{
                      padding: '0.5rem',
                      background: '#1a1a1a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '6px',
                      color: '#e5e5e5',
                      fontSize: '13px'
                    }}
                    disabled={!inventoryCategoryFilter}
                  >
                    <option value="">All Subcategories</option>
                    {inventoryCategoryFilter && Array.from(new Set(
                      availableInventory
                        .filter(i => i.category === inventoryCategoryFilter)
                        .map(i => i.subcategory)
                        .filter(Boolean)
                    )).sort().map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Inventory Items List */}
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #3a3a3a', borderRadius: '6px', background: '#1a1a1a' }}>
                  {(() => {
                    const filtered = availableInventory.filter(item => {
                      if (inventorySearch && !item.name.toLowerCase().includes(inventorySearch.toLowerCase())) return false;
                      if (inventoryCategoryFilter && item.category !== inventoryCategoryFilter) return false;
                      if (inventorySubcategoryFilter && item.subcategory !== inventorySubcategoryFilter) return false;
                      return true;
                    });

                    if (availableInventory.length === 0) {
                      return (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                          Loading inventory items...
                        </div>
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                          No items found. Try different filters.
                        </div>
                      );
                    }

                    return filtered.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedInventoryItem(item);
                          setNewEquipment({
                            ...newEquipment,
                            description: item.name,
                            asset_tag: item.barcode || '',
                            purchase_cost: item.purchase_cost || item.unit_value || '',
                            serial_number: item.barcode || ''
                          });
                        }}
                        style={{
                          padding: '0.75rem',
                          borderBottom: '1px solid #3a3a3a',
                          cursor: 'pointer',
                          background: selectedInventoryItem?.id === item.id ? '#667eea20' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = selectedInventoryItem?.id === item.id ? '#667eea20' : '#3a3a3a'}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedInventoryItem?.id === item.id ? '#667eea20' : 'transparent'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <div style={{ color: '#e5e5e5', fontWeight: 500, fontSize: '14px' }}>{item.name}</div>
                            <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                              {item.category}{item.subcategory ? ` › ${item.subcategory}` : ''}
                              {item.barcode && ` • ${item.barcode}`}
                            </div>
                          </div>
                          {(item.purchase_cost || item.unit_value) && (
                            <div style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600 }}>
                              ${(item.purchase_cost || item.unit_value).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                
                {selectedInventoryItem && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#667eea20', border: '1px solid #667eea', borderRadius: '6px' }}>
                    <div style={{ color: '#93c5fd', fontSize: '13px', fontWeight: 600 }}>✓ Selected: {selectedInventoryItem.name}</div>
                    <button
                      onClick={() => {
                        setSelectedInventoryItem(null);
                        setNewEquipment({
                          ...newEquipment,
                          description: '',
                          asset_tag: '',
                          purchase_cost: '',
                          serial_number: ''
                        });
                      }}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        background: '#3a3a3a',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#e5e5e5',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>

              {/* Equipment Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Equipment Description *
                </label>
                <textarea
                  placeholder="e.g., Meyer Sound LEOPARD Line Array System"
                  value={newEquipment.description}
                  onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Asset Tag & SKU */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Asset Tag
                  </label>
                  <input
                    type="text"
                    placeholder="AT-2025-001"
                    value={newEquipment.asset_tag}
                    onChange={(e) => setNewEquipment({...newEquipment, asset_tag: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    SKU
                  </label>
                  <input
                    type="text"
                    placeholder="SKU-12345"
                    value={newEquipment.sku}
                    onChange={(e) => setNewEquipment({...newEquipment, sku: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>
              </div>

              {/* Purchase Cost & In-Service Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Purchase Cost *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newEquipment.purchase_cost}
                    onChange={(e) => setNewEquipment({...newEquipment, purchase_cost: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Placed in Service Date *
                  </label>
                  <input
                    type="date"
                    value={newEquipment.placed_in_service_date}
                    onChange={(e) => setNewEquipment({...newEquipment, placed_in_service_date: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>
              </div>

              {/* Equipment Category (for FMV calculation) */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Equipment Category
                </label>
                <select
                  value={newEquipment.equipment_category || ''}
                  onChange={(e) => setNewEquipment({...newEquipment, equipment_category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                >
                  <option value="">Select category (for FMV calculation)</option>
                  <option value="audio_gear">Audio Gear (15% residual)</option>
                  <option value="speakers">Speakers (25% residual)</option>
                  <option value="lighting">Lighting (20% residual)</option>
                  <option value="mixers_controllers">Mixers/Controllers (15% residual)</option>
                  <option value="other">Other (15% residual)</option>
                </select>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  Used to calculate Fair Market Value (FMV) at end of lease for internal tax purposes
                </p>
              </div>

              {/* Business Use % & Depreciation Life */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Business Use % *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="100"
                    value={newEquipment.business_use_percent}
                    onChange={(e) => setNewEquipment({...newEquipment, business_use_percent: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    Must be ≥50% for Section 179 eligibility
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Depreciation Life (Years) *
                  </label>
                  <select
                    value={newEquipment.depreciation_life_years}
                    onChange={(e) => setNewEquipment({...newEquipment, depreciation_life_years: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  >
                    <option value="3">3 Years</option>
                    <option value="5">5 Years (MACRS)</option>
                    <option value="7">7 Years</option>
                    <option value="10">10 Years</option>
                    <option value="15">15 Years</option>
                    <option value="20">20 Years</option>
                  </select>
                </div>
              </div>

              {/* Serial Number */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Serial Number
                </label>
                <input
                  type="text"
                  placeholder="SN123456789"
                  value={newEquipment.serial_number}
                  onChange={(e) => setNewEquipment({...newEquipment, serial_number: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Notes
                </label>
                <textarea
                  placeholder="Additional information about this equipment..."
                  value={newEquipment.notes}
                  onChange={(e) => setNewEquipment({...newEquipment, notes: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Info Note */}
              <div style={{ padding: '0.75rem', background: '#1e3a8a20', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#93c5fd' }}>💡 Section 179 Guidelines:</div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#93c5fd' }}>
                  <li>Equipment must be used ≥50% for business to qualify</li>
                  <li>Equipment $10,000+ requires insurance coverage</li>
                  <li>"Placed in Service" date determines tax year eligibility</li>
                  <li>Most audio/video equipment qualifies for 5-year MACRS depreciation</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setShowAddEquipmentForm(false);
                    setSelectedFinancingForEquipment(null);
                    setNewEquipment({
                      financing_id: '',
                      description: '',
                      asset_tag: '',
                      sku: '',
                      serial_number: '',
                      purchase_cost: '',
                      placed_in_service_date: new Date().toISOString().split('T')[0],
                      business_use_percent: '100',
                      depreciation_life_years: '5',
                      equipment_category: '',
                      notes: ''
                    });
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
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
                <button
                  onClick={createEquipment}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Equipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem' 
          }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '0.5rem' }}>📦 Archived Equipment</h2>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                Equipment from cancelled leases with recalculated Fair Market Value based on actual lease term
              </p>
            </div>
          </div>

          {/* Archived Equipment Table */}
          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            border: '1px solid #3a3a3a',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1a1a1a', borderBottom: '1px solid #3a3a3a' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Equipment</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Lease Account</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Purchase Cost</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Calculated FMV</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Actual Term</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Archived Date</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {equipmentItems
                  .filter(item => item.status === 'archived')
                  .map((item) => {
                    // Find the associated financing application
                    const financing = applications.find(app => app.id === item.financing_id);
                    
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #3a3a3a' }}>
                        <td style={{ padding: '1rem', color: '#e5e5e5' }}>
                          <div style={{ fontWeight: 600 }}>{item.description}</div>
                          {item.serial_number && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '0.25rem' }}>
                              SN: {item.serial_number}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: '#e5e5e5' }}>
                          {financing ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{financing.client_name}</div>
                              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{financing.business_name}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: '#e5e5e5' }}>
                          ${parseFloat(item.purchase_cost).toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ color: '#4ade80', fontWeight: 600 }}>
                            ${item.calculated_fmv ? parseFloat(item.calculated_fmv).toLocaleString() : 'N/A'}
                          </div>
                          {item.fmv_calculation_date && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '0.25rem' }}>
                              Calc: {new Date(item.fmv_calculation_date).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: '#e5e5e5' }}>
                          {financing?.actual_term_months ? (
                            <span>{financing.actual_term_months} months</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: '#9ca3af' }}>
                          {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', color: '#9ca3af', fontSize: '12px', maxWidth: '300px' }}>
                          {item.notes || 'No notes'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {equipmentItems.filter(item => item.status === 'archived').length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                No archived equipment yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Website Widget Tab */}
      {activeTab === 'website' && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '0.5rem' }}>🌐 Website Lease Application Widget</h2>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              Embed a lease-to-own application form on your website. Interest rate is locked at 6.5% for website submissions.
            </p>
          </div>

          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #3a3a3a',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1rem', color: '#667eea' }}>
              Embed Code
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '1rem' }}>
              Copy and paste this code before the closing <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: '4px' }}>&lt;/body&gt;</code> tag on your website:
            </p>
            
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #3a3a3a',
              borderRadius: '8px',
              padding: '1rem',
              position: 'relative',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#e5e5e5',
              overflowX: 'auto'
            }}>
              <code>{`<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/lease-application-widget"></script>`}</code>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/lease-application-widget"></script>`);
                  alert('✓ Embed code copied to clipboard!');
                }}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#667eea',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📋 Copy Code
              </button>
            </div>
          </div>

          <div style={{
            background: '#2a2a2a',
            borderRadius: '12px',
            padding: '2rem',
            border: '1px solid #3a3a3a',
            marginBottom: '2rem'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1rem', color: '#667eea' }}>
              Widget Features
            </h3>
            <ul style={{ color: '#e5e5e5', fontSize: '14px', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
              <li>✓ <strong>Locked Interest Rate:</strong> 6.5% rate is pre-set and cannot be changed by customers</li>
              <li>✓ <strong>Required Field Validation:</strong> Form cannot be submitted until all required fields are completed</li>
              <li>✓ <strong>Real-time Payment Calculator:</strong> Shows monthly payment breakdown as customer enters information</li>
              <li>✓ <strong>Automatic Lead Creation:</strong> Submissions create both lease applications and lead records</li>
              <li>✓ <strong>Mobile Responsive:</strong> Works perfectly on all devices</li>
              <li>✓ <strong>Secure:</strong> All data encrypted in transit and stored securely</li>
            </ul>
          </div>

          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #667eea'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '0.75rem', color: '#667eea' }}>
              ℹ️ Important Notes
            </h4>
            <ul style={{ color: '#9ca3af', fontSize: '13px', lineHeight: '1.6', paddingLeft: '1.5rem', margin: 0 }}>
              <li>The widget appears as a floating button in the bottom-right corner of your website</li>
              <li>Customer submissions appear in the "Applications" tab with status "pending"</li>
              <li>Sales tax rate defaults to 8.25% but customers can adjust if needed</li>
              <li>Interest rate is locked at 6.5% and cannot be changed by customers</li>
              <li>All required fields must be filled before submission is allowed</li>
            </ul>
          </div>
        </div>
      )}

      {/* Section 179 Settings Modal */}
      {showSection179SettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1f1f1f',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #333'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #333'
            }}>
              <h2 style={{ margin: 0, color: '#e5e5e5', fontSize: '20px', fontWeight: 600 }}>
                Section 179 Settings - {selectedTaxYear}
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
                Configure IRS limits and bonus depreciation for tax year {selectedTaxYear}
              </p>
            </div>

            {!section179Settings ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                Loading settings...
              </div>
            ) : (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Warning Banner */}
              <div style={{ 
                padding: '1rem', 
                background: '#78350f20', 
                border: '1px solid #f59e0b', 
                borderRadius: '8px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <strong style={{ color: '#fbbf24', fontSize: '14px' }}>Consult Your CPA</strong>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#fcd34d' }}>
                  IRS Section 179 limits change annually. Always verify current limits with your tax professional before making changes.
                </p>
              </div>

              {/* Max Section 179 Deduction */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Maximum Section 179 Deduction
                </label>
                <input
                  type="number"
                  placeholder="1220000"
                  value={section179Settings.max_section_179_deduction}
                  onChange={(e) => setSection179Settings({
                    ...section179Settings,
                    max_section_179_deduction: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                />
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  IRS 2025 limit: $1,220,000 (verify with IRS Publication 946)
                </p>
              </div>

              {/* Phaseout Threshold */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Phaseout Threshold
                </label>
                <input
                  type="number"
                  placeholder="3050000"
                  value={section179Settings.phaseout_threshold}
                  onChange={(e) => setSection179Settings({
                    ...section179Settings,
                    phaseout_threshold: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                />
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  Deduction begins to phase out when total equipment exceeds this amount
                </p>
              </div>

              {/* Bonus Depreciation */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={section179Settings.bonus_depreciation_allowed}
                    onChange={(e) => setSection179Settings({
                      ...section179Settings,
                      bonus_depreciation_allowed: e.target.checked
                    })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ color: '#e5e5e5', fontWeight: 500 }}>Allow Bonus Depreciation</span>
                </label>
              </div>

              {section179Settings.bonus_depreciation_allowed && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Bonus Depreciation Percentage
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="60"
                    value={section179Settings.bonus_depr_percentage}
                    onChange={(e) => setSection179Settings({
                      ...section179Settings,
                      bonus_depr_percentage: e.target.value
                    })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    2025: 60% | 2026: 40% | 2027: 20% (phases out through 2027)
                  </p>
                </div>
              )}

              {/* Minimum Business Use */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Minimum Business Use Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="50"
                  value={section179Settings.min_business_use_percent}
                  onChange={(e) => setSection179Settings({
                    ...section179Settings,
                    min_business_use_percent: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                />
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  IRS requires ≥50% business use for Section 179 eligibility
                </p>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Notes
                </label>
                <textarea
                  placeholder="Additional notes about this tax year's settings..."
                  value={section179Settings.notes || ''}
                  onChange={(e) => setSection179Settings({
                    ...section179Settings,
                    notes: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Info Box */}
              <div style={{ padding: '0.75rem', background: '#1e3a8a20', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#93c5fd' }}>📚 IRS Resources:</div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#93c5fd', lineHeight: 1.6 }}>
                  <li>IRS Publication 946 (How to Depreciate Property)</li>
                  <li>Form 4562 (Depreciation and Amortization)</li>
                  <li>Section 179 applies to equipment purchased & in service during the tax year</li>
                  <li>Bonus depreciation applies to remaining basis after Section 179</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setShowSection179SettingsModal(false);
                    loadSection179Settings(); // Reload to discard changes
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
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
                <button
                  onClick={updateSection179Settings}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {showEditEquipmentModal && editingEquipment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1f1f1f',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #333'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #333'
            }}>
              <h2 style={{ margin: 0, color: '#e5e5e5', fontSize: '20px', fontWeight: 600 }}>
                Edit Equipment
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
                Update equipment details and Section 179 deduction amounts
              </p>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Equipment Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Equipment Description *
                </label>
                <textarea
                  value={editingEquipment.description}
                  onChange={(e) => setEditingEquipment({...editingEquipment, description: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Asset Tag & SKU */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Asset Tag
                  </label>
                  <input
                    type="text"
                    value={editingEquipment.asset_tag || ''}
                    onChange={(e) => setEditingEquipment({...editingEquipment, asset_tag: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    SKU
                  </label>
                  <input
                    type="text"
                    value={editingEquipment.sku || ''}
                    onChange={(e) => setEditingEquipment({...editingEquipment, sku: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>
              </div>

              {/* Purchase Cost & In-Service Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Purchase Cost *
                  </label>
                  <input
                    type="number"
                    value={editingEquipment.purchase_cost}
                    onChange={(e) => setEditingEquipment({...editingEquipment, purchase_cost: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Placed in Service Date *
                  </label>
                  <input
                    type="date"
                    value={editingEquipment.placed_in_service_date}
                    onChange={(e) => setEditingEquipment({...editingEquipment, placed_in_service_date: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                </div>
              </div>

              {/* Equipment Category */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Equipment Category
                </label>
                <select
                  value={editingEquipment.equipment_category || ''}
                  onChange={(e) => setEditingEquipment({...editingEquipment, equipment_category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                >
                  <option value="">Select category (for FMV calculation)</option>
                  <option value="audio_gear">Audio Gear (15% residual)</option>
                  <option value="speakers">Speakers (25% residual)</option>
                  <option value="lighting">Lighting (20% residual)</option>
                  <option value="mixers_controllers">Mixers/Controllers (15% residual)</option>
                  <option value="other">Other (15% residual)</option>
                </select>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  Used to calculate Fair Market Value (FMV) at end of lease
                </p>
              </div>

              {/* Business Use % & Depreciation Life */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Business Use % *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingEquipment.business_use_percent}
                    onChange={(e) => setEditingEquipment({...editingEquipment, business_use_percent: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    Must be ≥50% for Section 179 eligibility
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Depreciation Life (Years) *
                  </label>
                  <select
                    value={editingEquipment.depreciation_life_years}
                    onChange={(e) => setEditingEquipment({...editingEquipment, depreciation_life_years: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  >
                    <option value="3">3 Years</option>
                    <option value="5">5 Years (MACRS)</option>
                    <option value="7">7 Years</option>
                    <option value="10">10 Years</option>
                    <option value="15">15 Years</option>
                    <option value="20">20 Years</option>
                  </select>
                </div>
              </div>

              {/* Section 179 & Bonus Depreciation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Section 179 Elected Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingEquipment.section_179_elected_amount || '0'}
                    onChange={(e) => setEditingEquipment({...editingEquipment, section_179_elected_amount: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    Amount to deduct under Section 179
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                    Bonus Depreciation %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingEquipment.bonus_depreciation_percentage || '0'}
                    onChange={(e) => setEditingEquipment({...editingEquipment, bonus_depreciation_percentage: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '8px',
                      color: '#e5e5e5'
                    }}
                  />
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                    Applied to remaining basis after §179
                  </p>
                </div>
              </div>

              {/* Serial Number */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Serial Number
                </label>
                <input
                  type="text"
                  value={editingEquipment.serial_number || ''}
                  onChange={(e) => setEditingEquipment({...editingEquipment, serial_number: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5'
                  }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e5e5e5', fontWeight: 500 }}>
                  Notes
                </label>
                <textarea
                  value={editingEquipment.notes || ''}
                  onChange={(e) => setEditingEquipment({...editingEquipment, notes: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#2a2a2a',
                    border: '1px solid #3a3a3a',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setShowEditEquipmentModal(false);
                    setEditingEquipment(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
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
                <button
                  onClick={updateEquipment}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Taxable Income Calculator Modal */}
      {showTaxableIncomeModal && taxableIncomeResult && selectedEquipmentForTaxCalc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#1f1f1f',
            borderRadius: '16px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid #10b981'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '2px solid #10b981',
              background: 'linear-gradient(135deg, #10b98120 0%, #059669 20 100%)'
            }}>
              <h2 style={{ margin: 0, color: '#10b981', fontSize: '24px', fontWeight: 700 }}>
                💰 Taxable Income Calculator
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
                Lease completion tax calculation for {selectedEquipmentForTaxCalc.description}
              </p>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Equipment Info */}
              <div style={{
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#e5e5e5', fontSize: '16px', fontWeight: 600 }}>
                  Equipment Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: '#9ca3af' }}>Asset Tag:</span>
                    <div style={{ color: '#e5e5e5', fontWeight: 600 }}>
                      {selectedEquipmentForTaxCalc.asset_tag || selectedEquipmentForTaxCalc.id.substring(0, 8)}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af' }}>Equipment Category:</span>
                    <div style={{ color: '#e5e5e5', fontWeight: 600 }}>
                      {selectedEquipmentForTaxCalc.equipment_category?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af' }}>Serial Number:</span>
                    <div style={{ color: '#e5e5e5', fontWeight: 600 }}>
                      {selectedEquipmentForTaxCalc.serial_number || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#9ca3af' }}>In Service Date:</span>
                    <div style={{ color: '#e5e5e5', fontWeight: 600 }}>
                      {new Date(selectedEquipmentForTaxCalc.placed_in_service_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Calculation Breakdown */}
              <div style={{
                background: '#1e3a8a20',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#60a5fa', fontSize: '18px', fontWeight: 700 }}>
                  📊 Tax Calculation Breakdown
                </h3>

                {/* Step 1: Purchase Cost & Deductions */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#93c5fd', marginBottom: '0.75rem' }}>
                    Step 1: Calculate Adjusted Basis
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '14px', paddingLeft: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Purchase Cost:</span>
                      <span style={{ color: '#e5e5e5', fontWeight: 600 }}>${taxableIncomeResult.purchaseCost.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>- Section 179 Deduction:</span>
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>-${taxableIncomeResult.section179.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>- Bonus Depreciation:</span>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>-${taxableIncomeResult.bonusDepreciation.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #3a3a3a',
                      marginTop: '0.25rem'
                    }}>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>= Adjusted Basis:</span>
                      <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '16px' }}>
                        ${taxableIncomeResult.adjustedBasis.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2: Lease Income */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#93c5fd', marginBottom: '0.75rem' }}>
                    Step 2: Total Income Received
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '14px', paddingLeft: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Total Lease Payments:</span>
                      <span style={{ color: '#e5e5e5', fontWeight: 600 }}>${taxableIncomeResult.totalLeasePayments.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>+ Fair Market Value (FMV):</span>
                      <span style={{ color: '#ec4899', fontWeight: 600 }}>+${taxableIncomeResult.fmv.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #3a3a3a',
                      marginTop: '0.25rem'
                    }}>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>= Total Amount Realized:</span>
                      <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '16px' }}>
                        ${(taxableIncomeResult.totalLeasePayments + taxableIncomeResult.fmv).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3: Final Taxable Income */}
                <div style={{
                  background: '#10b98120',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#4ade80', marginBottom: '0.75rem' }}>
                    Step 3: Calculate Taxable Income
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Total Amount Realized:</span>
                      <span style={{ color: '#e5e5e5', fontWeight: 600 }}>
                        ${(taxableIncomeResult.totalLeasePayments + taxableIncomeResult.fmv).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>- Adjusted Basis:</span>
                      <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                        -${taxableIncomeResult.adjustedBasis.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '2px solid #10b981',
                      marginTop: '0.5rem'
                    }}>
                      <span style={{ color: '#10b981', fontWeight: 700, fontSize: '16px' }}>= TAXABLE INCOME:</span>
                      <span style={{ color: '#10b981', fontWeight: 900, fontSize: '24px' }}>
                        ${taxableIncomeResult.taxableIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula Reference */}
              <div style={{
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '13px'
              }}>
                <div style={{ color: '#9ca3af', marginBottom: '0.5rem', fontWeight: 600 }}>📐 Formula:</div>
                <code style={{ color: '#4ade80', fontFamily: 'monospace', display: 'block', marginBottom: '0.5rem' }}>
                  TaxableIncome = TotalLeasePayments + FMV - AdjustedBasis
                </code>
                <code style={{ color: '#60a5fa', fontFamily: 'monospace', display: 'block' }}>
                  AdjustedBasis = PurchaseCost - Section179 - BonusDepreciation
                </code>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowTaxableIncomeModal(false);
                    setSelectedEquipmentForTaxCalc(null);
                    setTaxableIncomeResult(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#3a3a3a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#e5e5e5',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                {selectedEquipmentForTaxCalc.status === 'active' && (
                  <button
                    onClick={() => completeLeaseTransfer(selectedEquipmentForTaxCalc.id)}
                    disabled={processing}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: processing ? '#4b5563' : '#10b981',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontWeight: 600,
                      cursor: processing ? 'not-allowed' : 'pointer',
                      opacity: processing ? 0.7 : 1
                    }}
                  >
                    {processing ? '⏳ Processing...' : '✅ Complete Lease Transfer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
