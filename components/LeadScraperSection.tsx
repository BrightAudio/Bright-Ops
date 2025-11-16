'use client';

import { useState } from 'react';
import { FaSearch, FaChevronLeft, FaChevronRight, FaCheckCircle } from 'react-icons/fa';

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

type LeadScraperSectionProps = {
  onImportComplete: () => void;
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const MAJOR_US_CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
  'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
  'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville',
  'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville',
  'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento',
  'Kansas City', 'Mesa', 'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh',
  'Miami', 'Long Beach', 'Virginia Beach', 'Oakland', 'Minneapolis', 'Tampa',
  'Tulsa', 'Arlington', 'New Orleans', 'Wichita'
];

const modalScrollbarStyles = `
  .lead-scraper-results::-webkit-scrollbar {
    width: 8px;
  }
  .lead-scraper-results::-webkit-scrollbar-track {
    background: #2a2a2a;
    border-radius: 4px;
  }
  .lead-scraper-results::-webkit-scrollbar-thumb {
    background: #9333ea;
    border-radius: 4px;
  }
  .lead-scraper-results::-webkit-scrollbar-thumb:hover {
    background: #a855f7;
  }
`;

export default function LeadScraperSection({ onImportComplete }: LeadScraperSectionProps) {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [radius, setRadius] = useState(25);
  const [searchMethod, setSearchMethod] = useState<'google' | 'chatgpt' | 'mock' | 'smart'>('smart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ScrapedLead[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());

  const resultsPerPage = 10;
  const totalPages = Math.ceil(searchResults.length / resultsPerPage);
  const paginatedResults = searchResults.slice(
    currentPage * resultsPerPage,
    (currentPage + 1) * resultsPerPage
  );

  async function handleAutoSearch() {
    if (!city || !state) {
      setError('Please enter a city and state');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setCurrentPage(0);
    setSelectedForImport(new Set());

    try {
      const endpoint = searchMethod === 'chatgpt' 
        ? '/api/leads/chatgpt-search'
        : searchMethod === 'mock'
        ? '/api/leads/mock-search'
        : searchMethod === 'smart'
        ? '/api/leads/smart-discovery'
        : '/api/leads/auto-search';

      console.log(`🔍 Sending ${searchMethod} search request:`, { city, state, radius });      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, radius, searchType: 'all' }),
      });

      const data = await response.json();
      console.log('📨 API Response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search for leads');
      }

      setSearchResults(data.leads || []);
      setSuccess(`Found ${data.leads?.length || 0} leads in ${city}, ${state}`);
    } catch (err: any) {
      console.error('❌ Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (selectedForImport.size === 0) {
      setError('Please select at least one lead to import');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const leadsToImport = searchResults.filter((_, index) =>
        selectedForImport.has(index)
      );

      console.log('📤 Sending', leadsToImport.length, 'leads to import API...');

      const response = await fetch('/api/leads/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsToImport }),
      });

      const data = await response.json();

      console.log('📨 Import response:', data);

      // Even if response.ok is false, check if data indicates success
      if (data.success || response.ok) {
        setSuccess(`✅ ${selectedForImport.size} leads imported successfully!`);
        
        // Show warning if Supabase not configured
        if (data.warning === 'SUPABASE_NOT_CONFIGURED') {
          setError('⚠️ Leads validated but Supabase not configured. Check console for next steps.');
        }
        
        setTimeout(() => {
          setSearchResults([]);
          setCurrentPage(0);
          setSelectedForImport(new Set());
          onImportComplete();
        }, 3000);
      } else {
        throw new Error(data.error || data.details || 'Failed to import leads');
      }
    } catch (err: any) {
      console.error('❌ Import error:', err);
      setError(err.message || 'Failed to import leads. Check console for details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImportAll() {
    if (searchResults.length === 0) {
      setError('No results to import');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📤 Sending all', searchResults.length, 'leads to import API...');

      const response = await fetch('/api/leads/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: searchResults }),
      });

      const data = await response.json();

      console.log('📨 Import response:', data);

      if (data.success || response.ok) {
        setSuccess(`✅ All ${searchResults.length} leads imported successfully!`);
        
        if (data.warning === 'SUPABASE_NOT_CONFIGURED') {
          setError('⚠️ Leads validated but Supabase not configured. Check console for next steps.');
        }
        
        setTimeout(() => {
          setSearchResults([]);
          setCurrentPage(0);
          setSelectedForImport(new Set());
          onImportComplete();
        }, 3000);
      } else {
        throw new Error(data.error || data.details || 'Failed to import leads');
      }
    } catch (err: any) {
      console.error('❌ Import error:', err);
      setError(err.message || 'Failed to import all leads. Check console for details.');
    } finally {
      setLoading(false);
    }
  }

  function toggleLeadSelection(index: number) {
    const newSelection = new Set(selectedForImport);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedForImport(newSelection);
  }

  return (
    <div className="mt-8 p-6 bg-[#2a2a2a] rounded-lg border border-[#333333]">
      <style>{modalScrollbarStyles}</style>

      {/* Title */}
      <h2 className="text-2xl font-bold text-[#e5e5e5] mb-6 flex items-center gap-2">
        <FaSearch className="text-purple-500" />
        Auto Lead Search
      </h2>

      {/* Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* City Dropdown */}
        <div>
          <label className="block text-sm font-medium text-[#9ca3af] mb-2">
            City
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select City</option>
            {MAJOR_US_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* State Dropdown */}
        <div>
          <label className="block text-sm font-medium text-[#9ca3af] mb-2">
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg text-[#e5e5e5] focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select State</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Radius Slider */}
        <div>
          <label className="block text-sm font-medium text-[#9ca3af] mb-2">
            Radius: {radius} miles
          </label>
          <input
            type="range"
            min="5"
            max="100"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Search Button */}
        <div className="flex items-end">
          <button
            onClick={handleAutoSearch}
            disabled={loading}
            className="w-full px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all font-medium"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Method Toggle */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setSearchMethod('smart')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            searchMethod === 'smart'
              ? 'bg-purple-600 text-white'
              : 'bg-[#1a1a1a] text-[#9ca3af] border border-[#333333] hover:bg-[#333333]'
          }`}
        >
          🎯 Smart Discovery
        </button>
        <button
          onClick={() => setSearchMethod('mock')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            searchMethod === 'mock'
              ? 'bg-purple-600 text-white'
              : 'bg-[#1a1a1a] text-[#9ca3af] border border-[#333333] hover:bg-[#333333]'
          }`}
        >
          🎭 Mock Data
        </button>
        <button
          onClick={() => setSearchMethod('chatgpt')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            searchMethod === 'chatgpt'
              ? 'bg-purple-600 text-white'
              : 'bg-[#1a1a1a] text-[#9ca3af] border border-[#333333] hover:bg-[#333333]'
          }`}
        >
          🤖 ChatGPT
        </button>
        <button
          onClick={() => setSearchMethod('google')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            searchMethod === 'google'
              ? 'bg-purple-600 text-white'
              : 'bg-[#1a1a1a] text-[#9ca3af] border border-[#333333] hover:bg-[#333333]'
          }`}
        >
          🔍 Google
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-900/20 border border-green-600 rounded-lg flex items-center gap-3 text-green-400">
          <FaCheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Results */}
      {searchResults.length > 0 && (
        <div>
          {/* Results Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[#e5e5e5]">
              Results: Page {currentPage + 1} of {totalPages} ({searchResults.length} total)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleImportAll}
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all"
                title="Import all results without selecting"
              >
                Import All ({searchResults.length})
              </button>
              <button
                onClick={handleImport}
                disabled={loading || selectedForImport.size === 0}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
              >
                Import {selectedForImport.size > 0 ? `(${selectedForImport.size})` : ''}
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="lead-scraper-results grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-[600px] overflow-y-auto">
            {paginatedResults.map((lead, index) => {
              const globalIndex = currentPage * resultsPerPage + index;
              const isSelected = selectedForImport.has(globalIndex);

              return (
                <div
                  key={globalIndex}
                  className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-purple-500 bg-[#1a1a1a]'
                      : 'border-[#333333] bg-[#1a1a1a] hover:border-purple-400'
                  }`}
                  onClick={() => toggleLeadSelection(globalIndex)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleLeadSelection(globalIndex)}
                      className="mt-1 w-4 h-4 accent-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#e5e5e5] truncate">{lead.name}</h4>
                      <p className="text-sm text-purple-400 truncate">{lead.email}</p>
                      {lead.title && (
                        <p className="text-sm text-[#9ca3af]">{lead.title}</p>
                      )}
                      {lead.org && (
                        <p className="text-sm text-[#9ca3af]">{lead.org}</p>
                      )}
                      {lead.phone && (
                        <p className="text-sm text-[#9ca3af]">{lead.phone}</p>
                      )}
                      {lead.venue && (
                        <p className="text-sm text-[#9ca3af]">📍 {lead.venue}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg text-[#e5e5e5] hover:bg-[#333333] disabled:opacity-50 flex items-center gap-2"
            >
              <FaChevronLeft />
              Previous
            </button>

            <span className="text-[#9ca3af]">
              Page {currentPage + 1} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg text-[#e5e5e5] hover:bg-[#333333] disabled:opacity-50 flex items-center gap-2"
            >
              Next
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
