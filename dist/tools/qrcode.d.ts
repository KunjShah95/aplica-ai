export interface QRCodeOptions {
    data: string;
    size?: number;
    margin?: number;
    color?: string;
    backgroundColor?: string;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}
export interface QRCodeResult {
    success: boolean;
    qrCodeBase64?: string;
    qrCodeUrl?: string;
    error?: string;
}
export declare class QRCodeTool {
    generate(options: QRCodeOptions): Promise<QRCodeResult>;
    generateWifi(ssid: string, password: string, encryption?: 'WPA' | 'WEP' | 'nopass'): Promise<QRCodeResult>;
    generateVCard(name: string, phone?: string, email?: string, organization?: string): Promise<QRCodeResult>;
}
export declare const qrCodeTool: QRCodeTool;
export default qrCodeTool;
//# sourceMappingURL=qrcode.d.ts.map