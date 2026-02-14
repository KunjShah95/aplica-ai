import axios from 'axios';

export interface WeatherOptions {
  location: string;
  units?: 'metric' | 'imperial';
}

export interface WeatherResult {
  success: boolean;
  location?: string;
  temperature?: number;
  feelsLike?: number;
  humidity?: number;
  description?: string;
  icon?: string;
  windSpeed?: number;
  pressure?: number;
  visibility?: number;
  sunrise?: string;
  sunset?: string;
  forecast?: Array<{
    date: string;
    tempMin: number;
    tempMax: number;
    description: string;
    icon: string;
  }>;
  error?: string;
}

export class WeatherTool {
  private openWeatherMapApiKey?: string;

  constructor(options?: { openWeatherMapApiKey?: string }) {
    this.openWeatherMapApiKey = options?.openWeatherMapApiKey || process.env.OPENWEATHERMAP_API_KEY;
  }

  async getCurrentWeather(options: WeatherOptions): Promise<WeatherResult> {
    if (!this.openWeatherMapApiKey) {
      return { success: false, error: 'OpenWeatherMap API key not configured' };
    }

    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather`;
      const response = await axios.get(weatherUrl, {
        params: {
          q: options.location,
          appid: this.openWeatherMapApiKey,
          units: options.units || 'metric',
        },
      });

      const data = response.data;
      return {
        success: true,
        location: data.name,
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        description: data.weather[0].description,
        icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure,
        visibility: data.visibility,
        sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
        sunset: new Date(data.sys.sunset * 1000).toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getForecast(location: string, days: number = 5): Promise<WeatherResult> {
    if (!this.openWeatherMapApiKey) {
      return { success: false, error: 'OpenWeatherMap API key not configured' };
    }

    try {
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast`;
      const response = await axios.get(forecastUrl, {
        params: {
          q: location,
          appid: this.openWeatherMapApiKey,
          units: 'metric',
        },
      });

      const dailyData = this.groupByDay(response.data.list);
      const forecast = dailyData.slice(0, days).map((day: any) => ({
        date: day.date,
        tempMin: day.tempMin,
        tempMax: day.tempMax,
        description: day.description,
        icon: day.icon,
      }));

      return {
        success: true,
        location: response.data.city.name,
        forecast,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getWeatherAlerts(location: string): Promise<{
    success: boolean;
    alerts?: Array<{
      event: string;
      sender: string;
      start: string;
      end: string;
      description: string;
    }>;
    error?: string;
  }> {
    if (!this.openWeatherMapApiKey) {
      return { success: false, error: 'OpenWeatherMap API key not configured' };
    }

    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/onecall`;
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct`;

      const geoResponse = await axios.get(geoUrl, {
        params: {
          q: location,
          limit: 1,
          appid: this.openWeatherMapApiKey,
        },
      });

      const { lat, lon } = geoResponse.data[0];

      const response = await axios.get(weatherUrl, {
        params: {
          lat,
          lon,
          appid: this.openWeatherMapApiKey,
          exclude: 'minutely,hourly,daily',
        },
      });

      const alerts =
        response.data.alerts?.map((alert: any) => ({
          event: alert.event,
          sender: alert.sender_name,
          start: new Date(alert.start * 1000).toISOString(),
          end: new Date(alert.end * 1000).toISOString(),
          description: alert.description,
        })) || [];

      return { success: true, alerts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private groupByDay(list: any[]): any[] {
    const days: Record<string, any> = {};

    for (const item of list) {
      const date = item.dt_txt.split(' ')[0];
      if (!days[date]) {
        days[date] = { temps: [], descriptions: [], icons: [] };
      }
      days[date].temps.push(item.main.temp);
      days[date].descriptions.push(item.weather[0].description);
      days[date].icons.push(item.weather[0].icon);
    }

    return Object.entries(days).map(([date, data]: [string, any]) => ({
      date,
      tempMin: Math.min(...data.temps),
      tempMax: Math.max(...data.temps),
      description: data.descriptions[Math.floor(data.descriptions.length / 2)],
      icon: data.icons[Math.floor(data.icons.length / 2)],
    }));
  }
}

export const weatherTool = new WeatherTool();

export default weatherTool;
