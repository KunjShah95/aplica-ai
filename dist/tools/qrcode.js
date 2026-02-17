import axios from 'axios';
export class QRCodeTool {
    async generate(options) {
        try {
            const params = new URLSearchParams({
                data: options.data,
                size: String(options.size || 300),
                margin: String(options.margin || 2),
                color: (options.color || '000000').replace('#', ''),
                bgcolor: (options.backgroundColor || 'ffffff').replace('#', ''),
                errorcorrection: options.errorCorrectionLevel || 'M',
            });
            const response = await axios.get(`https://api.qrserver.com/v1/create-qr-code/?${params}`, {
                responseType: 'arraybuffer',
            });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            return {
                success: true,
                qrCodeBase64: `data:image/png;base64,${base64}`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async generateWifi(ssid, password, encryption = 'WPA') {
        const wifiData = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
        return this.generate({ data: wifiData });
    }
    async generateVCard(name, phone, email, organization) {
        let vcard = 'BEGIN:VCARD\nVERSION:3.0';
        vcard += `\nFN:${name}`;
        if (phone)
            vcard += `\nTEL:${phone}`;
        if (email)
            vcard += `\nEMAIL:${email}`;
        if (organization)
            vcard += `\nORG:${organization}`;
        vcard += '\nEND:VCARD';
        return this.generate({ data: vcard });
    }
}
export const qrCodeTool = new QRCodeTool();
export default qrCodeTool;
//# sourceMappingURL=qrcode.js.map