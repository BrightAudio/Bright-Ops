-- Migration: Add drivers array to speaker_test_data for inventory items
-- Date: 2025-12-07
-- Description: Allows storing driver information directly on speaker inventory items

-- The speaker_test_data JSONB column will now support a 'drivers' array with this structure:
-- {
--   "drivers": [
--     {
--       "id": "uuid",
--       "name": "Driver Name",
--       "driver_type": "woofer|mid|tweeter|compression_driver",
--       "quantity": 1,
--       "impedance": "8 ohm",
--       "power_rating": "600W",
--       "frequency_response_low": "40",
--       "frequency_response_high": "2000",
--       "sensitivity": "96 dB",
--       "diameter": "15 inch",
--       "fs": "35 Hz",
--       "qts": "0.4",
--       "vas": "100 L",
--       "xmax_excursion": "8 mm"
--     }
--   ],
--   ... (other existing test data)
-- }

-- Add comment to document the new structure
COMMENT ON COLUMN public.inventory_items.speaker_test_data IS 
'JSON data for speaker test results and specifications. 
Structure: {
  "drivers": [{"id": "uuid", "name": "string", "driver_type": "string", "quantity": number, "impedance": "string", ...}],
  "impedance": "string",
  "frequency_response_low": "string",
  "frequency_response_high": "string",
  "sensitivity": "string",
  "power_rating": "string"
}';

-- No schema changes needed, just documentation of the JSONB structure
