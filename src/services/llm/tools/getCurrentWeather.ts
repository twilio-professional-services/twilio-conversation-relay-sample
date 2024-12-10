export interface WeatherParams {
  location: string;
}

export async function getCurrentWeather(params: WeatherParams): Promise<string> {
  // You can implement actual weather API call here
  return JSON.stringify({
    location: params.location,
    temperature: '72°F',
    condition: 'Sunny',
  });
}