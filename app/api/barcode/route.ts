import { NextRequest, NextResponse } from 'next/server';
const bwipjs = require('bwip-js');
import QRCode from 'qrcode';
import { z } from 'zod';

const barcodeSchema = z.object({
  data: z.string().min(1, 'Value required'),
  type: z.enum(['qr', 'code128', 'ean13']).default('qr'),
  width: z.number().min(50).max(800).default(200),
  height: z.number().min(50).max(800).default(200)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, type, width, height } = barcodeSchema.parse(body);

    let imageBuffer: Buffer;

    if (type === 'qr') {
      imageBuffer = await QRCode.toBuffer(data, {
        width,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
    } else {
      imageBuffer = await bwipjs.toBuffer({
        bcid: type, // code128 or ean13
        text: data,
        scale: Math.max(1, Math.floor(width / 100)),
        height,
        includetext: true,
        textxalign: 'center',
      });
    }

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.format() },
        { status: 400 }
      );
    }
    console.error('Barcode generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate barcode' },
      { status: 500 }
    );
  }
}