declare module "qrcode" {
  const QRCode: {
    toDataURL(value: string, options?: { width?: number; margin?: number; errorCorrectionLevel?: "L" | "M" | "Q" | "H" }): Promise<string>;
  };
  export default QRCode;
}
