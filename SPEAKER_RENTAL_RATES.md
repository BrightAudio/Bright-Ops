# Speaker Rental Rates Setup

## Overview
Set up automated speaker rental rate configuration for the inventory system with the following pricing structure:

## Rental Rates

### Daily Rates
- **Powered/Active Speakers & Monitors**: $75/day ($375/week)
- **Tops & Subs**: $100/day ($500/week)
- **L Acoustics Speakers**: $150/day ($750/week)

## How to Use

### Option 1: Via Web Interface (Recommended)
1. Navigate to **Inventory Management** → **🎵 Speaker Rates**
2. Review the rental rate schedule
3. Click **"Set Speaker Rental Rates"** button
4. System will automatically categorize and update all speakers

### Option 2: Via SQL Migration
Run the migration file to apply rates directly:
```
sql/migrations/2025-11-17_set_speaker_rental_values.sql
```

## What Gets Updated

The system uses name matching to categorize speakers:

### L Acoustics (Priority - $150/day)
Patterns: "l acoustics", "la8", "la12", "kyara", "kara"
- These are premium speakers and get the highest rate

### Tops & Subs ($100/day)
Patterns: "top", "sub", "subwoofer", "bass"
- Excludes L Acoustics brands
- Heavier equipment typically commands higher rental rates

### Powered/Active & Monitors ($75/day)
Patterns: "powered", "active", "monitor"
- Excludes L Acoustics brands
- Most common speaker types

## Database Fields Updated
- `rental_cost_daily`: Set based on speaker type (75, 100, or 150)
- `rental_cost_weekly`: Automatically set to `daily_rate * 5`

## How It Works

The system:
1. Fetches all inventory items with category "speakers"
2. Matches item names against pattern lists
3. L Acoustics always takes priority (highest rate)
4. Applies daily and weekly rates based on matches
5. Returns a report of all updated items

## Example Results
```
L Acoustics speakers: 5 items → $150/day, $750/week
Tops and subs: 12 items → $100/day, $500/week
Powered/Active speakers and monitors: 28 items → $75/day, $375/week
Total: 45 speakers updated
```

## API Endpoint
POST `/api/inventory/set-speaker-rates`
- Triggers the rate update process
- Returns detailed results with speaker names
- Can be called manually or via the web interface

## Files Created
- `/app/app/inventory/speaker-rates/page.tsx` - Web interface
- `/app/api/inventory/set-speaker-rates/route.ts` - Backend API
- `/sql/migrations/2025-11-17_set_speaker_rental_values.sql` - SQL migration

## Notes
- Weekly rates are automatically calculated as 5x the daily rate
- Rates persist in the database and can be manually overridden per item
- The pattern matching is case-insensitive
- Future rate adjustments can be done via the same interface
