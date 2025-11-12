/**
 * Barcode Generation Utilities
 *
 * Generates unique barcodes for inventory items using a prefix (item type)
 * and a 3-digit serial number to differentiate physical units.
 *
 * Format: PREFIX-XXX
 * Example: X32-001, X32-002, SM58-001, SM58-023
 */

import { supabaseBrowser } from '@/lib/supabaseClient';
import JsBarcode from 'jsbarcode';
import * as QRCode from 'qrcode';

/**
 * Generate a barcode prefix from item name
 * Takes first 3-6 characters, removes spaces, converts to uppercase
 * 
 * @example
 * generatePrefix("X32 Mixer") // "X32"
 * generatePrefix("Shure SM58") // "SM58"
 * generatePrefix("LED PAR Can") // "LEDPAR"
 */
export function generatePrefix(itemName: string): string {
  // Remove common words
  const cleaned = itemName
    .replace(/\b(Mixer|Microphone|Mic|Speaker|Cable|Light|LED|PAR)\b/gi, '')
    .trim();
  
  // Take first word or first 6 chars, remove spaces/special chars
  const prefix = (cleaned.split(' ')[0] || itemName.split(' ')[0])
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 6);
  
  return prefix || 'ITEM';
}

/**
 * Get the next available serial number for a given prefix
 * Queries existing inventory to find the highest serial number used
 * 
 * @param prefix - The barcode prefix (e.g., "X32")
 * @returns Next available 3-digit serial (e.g., "001", "002", "023")
 */
export async function getNextSerial(prefix: string): Promise<string> {
  const supabase = supabaseBrowser();
  
  // Find all barcodes with this prefix
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('barcode')
    .ilike('barcode', `${prefix}-%`);
  
  if (error) {
    console.error('Error fetching barcodes:', error);
    return '001'; // Default to 001 if error
  }
  
  if (!items || items.length === 0) {
    return '001'; // First item of this type
  }
  
  // Extract serial numbers and find the highest
  const serials = items
    .map((item: any) => {
      const parts = item.barcode?.split('-');
      const serial = parts?.[parts.length - 1]; // Last part is the serial
      return parseInt(serial || '0', 10);
    })
    .filter(num => !isNaN(num));
  
  const maxSerial = Math.max(0, ...serials);
  const nextSerial = maxSerial + 1;
  
  // Pad to 3 digits
  return nextSerial.toString().padStart(3, '0');
}

/**
 * Generate a complete unique barcode for an inventory item
 * Ensures no duplicates by checking the database and incrementing if needed
 * 
 * @param itemName - Name of the inventory item
 * @returns Complete barcode in format PREFIX-XXX
 * 
 * @example
 * await generateBarcode("X32 Mixer") // "X32-001"
 * await generateBarcode("X32 Mixer") // "X32-002" (if X32-001 exists)
 * await generateBarcode("Shure SM58") // "SM58-001"
 */
export async function generateBarcode(itemName: string): Promise<string> {
  const supabase = supabaseBrowser();
  const prefix = generatePrefix(itemName);
  let serial = await getNextSerial(prefix);
  let barcode = `${prefix}-${serial}`;
  let attempts = 0;
  const maxAttempts = 1000; // Safety limit
  
  // Keep trying until we find a unique barcode
  while (attempts < maxAttempts) {
    // Check if this barcode already exists
    const { data: existing, error } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('barcode', barcode)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking barcode uniqueness:', error);
      throw new Error('Failed to verify barcode uniqueness');
    }
    
    // If no existing item found, this barcode is unique
    if (!existing) {
      return barcode;
    }
    
    // Barcode exists, increment and try again
    attempts++;
    const nextSerialNum = parseInt(serial, 10) + attempts;
    serial = nextSerialNum.toString().padStart(3, '0');
    barcode = `${prefix}-${serial}`;
  }
  
  throw new Error(`Could not generate unique barcode after ${maxAttempts} attempts`);
}

/**
 * Validate if a barcode has already been scanned for a specific job
 * Prevents duplicate scanning of the same physical unit
 * 
 * @param barcode - The barcode to check
 * @param jobId - The job ID to check against
 * @returns true if barcode was already scanned for this job
 */
export async function isBarcodeAlreadyScanned(
  barcode: string,
  jobId: string
): Promise<boolean> {
  const supabase = supabaseBrowser();
  
  // Check scan_events table for this barcode + job combination
  const { data, error } = await supabase
    .from('scan_events')
    .select('id')
    .eq('barcode', barcode)
    .eq('job_id', jobId)
    .limit(1);
  
  if (error) {
    console.error('Error checking scan history:', error);
    return false; // Allow scan if error
  }
  
  return (data?.length || 0) > 0;
}

/**
 * Get the item type (prefix) from a barcode
 * 
 * @param barcode - Full barcode (e.g., "X32-001")
 * @returns Prefix (e.g., "X32")
 */
export function getBarcodePrefix(barcode: string): string {
  const parts = barcode.split('-');
  return parts.slice(0, -1).join('-'); // Everything except last part
}

/**
 * Get the serial number from a barcode
 * 
 * @param barcode - Full barcode (e.g., "X32-001")
 * @returns Serial number (e.g., "001")
 */
export function getBarcodeSerial(barcode: string): string {
  const parts = barcode.split('-');
  return parts[parts.length - 1]; // Last part
}

/**
 * Check if two barcodes are the same item type (same prefix)
 * 
 * @param barcode1 - First barcode
 * @param barcode2 - Second barcode
 * @returns true if same item type (prefix matches)
 * 
 * @example
 * isSameItemType("X32-001", "X32-002") // true
 * isSameItemType("X32-001", "SM58-001") // false
 */
export function isSameItemType(barcode1: string, barcode2: string): boolean {
  return getBarcodePrefix(barcode1) === getBarcodePrefix(barcode2);
}

/**
 * Generate a barcode image as a data URL
 *
 * @param barcode - The barcode text to encode
 * @param options - Options for barcode generation
 * @returns Promise resolving to data URL of the barcode image
 */
export async function generateBarcodeImage(
  barcode: string,
  options: {
    format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
    width?: number;
    height?: number;
    displayValue?: boolean;
  } = {}
): Promise<string> {
  const {
    format = 'CODE128',
    width = 2,
    height = 100,
    displayValue = true
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');

      // Generate barcode on canvas
      JsBarcode(canvas, barcode, {
        format,
        width,
        height,
        displayValue,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        fontSize: 20
      });

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a QR code image as a data URL
 *
 * @param text - The text to encode in the QR code
 * @param options - Options for QR code generation
 * @returns Promise resolving to data URL of the QR code image
 */
export async function generateQRCodeImage(
  text: string,
  options: {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  } = {}
): Promise<string> {
  // TODO: Fix QRCode types
  // Using type assertion as workaround
  const QR = QRCode as any;
  
  const {
    width = 256,
    margin = 4,
    color = { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel = 'M'
  } = options;

  try {
    const url = await QR.toDataURL(text, {
      width,
      margin,
      color,
      errorCorrectionLevel
    });
    return url;
  } catch (error) {
    throw error;
  }
}

/**
 * Generate both barcode and QR code images for a given barcode text
 *
 * @param barcode - The barcode text
 * @returns Promise resolving to object with both image data URLs
 */
export async function generateBarcodeAndQRImages(barcode: string): Promise<{
  barcodeImage: string;
  qrCodeImage: string;
}> {
  const [barcodeImage, qrCodeImage] = await Promise.all([
    generateBarcodeImage(barcode),
    generateQRCodeImage(barcode)
  ]);

  return {
    barcodeImage,
    qrCodeImage
  };
}
