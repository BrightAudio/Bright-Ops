'use client';

import { useState } from 'react';
import { FaUpload, FaGlobe, FaFileImport, FaTimes, FaCheckCircle } from 'react-icons/fa';
import Papa from 'papaparse';

type ScrapedLead = {
  name: string;
  email: string;
  org: string | null;
  title: string | null;
  snippet: string | null;
  status: string;
  source: string;
};

type LeadScraperModalProps = {
  onClose: () => void;
  onImportComplete: () => void;
};

export default function LeadScraperModal({ onClose, onImportComplete }: LeadScraperModalProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'url' | 'google'>('csv');
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

  // Google search state
  const [searchQuery, setSearchQuery] = useState('');
  const [googleLeads, setGoogleLeads] = useState<ScrapedLead[]>([]);

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
        
        // Convert to lead format
        const leads: ScrapedLead[] = results.data
          .filter((row: any) => row.name && row.email)
          .map((row: any) => ({
            name: row.name || row.Name || row.full_name || '',
            email: row.email || row.Email || row.email_address || '',
            org: row.org || row.organization || row.company || row.Company || null,
            title: row.title || row.Title || row.position || row.job_title || null,
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

  // Handle Google Search
  async function handleGoogleSearch() {
    if (!searchQuery) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/leads/search-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, maxResults: 10 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search Google');
      }

      setGoogleLeads(data.leads || []);
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Import leads to database
  async function handleImport() {
    const leadsToImport = activeTab === 'csv' ? csvLeads : (activeTab === 'url' ? scrapedLeads : googleLeads);

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

  const leadsToShow = activeTab === 'csv' ? csvLeads : (activeTab === 'url' ? scrapedLeads : googleLeads);

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
          <button
            onClick={() => setActiveTab('google')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'google'
                ? 'bg-[#2a2a2a] text-purple-400 border-b-2 border-purple-500'
                : 'text-[#9ca3af] hover:text-[#e5e5e5] hover:bg-[#2a2a2a]/50'
            }`}
          >
            <FaGlobe />
            Google Search
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

          {/* Google Search Tab */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="text-[#9ca3af] text-sm mb-4">
                <p>Search for event coordinators, venue managers, and other event professionals.</p>
                <p className="mt-2 text-xs">Example: "event coordinators in Los Angeles" or "AV managers music venues Seattle"</p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="event coordinators in Los Angeles"
                  className="flex-1 px-4 py-3 bg-[#2a2a2a] border border-[#333333] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[#e5e5e5]"
                  onKeyDown={(e) => e.key === 'Enter' && handleGoogleSearch()}
                />
                <button
                  onClick={handleGoogleSearch}
                  disabled={loading || !searchQuery}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg whitespace-nowrap"
                >
                  <FaGlobe />
                  {loading ? 'Searching...' : 'Search Google'}
                </button>
              </div>

              {googleLeads.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[#e5e5e5] font-semibold mb-2">
                    Found {googleLeads.length} leads with contact info:
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {googleLeads.map((lead, i) => (
                      <div key={i} className="p-3 bg-[#2a2a2a] rounded border border-[#333333]">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-[#e5e5e5] font-medium">{lead.name || 'Unknown'}</div>
                            <div className="text-sm text-purple-400">{lead.email}</div>
                            {lead.org && <div className="text-sm text-[#e5e5e5] mt-1">{lead.org}</div>}
                            {lead.title && <div className="text-xs text-[#9ca3af]">{lead.title}</div>}
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
