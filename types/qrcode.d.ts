declare module 'qrcode' {
  interface QRCodeOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
  
  function toBuffer(text: string, options?: QRCodeOptions): Promise<Buffer>;
  
  export { toBuffer };
  const qrcode: {
    toBuffer: typeof toBuffer;
  };

  export default qrcode;
}