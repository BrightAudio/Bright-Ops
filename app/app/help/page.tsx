'use client';

import { useRouter } from 'next/navigation';

export default function HelpPage() {
  const router = useRouter();

  const faqs = [
    {
      category: 'Pull Sheets',
      items: [
        {
          question: 'How do I create a pull sheet?',
          answer: 'Go to Jobs, select a job, click the "CreatePullSheet" button, and fill in the required information. You can also create pull sheets directly from the Pull Sheets page.'
        },
        {
          question: 'How do I edit a pull sheet?',
          answer: 'Click on a pull sheet to open it. You can then click on individual cells to edit them, use the substitute menu to swap items, or add new items using the "Add Items" button.'
        },
        {
          question: 'What is the substitute feature?',
          answer: 'The substitute feature allows you to swap items in a pull sheet. Click the substitute icon on an item row to open the substitute menu and select an alternative item.'
        },
        {
          question: 'How do I view scan history?',
          answer: 'In the pull sheet, click the history icon to view recently scanned items and manage your scan history.'
        }
      ]
    },
    {
      category: 'Jobs',
      items: [
        {
          question: 'How do I create a job?',
          answer: 'Navigate to the Jobs page and click the "New Job" button. Fill in the job details including name, dates, and equipment needs.'
        },
        {
          question: 'What are the job buttons?',
          answer: 'Each job has several action buttons: Invoice (to generate invoices), CreatePullSheet (to create a pull sheet for that job), Returns (to manage returned items), Transport (to arrange transportation), and Archive (to archive the job).'
        },
        {
          question: 'How do I archive a job?',
          answer: 'Click the "Archive" button on the job details page. Archived jobs are kept for record-keeping but won\'t appear in your active jobs list.'
        }
      ]
    },
    {
      category: 'Inventory',
      items: [
        {
          question: 'How do I manage inventory?',
          answer: 'Go to the Inventory section to view all your equipment. You can search, filter, and see stock levels for each item.'
        },
        {
          question: 'How do I add new items to inventory?',
          answer: 'In the Inventory section, click "Add Item" and fill in the item details including name, category, quantity, and unit value.'
        },
        {
          question: 'What does the barcode system do?',
          answer: 'Barcodes allow you to quickly scan items in and out. You can generate and print barcodes for your inventory items.'
        }
      ]
    },
    {
      category: 'General',
      items: [
        {
          question: 'How do I access my profile?',
          answer: 'Click your profile picture or name in the top right corner to access your profile settings where you can update your company information.'
        },
        {
          question: 'What are notifications for?',
          answer: 'Notifications keep you updated on important events like new pull sheet assignments, inventory alerts, and job updates. Click the bell icon to view all notifications.'
        },
        {
          question: 'How do I search for items?',
          answer: 'Use the search bar at the top of the page. It searches across jobs, pull sheets, and inventory items. Press Enter to search or click on a result to navigate.'
        },
        {
          question: 'How do I print a pull sheet?',
          answer: 'Open a pull sheet and click the "Print" button in the top right. This will format the pull sheet for printing with all necessary details.'
        }
      ]
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1b1e',
      color: '#ffffff',
      padding: '2rem 1rem'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#137CFB',
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: '1rem',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
            Help & FAQ
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '1.1rem' }}>
            Find answers to common questions about Bright Audio
          </p>
        </div>

        {/* FAQ Sections */}
        <div style={{ display: 'grid', gap: '3rem' }}>
          {faqs.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h2 style={{
                fontSize: '1.75rem',
                marginBottom: '1.5rem',
                fontWeight: 600,
                color: '#137CFB'
              }}>
                {section.category}
              </h2>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      transition: 'background 0.2s'
                    }}
                  >
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      marginBottom: '0.75rem',
                      color: '#ffffff'
                    }}>
                      {item.question}
                    </h3>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: '1.6',
                      margin: 0
                    }}>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support Section */}
        <div style={{
          marginTop: '4rem',
          padding: '2rem',
          backgroundColor: 'rgba(19, 124, 251, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(19, 124, 251, 0.2)',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Still have questions?</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '1rem' }}>
            Can't find what you're looking for?
          </p>
          <a
            href="mailto:support@brightaudio.com"
            style={{
              display: 'inline-block',
              backgroundColor: '#137CFB',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0f5ed4'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#137CFB'}
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
