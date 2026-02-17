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
export declare class WeatherTool {
    private openWeatherMapApiKey?;
    constructor(options?: {
        openWeatherMapApiKey?: string;
    });
    getCurrentWeather(options: WeatherOptions): Promise<WeatherResult>;
    getForecast(location: string, days?: number): Promise<WeatherResult>;
    getWeatherAlerts(location: string): Promise<{
        success: boolean;
        alerts?: Array<{
            event: string;
            sender: string;
            start: string;
            end: string;
            description: string;
        }>;
        error?: string;
    }>;
    private groupByDay;
}
export declare const weatherTool: WeatherTool;
export default weatherTool;
//# sourceMappingURL=weather.d.ts.map