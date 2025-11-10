/**
 * Barcode Label Printing Utilities
 * 
 * Supports printing barcodes to label printers using:
 * - Browser Print API (modern browsers)
 * - ZPL (Zebra Programming Language) for Zebra printers
 * - ESC/P for Dymo/Brother printers
 * - Web Bluetooth API for wireless printers
 */

/**
 * Printer types supported
 */
export type PrinterType = 'zebra' | 'dymo' | 'brother' | 'generic';

/**
 * Label configuration
 */
export interface LabelConfig {
  width: number;  // in mm
  height: number; // in mm
  barcode: string;
  itemName: string;
  additionalInfo?: string;
}

/**
 * Standard label sizes
 */
export const LABEL_SIZES = {
  small: { width: 50, height: 25 },   // 2" x 1"
  medium: { width: 75, height: 50 },  // 3" x 2"
  large: { width: 100, height: 50 },  // 4" x 2"
} as const;

/**
 * Generate ZPL (Zebra Programming Language) code for Zebra printers
 */
export function generateZPL(config: LabelConfig): string {
  const { barcode, itemName, additionalInfo } = config;
  
  // ZPL template for a barcode label
  // ^XA = Start of label format
  // ^FO = Field Origin (position)
  // ^BY = Barcode field default
  // ^BC = Code 128 barcode
  // ^FD = Field Data
  // ^FS = Field Separator
  // ^XZ = End of label format
  
  return `^XA
^FO50,30^BY3
^BCN,100,Y,N,N
^FD${barcode}^FS
^FO50,150^A0N,30,30^FD${itemName}^FS
${additionalInfo ? `^FO50,190^A0N,25,25^FD${additionalInfo}^FS` : ''}
^XZ`;
}

/**
 * Generate ESC/P code for Dymo/Brother printers
 */
export function generateESCP(config: LabelConfig): string {
  const { barcode, itemName } = config;
  
  // Simplified ESC/P commands
  // ESC @ = Initialize printer
  // ESC ! = Select print mode
  
  return `\x1B@
\x1B!0${itemName}
\x1B!8${barcode}
\x0C`; // Form feed
}

/**
 * Print barcode label using browser's native print dialog
 * Works with any printer but requires manual printer selection
 */
export function printLabelBrowser(config: LabelConfig): void {
  const { barcode, itemName, additionalInfo, width, height } = config;
  
  // Create a new window with printable content
  const printWindow = window.open('', '_blank', `width=${width * 4},height=${height * 4}`);
  
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups for label printing.');
  }
  
  // Generate HTML content for printing
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print Label - ${barcode}</title>
  <style>
    @page {
      size: ${width}mm ${height}mm;
      margin: 0;
    }
    
    body {
      margin: 0;
      padding: 10mm;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: ${height}mm;
      width: ${width}mm;
    }
    
    .item-name {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 5mm;
      text-align: center;
    }
    
    .barcode {
      font-family: 'Libre Barcode 128', monospace;
      font-size: 48pt;
      letter-spacing: 0;
      margin-bottom: 2mm;
    }
    
    .barcode-text {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 3mm;
    }
    
    .additional-info {
      font-size: 10pt;
      color: #666;
      text-align: center;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
</head>
<body>
  <div class="item-name">${itemName}</div>
  <div class="barcode">*${barcode}*</div>
  <div class="barcode-text">${barcode}</div>
  ${additionalInfo ? `<div class="additional-info">${additionalInfo}</div>` : ''}
</body>
</html>`;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Wait for fonts to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close window after printing (or if cancelled)
      setTimeout(() => printWindow.close(), 100);
    }, 500);
  };
}

/**
 * Send raw ZPL/ESC code directly to a network printer
 * Requires printer IP address or hostname
 */
export async function printToNetworkPrinter(
  printerUrl: string,
  zplCode: string
): Promise<void> {
  try {
    const response = await fetch(printerUrl, {
      method: 'POST',
      body: zplCode,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Printer responded with ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Failed to print: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Connect to a Bluetooth label printer
 * Requires Web Bluetooth API (Chrome/Edge)
 */
export async function printViaBluetooth(
  config: LabelConfig,
  printerType: PrinterType = 'zebra'
): Promise<void> {
  if (!('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth is not supported in this browser. Use Chrome or Edge.');
  }
  
  try {
    // Request Bluetooth device
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Zebra service UUID
      ],
      optionalServices: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'], // Generic printer service
    });
    
    console.log('Connecting to printer:', device.name);
    
    const server = await device.gatt?.connect();
    if (!server) throw new Error('Failed to connect to printer');
    
    // Get the printer service
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    
    // Generate print data based on printer type
    const printData = printerType === 'zebra' 
      ? generateZPL(config) 
      : generateESCP(config);
    
    // Send data to printer
    const encoder = new TextEncoder();
    await characteristic.writeValue(encoder.encode(printData));
    
    console.log('Label sent to printer successfully');
    
    // Disconnect after a short delay
    setTimeout(() => {
      device.gatt?.disconnect();
    }, 1000);
    
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      throw new Error('No printer selected');
    }
    throw new Error(`Bluetooth printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Print using USB connection (requires Web Serial API)
 * Supported in Chrome/Edge
 */
export async function printViaUSB(
  config: LabelConfig,
  printerType: PrinterType = 'zebra'
): Promise<void> {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API not supported. Use Chrome or Edge.');
  }
  
  try {
    // Request USB serial port
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    
    // Generate print data
    const printData = printerType === 'zebra' 
      ? generateZPL(config) 
      : generateESCP(config);
    
    // Write to serial port
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    await writer.write(encoder.encode(printData));
    writer.releaseLock();
    
    // Close port
    await port.close();
    
  } catch (error) {
    throw new Error(`USB printing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main print function - automatically detects best method
 */
export async function printBarcodeLabel(
  config: LabelConfig,
  options?: {
    printerType?: PrinterType;
    method?: 'browser' | 'bluetooth' | 'usb' | 'network';
    networkUrl?: string;
  }
): Promise<void> {
  const method = options?.method || 'browser';
  const printerType = options?.printerType || 'zebra';
  
  switch (method) {
    case 'bluetooth':
      await printViaBluetooth(config, printerType);
      break;
      
    case 'usb':
      await printViaUSB(config, printerType);
      break;
      
    case 'network':
      if (!options?.networkUrl) {
        throw new Error('Network URL required for network printing');
      }
      const zpl = generateZPL(config);
      await printToNetworkPrinter(options.networkUrl, zpl);
      break;
      
    case 'browser':
    default:
      printLabelBrowser(config);
      break;
  }
}

/**
 * Check if browser supports advanced printing methods
 */
export function getPrinterCapabilities() {
  return {
    bluetooth: 'bluetooth' in navigator,
    usb: 'serial' in navigator,
    browserPrint: true,
  };
}
