'use client';

import { useState } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  unit_value: number;
  barcode?: string;
  category?: string | null;
}

interface PriceResult {
  item: string;
  price: number;
  source: string;
  url: string;
  lastUpdated: string;
  confidence: 'high' | 'medium' | 'low';
}

interface SearchResult {
  itemId: string;
  name: string;
  priceResult: PriceResult | null;
}

export interface InventoryValuationProps {
  items: InventoryItem[];
  onUpdate?: (updatedItems: InventoryItem[]) => void;
  onSearchItem?: (itemId: string, result: SearchResult) => void;
}

export function InventoryValuation({ items, onUpdate, onSearchItem }: InventoryValuationProps) {
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [batchSearching, setBatchSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Map<string, SearchResult>>(new Map());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Search for a single item
  const handleSearchItem = async (itemId: string, itemName: string) => {
    setSearchingId(itemId);
    setMessage(null);

    try {
      const response = await fetch('/api/inventory/price-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: [itemId],
          itemNames: [itemName],
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const searchResult: SearchResult = {
          itemId: result.itemId,
          name: result.name,
          priceResult: result.price ? {
            item: result.name,
            price: result.price,
            source: result.source,
            url: 'https://bright-audio-app.com',
            lastUpdated: new Date().toISOString(),
            confidence: result.confidence,
          } : null,
        };

        const newResults = new Map(searchResults);
        newResults.set(itemId, searchResult);
        setSearchResults(newResults);

        if (onSearchItem) {
          onSearchItem(itemId, searchResult);
        }

        setMessage({
          type: 'success',
          text: searchResult.priceResult 
            ? `Found price: $${searchResult.priceResult.price} (${searchResult.priceResult.source})`
            : `No price found for ${itemName}`,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setSearchingId(null);
    }
  };

  // Batch search all items
  const handleBatchSearch = async () => {
    setBatchSearching(true);
    setMessage(null);

    try {
      const response = await fetch('/api/inventory/price-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: items.map((i) => i.id),
          itemNames: items.map((i) => i.name),
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      const transformedResults = new Map<string, SearchResult>();
      data.results.forEach((result: any) => {
        transformedResults.set(result.itemId, {
          itemId: result.itemId,
          name: result.name,
          priceResult: result.price ? {
            item: result.name,
            price: result.price,
            source: result.source,
            url: 'https://bright-audio-app.com',
            lastUpdated: new Date().toISOString(),
            confidence: result.confidence,
          } : null,
        });
      });

      setSearchResults(transformedResults);
      const foundCount = Array.from(transformedResults.values()).filter((r) => r.priceResult).length;
      setMessage({
        type: 'success',
        text: `Found prices for ${foundCount} of ${items.length} items`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setBatchSearching(false);
    }
  };

  // Get search result for an item if it exists
  const getSearchResult = (itemId: string): SearchResult | undefined => {
    return searchResults.get(itemId);
  };

  const handleApplyUpdates = async () => {
    setUpdating(true);
    setMessage(null);

    try {
      const updates = Array.from(selectedItems).map((itemId) => {
        const result = getSearchResult(itemId);
        if (!result || !result.priceResult) {
          throw new Error(`No price result for item ${itemId}`);
        }

        return {
          itemId,
          marketValue: result.priceResult.price,
          marketSource: result.priceResult.source,
        };
      });

      const response = await fetch('/api/inventory/search-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'update',
          itemIds: Array.from(selectedItems),
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      const data = await response.json();
      const successCount = data.updates.filter((u: { success: boolean }) => u.success).length;

      setMessage({
        type: 'success',
        text: `Updated ${successCount} items with new market values`,
      });

      // Reset selection
      setSelectedItems(new Set());
      setSearchResults(new Map());

      // Notify parent component
      if (onUpdate && data.updates[0]?.data) {
        onUpdate(data.updates.map((u: { data: InventoryItem }) => u.data));
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Update error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Search Options */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-sm text-gray-700 font-semibold">Search for Market Prices</p>
        <p className="mb-4 text-xs text-gray-600">
          Use batch search to find prices for all items at once, or click the search button on individual items for faster results.
        </p>
        <button
          onClick={handleBatchSearch}
          disabled={batchSearching || items.length === 0}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {batchSearching ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Searching {items.length} items...
            </>
          ) : (
            <>
              🔍 Batch Search All ({items.length})
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {searchResults.size > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Prices Found ({Array.from(searchResults.values()).filter((r) => r.priceResult).length})
            </h3>
            {selectedItems.size > 0 && (
              <button
                onClick={handleApplyUpdates}
                disabled={updating || selectedItems.size === 0}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : (
                  <>✓ Apply {selectedItems.size} Updates</>
                )}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {Array.from(searchResults.values()).map((result) => {
              const item = items.find((i) => i.id === result.itemId);
              if (!item) return null;

              const found = result.priceResult !== null;
              const isSelected = selectedItems.has(result.itemId);
              const priceChange = (found && result.priceResult)
                ? result.priceResult.price - item.unit_value
                : 0;
              const percentChange = (found && result.priceResult)
                ? (((result.priceResult.price - item.unit_value) / item.unit_value) * 100).toFixed(1)
                : '0';

              return (
                <div
                  key={result.itemId}
                  className={`rounded-lg border-2 p-4 transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const newSelected = new Set(selectedItems);
                        if (newSelected.has(result.itemId)) {
                          newSelected.delete(result.itemId);
                        } else {
                          newSelected.add(result.itemId);
                        }
                        setSelectedItems(newSelected);
                      }}
                      disabled={!found}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                    />

                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      {item.barcode && (
                        <div className="text-xs text-gray-500">Barcode: {item.barcode}</div>
                      )}

                      {found && result.priceResult ? (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm text-gray-600">Current:</span>
                            <span className="font-semibold text-gray-900">
                              ${item.unit_value.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-600">→</span>
                            <span className="font-semibold text-blue-600">
                              ${result.priceResult.price.toFixed(2)}
                            </span>
                            <span
                              className={`text-sm font-semibold ${
                                priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} / {percentChange}%)
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span
                              className={`inline-block rounded px-2 py-1 ${
                                result.priceResult.confidence === 'high'
                                  ? 'bg-green-100 text-green-800'
                                  : result.priceResult.confidence === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {result.priceResult.confidence} confidence
                            </span>
                            <a
                              href={result.priceResult.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {result.priceResult.source}
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-500">
                          ✗ No prices found for this item
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
