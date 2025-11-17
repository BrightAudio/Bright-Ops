# Inventory Valuation System

## Overview
The inventory valuation system allows you to search the web for current market prices of audio equipment and automatically update your inventory database with these prices.

## Features

### 1. **Price Search Service** (`lib/services/priceSearchService.ts`)
Searches multiple audio equipment marketplaces for current pricing:

- **Reverb.com** - The largest marketplace for audio equipment (primary source)
- **Sweetwater.com** - Major pro audio retailer with consistent pricing
- **B&H Photo** - Leading photo/video/audio retailer

Functions:
- `searchItemPrice(itemName)` - Search single item across all sources
- `searchMultipleItemPrices(itemNames)` - Batch search multiple items in parallel
- `searchReverbPrices(itemName)` - Direct Reverb API search
- `searchSweetwaterPrices(itemName)` - Sweetwater web scraping
- `searchBHPhotoPrices(itemName)` - B&H Photo web scraping

### 2. **API Endpoint** (`app/api/inventory/search-values/route.ts`)

#### POST /api/inventory/search-values

**Search Mode:**
```json
{
  "mode": "search",
  "itemIds": ["uuid-1", "uuid-2"],
  "itemNames": ["JBL SRX718 Subwoofer", "Shure SM7B Microphone"]
}
```

Response:
```json
{
  "success": true,
  "results": [
    {
      "itemId": "uuid-1",
      "name": "JBL SRX718 Subwoofer",
      "priceResult": {
        "item": "JBL SRX718 Subwoofer",
        "price": 2500,
        "source": "Reverb.com",
        "url": "https://reverb.com/...",
        "lastUpdated": "2025-11-18T...",
        "confidence": "high"
      }
    }
  ],
  "searchLog": { ... }
}
```

**Update Mode:**
```json
{
  "mode": "update",
  "itemIds": ["uuid-1"],
  "updates": [
    {
      "itemId": "uuid-1",
      "marketValue": 2500,
      "marketSource": "Reverb.com"
    }
  ]
}
```

Response:
```json
{
  "success": true,
  "updates": [
    {
      "itemId": "uuid-1",
      "success": true,
      "data": { ... updated inventory item ... }
    }
  ]
}
```

#### GET /api/inventory/search-values
Health check endpoint - returns service status

### 3. **UI Component** (`components/InventoryValuation.tsx`)

React component integrated into the inventory page:

**Features:**
- Search button to query all visible items
- Display results with:
  - Current price vs found price
  - Price change amount and percentage
  - Confidence level (high/medium/low)
  - Source URL (clickable)
- Checkbox selection for items to update
- Bulk update button to apply selected prices
- Success/error messaging
- Loading states

**Props:**
```typescript
interface InventoryValuationProps {
  items: InventoryItem[];
  onUpdate?: (updatedItems: InventoryItem[]) => void;
}
```

### 4. **Database Changes** (`sql/migrations/2025-11-18_add_market_value_tracking.sql`)

New columns added to `inventory_items`:
- `market_value` (NUMERIC) - Current market value found via web search
- `market_source` (VARCHAR) - Source where price was found
- `market_lookup_date` (TIMESTAMP) - When market value was last searched
- `price_history` (JSONB) - Array of {price, source, date} tracking price changes

Indexes:
- `idx_inventory_items_market_lookup_date` - For sorting by lookup date
- `idx_inventory_items_needs_market_value` - Find items without market valuation

## Usage

### From UI
1. Go to **Inventory** page at `/app/inventory`
2. Click the **💰 Value Items** button at the top
3. A valuation panel appears above the inventory table
4. Click **🔍 Search Prices** to query current market prices
5. Results appear showing current price vs found price
6. Check boxes next to items you want to update
7. Click **✓ Apply Updates** to save new prices to inventory

### From API
Use the POST endpoint directly:

```bash
curl -X POST http://localhost:3000/api/inventory/search-values \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "search",
    "itemIds": ["item-uuid"],
    "itemNames": ["JBL SRX718"]
  }'
```

## How It Works

1. **Search Phase:**
   - User selects items and clicks search
   - API calls price search service
   - Service queries Reverb, Sweetwater, B&H in sequence
   - Returns first successful result with confidence level
   - Results cached for display

2. **Review Phase:**
   - User sees current price vs found price
   - Can see price change percentage
   - Selects items to update
   - Compares source credibility

3. **Update Phase:**
   - Selected items sent to API in update mode
   - Database updated with new market_value and market_source
   - Updated_at timestamp recorded
   - Search log saved for audit trail

## Confidence Levels

- **High (Reverb.com)** - Most reliable for audio equipment, peer-to-peer marketplace
- **Medium (Sweetwater, B&H)** - Professional retailers with consistent pricing
- **Low** - If extended to other sources

## Error Handling

- If no prices found for an item, result shows "No prices found"
- Item cannot be selected for update if no price found
- Network errors handled gracefully with user messaging
- Failed database updates reported individually

## Performance

- Searches run in parallel for speed
- Each marketplace queried sequentially (fail-over model)
- Typical search time: 2-5 seconds for 10 items
- No rate limiting (respects site terms of service)

## Future Enhancements

1. **Price History Tracking** - Store all prices searched in price_history JSONB
2. **Scheduled Auto-Valuation** - Background job to periodically update prices
3. **Price Alerts** - Notify when market value drops/rises significantly
4. **Vendor APIs** - Direct integration with gear rental-focused APIs
5. **Advanced Filtering** - Filter by item category before search
6. **Export Reports** - Export valuation reports as CSV/PDF
7. **Price Trends** - Display price trends over time
8. **Inventory Assessment Reports** - Financial analysis based on market values

## Database Maintenance

Monitor market valuation:

```sql
-- Find items never valued
SELECT id, name FROM inventory_items WHERE market_lookup_date IS NULL;

-- Find items valued more than 30 days ago
SELECT id, name, market_value, market_lookup_date 
FROM inventory_items 
WHERE market_lookup_date < NOW() - INTERVAL '30 days';

-- View price history for an item
SELECT id, name, market_value, price_history 
FROM inventory_items 
WHERE id = 'item-uuid';
```

## Limitations

- Web scraping may fail if websites change structure
- Requires internet connection
- Searches may be rate-limited by target websites
- Audio equipment with custom modifications may not match listings
- Used/refurbished items may not reflect rental market prices

## Tech Stack

- **Next.js API Route** - Backend endpoint
- **Fetch API** - HTTP requests
- **Web Scraping** - HTML parsing (could be enhanced with Cheerio/Puppeteer)
- **Supabase** - Database updates
- **React** - UI component
- **Tailwind CSS** - Styling
