'use client';

import { useState } from 'react';
import { FaUpload, FaGlobe, FaFileImport, FaTimes, FaCheckCircle, FaSearch } from 'react-icons/fa';
import Papa from 'papaparse';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

type ScrapedLead = {
  name: string;
  email: string;
  org: string | null;
  title: string | null;
  phone: string | null;
  venue: string | null;
  snippet: string | null;
  status: string;
  source: string;
};

type LeadScraperModalProps = {
  onClose: () => void;
  onImportComplete: () => void;
};

export default function LeadScraperModal({ onClose, onImportComplete }: LeadScraperModalProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'csv' | 'url'>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvLeads, setCsvLeads] = useState<ScrapedLead[]>([]);
  
  // URL scraping state
  const [url, setUrl] = useState('');
  const [scrapedLeads, setScrapedLeads] = useState<ScrapedLead[]>([]);

  // Auto-search state
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [radius, setRadius] = useState(25);
  const [autoSearchLeads, setAutoSearchLeads] = useState<ScrapedLead[]>([]);

  // Handle CSV file upload
  function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    setError(null);

    // Parse CSV
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvPreview(results.data.slice(0, 5)); // Show first 5 rows
        
        const leads: ScrapedLead[] = results.data
          .filter((row: any) => row.name && row.email)
          .map((row: any) => ({
            name: row.name || row.Name || row.full_name || '',
            email: row.email || row.Email || row.email_address || '',
            org: row.org || row.organization || row.company || row.Company || null,
            title: row.title || row.Title || row.position || row.job_title || null,
            phone: row.phone || row.Phone || null,
            venue: row.venue || row.Venue || null,
            snippet: row.snippet || row.notes || row.description || null,
            status: 'uncontacted',
            source: 'csv_import',
          }));

        setCsvLeads(leads);
        setSuccess(`Parsed ${leads.length} leads from CSV`);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }

  // Handle URL scraping
  async function handleScrapeUrl() {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/leads/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method: 'basic' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape URL');
      }

      setScrapedLeads(data.leads || []);
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Auto-Search (searches job titles from database)
  async function handleAutoSearch() {
    if (!city || !state) {
      setError('Please enter a city and state');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/leads/auto-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, radius }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for leads');
      }

      setAutoSearchLeads(data.leads || []);
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Import leads to database
  async function handleImport() {
    const leadsToImport = 
      activeTab === 'csv' ? csvLeads : 
      (activeTab === 'url' ? scrapedLeads : autoSearchLeads);

    if (leadsToImport.length === 0) {
      setError('No leads to import');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leads/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToImport }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import leads');
      }

      setSuccess(data.message);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const leadsToShow = 
    activeTab === 'csv' ? csvLeads : 
    (activeTab === 'url' ? scrapedLeads : autoSearchLeads);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#333333]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#333333]">
          <h2 className="text-2xl font-bold text-[#e5e5e5]">Import Leads</h2>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#e5e5e5] transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#333333]">
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'auto'
                ? 'bg-[#2a2a2a] text-purple-400 border-b-2 border-purple-500'
                : 'text-[#9ca3af] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]/50'
            }`}
          >
            <FaSearch />
            Auto Search
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'csv'
                ? 'bg-[#2a2a2a] text-purple-400 border-b-2 border-purple-500'
                : 'text-[#9ca3af] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]/50'
            }`}
          >
            <FaUpload />
            CSV Upload
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'url'
                ? 'bg-[#2a2a2a] text-purple-400 border-b-2 border-purple-500'
                : 'text-[#9ca3af] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]/50'
            }`}
          >
            <FaGlobe />
            Web Scraping
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-4 bg-green-900/20 border border-green-600 rounded-lg flex items-center gap-3 text-green-400">
              <FaCheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* CSV Upload Tab */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="text-[#9ca3af] text-sm mb-4">
                <p className="mb-2">Upload a CSV file with lead information. Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong className="text-[#e5e5e5]">name</strong> or <strong className="text-[#e5e5e5]">Name</strong> (required)</li>
                  <li><strong className="text-[#e5e5e5]">email</strong> or <strong className="text-[#e5e5e5]">Email</strong> (required)</li>
                  <li>org, organization, company (optional)</li>
                  <li>title, position, job_title (optional)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-[#333333] rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <FaFileImport size={48} className="text-purple-500" />
                  <span className="text-[#e5e5e5] font-medium">
                    {csvFile ? csvFile.name : 'Click to upload CSV file'}
                  </span>
                  <span className="text-[#9ca3af] text-sm">
                    or drag and drop
                  </span>
                </label>
              </div>

              {csvPreview.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[#e5e5e5] font-semibold mb-2">Preview (first 5 rows):</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#333333]">
                          {Object.keys(csvPreview[0]).map((key) => (
                            <th key={key} className="px-4 py-2 text-left text-[#9ca3af]">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-b border-[#333333]/50">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="px-4 py-2 text-[#e5e5e5]">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL Scraping Tab */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="text-[#9ca3af] text-sm mb-4">
                <p>Enter a website URL to extract email addresses and contact information.</p>
                <p className="mt-2 text-xs">Note: Web scraping works best on contact/about pages with visible email addresses.</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/contact"
                  className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                />
                <button
                  onClick={handleScrapeUrl}
                  disabled={loading || !url}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg whitespace-nowrap"
                >
                  <FaGlobe />
                  {loading ? 'Scraping...' : 'Scrape URL'}
                </button>
              </div>

              {scrapedLeads.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[#e5e5e5] font-semibold mb-2">
                    Found {scrapedLeads.length} leads:
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {scrapedLeads.map((lead, i) => (
                      <div key={i} className="p-3 bg-[#2a2a2a] rounded border border-[#333333]">
                        <div className="text-[#e5e5e5] font-medium">{lead.name}</div>
                        <div className="text-sm text-purple-400">{lead.email}</div>
                        {lead.org && <div className="text-xs text-[#9ca3af]">{lead.org}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto-Search Tab */}
          {activeTab === 'auto' && (
            <div className="space-y-4">
              <div className="text-[#9ca3af] text-sm mb-4">
                <p>Automatically search for event coordinators, venue managers, and other professionals in your area.</p>
              </div>

              {/* City Input */}
              <div>
                <label className="block text-[#e5e5e5] font-medium mb-2">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Los Angeles"
                  className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                />
              </div>

              {/* State Dropdown */}
              <div>
                <label className="block text-[#e5e5e5] font-medium mb-2">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                >
                  <option value="">Select a state...</option>
                  {US_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Radius Slider */}
              <div>
                <label className="block text-[#e5e5e5] font-medium mb-2">
                  Search Radius: <span className="text-purple-400">{radius} miles</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-[#9ca3af] mt-1">
                  <span>5 mi</span>
                  <span>100 mi</span>
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleAutoSearch}
                disabled={loading || !city || !state}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg font-medium"
              >
                <FaSearch />
                {loading ? 'Searching...' : 'Search for Leads'}
              </button>

              {/* Results */}
              {autoSearchLeads.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#333333]">
                  <h3 className="text-[#e5e5e5] font-semibold mb-3">
                    Found {autoSearchLeads.length} leads:
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {autoSearchLeads.map((lead, i) => (
                      <div key={i} className="p-4 bg-[#2a2a2a] rounded border border-[#333333]">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-[#e5e5e5] font-semibold">{lead.name || 'Unknown'}</div>
                            {lead.title && <div className="text-sm text-purple-400">{lead.title}</div>}
                            <div className="text-sm text-purple-400 mt-1">{lead.email}</div>
                            {lead.phone && <div className="text-sm text-[#9ca3af]">{lead.phone}</div>}
                            {lead.org && <div className="text-sm text-[#e5e5e5] mt-1"><strong>Org:</strong> {lead.org}</div>}
                            {lead.venue && <div className="text-sm text-[#9ca3af]"><strong>Venue:</strong> {lead.venue}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#333333] p-6 bg-[#1a1a1a] flex justify-between items-center">
          <div className="text-[#9ca3af] text-sm">
            {leadsToShow.length > 0 && `${leadsToShow.length} leads ready to import`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#2a2a2a] text-[#e5e5e5] rounded-lg hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || leadsToShow.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg"
            >
              <FaFileImport />
              {loading ? 'Importing...' : `Import ${leadsToShow.length} Leads`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
