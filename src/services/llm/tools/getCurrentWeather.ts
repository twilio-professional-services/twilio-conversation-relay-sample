import { z } from "zod";
import { tool } from "@langchain/core/tools";

interface WeatherParams {
  location: string;
}

export const getCurrentWeatherTool = tool(
  async ({ location }: WeatherParams) => {
    // You can implement actual weather API call here
    return JSON.stringify({
      location: location,
      temperature: "72°F",
      condition: "Sunny",
    });
  },
  {
    name: "get_current_weather",
    description: "Get the current weather for a specific location.",
    schema: z.object({
      location: z.string().min(2).max(100),
    }) as any,
  }
);
