'use client';

import { FaEnvelope, FaPlus, FaPaperPlane, FaChartLine } from 'react-icons/fa';

export default function EmailCampaignsPage() {
  return (
    <div className="p-6" style={{ 
      minHeight: '100vh',
      background: '#1a1a1a',
      color: '#e5e5e5'
    }}>
      <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#f3f4f6' }}>Email Campaigns</h1>
            <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>Manage and track your email outreach campaigns</p>
          </div>
          <button
            className="px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            <FaPlus />
            New Campaign
          </button>
        </div>

        {/* Coming Soon Message */}
        <div className="rounded-lg shadow-sm p-12 text-center" style={{ 
          background: '#2a2a2a',
          border: '1px solid #333333'
        }}>
          <div className="inline-block p-4 rounded-full mb-4" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
            <FaEnvelope size={48} style={{ color: '#667eea' }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#f3f4f6' }}>Email Campaigns Coming Soon</h2>
          <p className="mb-6 max-w-md mx-auto" style={{ color: '#9ca3af' }}>
            Create, schedule, and track email campaigns to engage with your leads at scale.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-8">
            <div className="p-6 rounded-lg" style={{ background: '#333333' }}>
              <FaPaperPlane size={32} className="mb-3 mx-auto" style={{ color: '#667eea' }} />
              <h3 className="font-semibold mb-2" style={{ color: '#f3f4f6' }}>Bulk Sending</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Send personalized emails to multiple leads at once</p>
            </div>
            
            <div className="p-6 rounded-lg" style={{ background: '#333333' }}>
              <FaChartLine size={32} className="mb-3 mx-auto" style={{ color: '#667eea' }} />
              <h3 className="font-semibold mb-2" style={{ color: '#f3f4f6' }}>Analytics</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Track open rates, clicks, and responses</p>
            </div>
            
            <div className="p-6 rounded-lg" style={{ background: '#333333' }}>
              <FaEnvelope size={32} className="mb-3 mx-auto" style={{ color: '#667eea' }} />
              <h3 className="font-semibold mb-2" style={{ color: '#f3f4f6' }}>Templates</h3>
              <p className="text-sm" style={{ color: '#9ca3af' }}>Save and reuse your best-performing emails</p>
            </div>
          </div>
        </div>
      </div>
  );
}
