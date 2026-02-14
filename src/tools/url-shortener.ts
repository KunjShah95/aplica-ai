import axios from 'axios';

export interface ShortenResult {
  success: boolean;
  shortUrl?: string;
  originalUrl?: string;
  error?: string;
}

export interface ShortenerService {
  name: string;
  shorten(url: string): Promise<ShortenResult>;
}

class TinyURLService implements ShortenerService {
  name = 'TinyURL';

  async shorten(url: string): Promise<ShortenResult> {
    try {
      const response = await axios.get(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
      );
      return {
        success: true,
        shortUrl: response.data,
        originalUrl: url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

class IsgdService implements ShortenerService {
  name = 'is.gd';

  async shorten(url: string): Promise<ShortenResult> {
    try {
      const response = await axios.get('https://is.gd/create.php', {
        params: { format: 'json', url },
      });

      if (response.data.shorturl) {
        return {
          success: true,
          shortUrl: response.data.shorturl,
          originalUrl: url,
        };
      }

      return {
        success: false,
        error: response.data.errorcode ? response.data.errorcode : 'Unknown error',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

class BitlyService implements ShortenerService {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BITLY_API_KEY;
  }

  name = 'Bitly';

  async shorten(url: string): Promise<ShortenResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Bitly API key not configured' };
    }

    try {
      const response = await axios.post(
        'https://api-ssl.bitly.com/v4/shorten',
        { long_url: url },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        shortUrl: response.data.link,
        originalUrl: url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

class RebrandlyService implements ShortenerService {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.REBRANDLY_API_KEY;
  }

  name = 'Rebrandly';

  async shorten(url: string): Promise<ShortenResult> {
    if (!this.apiKey) {
      return { success: false, error: 'Rebrandly API key not configured' };
    }

    try {
      const response = await axios.post(
        'https://api.rebrandly.com/v1/links',
        { destination: url },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        shortUrl: response.data.shortUrl,
        originalUrl: url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export class URLShortener {
  private services: ShortenerService[];

  constructor(options?: { bitlyApiKey?: string; rebrandlyApiKey?: string }) {
    this.services = [new TinyURLService(), new IsgdService()];

    if (options?.bitlyApiKey || process.env.BITLY_API_KEY) {
      this.services.push(new BitlyService(options?.bitlyApiKey));
    }

    if (options?.rebrandlyApiKey || process.env.REBRANDLY_API_KEY) {
      this.services.push(new RebrandlyService(options?.rebrandlyApiKey));
    }
  }

  async shorten(url: string, preferredService?: string): Promise<ShortenResult> {
    if (preferredService) {
      const service = this.services.find(
        (s) => s.name.toLowerCase() === preferredService.toLowerCase()
      );
      if (service) {
        return service.shorten(url);
      }
    }

    for (const service of this.services) {
      const result = await service.shorten(url);
      if (result.success) {
        return result;
      }
    }

    return { success: false, error: 'All URL shortening services failed' };
  }

  getAvailableServices(): string[] {
    return this.services.map((s) => s.name);
  }
}

export const urlShortener = new URLShortener();

export default urlShortener;
