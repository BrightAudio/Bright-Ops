# Add Item Modal - Visual Guide

## Modal Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Add Pull Sheet Item                                          × │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SELECT GEAR TYPE                                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ -- Choose a category --                              ▼  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [After selecting gear type, item list appears:]               │
│                                                                 │
│  2. SELECT ITEM                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ┌───────────────────────────────────────────────────┐  ↑│  │
│  │ │ QSC K12.2 Speaker          Barcode: QSC-K12-001   │   │  │
│  │ ├───────────────────────────────────────────────────┤   │  │
│  │ │ JBL PRX815W Speaker        Barcode: JBL-PRX-042   │   │  │
│  │ ├───────────────────────────────────────────────────┤   │  │
│  │ │ EV EKX-15P Speaker         Barcode: EV-EKX-113    │ ● │  │
│  │ └───────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  OR ENTER CUSTOM ITEM NAME                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Custom item name (if not in inventory)                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  3. QUANTITY          │  4. NOTES (OPTIONAL)                   │
│  ┌──────────────────┐ │  ┌──────────────────────────────────┐ │
│  │ 1                │ │  │ Special instructions or notes    │ │
│  └──────────────────┘ │  └──────────────────────────────────┘ │
│                                                                 │
│  [When item selected, preview shows:]                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ SELECTED:                                                │  │
│  │ QSC K12.2 Speaker                                        │  │
│  │ Barcode: QSC-K12-001                                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                      ┌──────┐  ┌────────────┐ │
│                                      │Cancel│  │ Add Item   │ │
│                                      └──────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Available Gear Types

When you click the dropdown, you'll see:
- Speakers
- Microphones
- Cables
- Lighting
- Power
- Cases
- Video
- Audio Processing
- Rigging
- Staging
- Other

## Color Scheme

- **Background**: Dark zinc (#181a20 for modal, #0c0d10 for inputs)
- **Borders**: White with 10% opacity
- **Text**: White (primary), White/60% (secondary), White/40% (labels)
- **Accent**: Amber (#fbbf24) for selections and buttons
- **Selected Item**: Amber background with 20% opacity
- **Error Messages**: Red with semi-transparent background

## User Interaction Flow

```
Start: Click "+ Add Item" button on pull sheet
  ↓
Step 1: Select gear type from dropdown
  ↓
Step 2: Scroll through filtered items list
  ↓
Step 3: Click on an item to select it
  ↓ (Optional: Enter custom name instead)
Step 4: Adjust quantity (default: 1)
  ↓
Step 5: Add notes (optional)
  ↓
Review: Check selected item preview
  ↓
Submit: Click "Add Item"
  ↓
Result: Item appears in pull sheet table
```

## Example Usage Scenarios

### Scenario 1: Adding Speakers
1. Click "+ Add Item"
2. Select "Speakers" from dropdown
3. Browse: QSC K12.2, JBL PRX815W, EV EKX-15P, etc.
4. Click "QSC K12.2 Speaker"
5. Enter quantity: 4
6. Add note: "For front of house"
7. Click "Add Item"

### Scenario 2: Adding Cables
1. Click "+ Add Item"
2. Select "Cables" from dropdown
3. Browse: XLR 25ft, XLR 50ft, Speakon, etc.
4. Click "XLR 25ft"
5. Enter quantity: 12
6. Notes: Leave blank
7. Click "Add Item"

### Scenario 3: Custom Item
1. Click "+ Add Item"
2. Skip gear type (or select one)
3. Type in custom name field: "Special LED Panel (rental)"
4. Enter quantity: 2
5. Add note: "External rental - return to vendor"
6. Click "Add Item"

## Validation Rules

✅ **Valid Submission Requires:**
- Item name (either from selection OR custom input)
- Quantity > 0

❌ **Invalid Cases:**
- Empty item name
- Quantity = 0 or negative
- (Shows error message in red)

## Keyboard Navigation

- **Tab**: Move between fields
- **Arrow keys**: Navigate dropdown and item list
- **Enter**: Submit form (when all fields valid)
- **Escape**: Close modal (Cancel)
