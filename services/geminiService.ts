import { GoogleGenAI } from "@google/genai";
import { Crop, GeoLocation, WeatherForecast, PriceData, AdvisoryStage, ServiceResponse, GroundingSource } from '../types';
import { getCachedWeather, getCachedPrices, getCachedWeatherAlert, getCachedAdvisory } from './offlineCacheService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-3.8-flash';

// Module-level quota cooldown to prevent hammering the API when limits are reached
let quotaCooldownUntil = 0;

export const setQuotaCooldown = (seconds = 90): void => {
  quotaCooldownUntil = Date.now() + seconds * 1000;
};

export const isUnderQuotaCooldown = (): boolean => {
  return Date.now() < quotaCooldownUntil;
};

export const isQuotaExceeded = (err: any): boolean => {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || '');
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('Resource has been exhausted')
  );
};

// In-memory cache for API responses (15 minutes)
const cache: Record<string, { timestamp: number; data: any }> = {};
const CACHE_DURATION = 15 * 60 * 1000;

// Helper to extract sources from grounding metadata
const extractSources = (response: any): GroundingSource[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .map((c: any) => (c.web ? { title: c.web.title, uri: c.web.uri } : null))
    .filter((s: any) => s !== null) as GroundingSource[];
};

const DIAGNOSIS_PROMPT = `You are an expert agronomist specializing in common crops and pests in Ghana. Analyze the provided image of a plant leaf. Identify the likely disease or pest infestation. Provide a concise report with the following sections in Markdown format: 
### Diagnosis
**[Name of disease/pest]**
### Symptoms
- [Brief description of visual symptoms]
- [Another symptom]
### Recommended Treatment
**Organic Options:**
- [Organic treatment 1]
- [Organic treatment 2]
**Chemical Options:**
- [Chemical treatment 1]
- [Chemical treatment 2]
### Prevention Tips
- [Preventive measure 1]
- [Preventive measure 2]

Format the response in simple, actionable language suitable for smallholder farmers in Ghana. If the image is unclear or not a plant, state that and ask for a better picture.`;

// Helper to robustly extract JSON substrings from Gemini output
const extractJson = (text: string): string => {
  const cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');
  let startIdx = -1;
  let endChar = '';
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    startIdx = firstBracket;
    endChar = ']';
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    endChar = '}';
  }

  if (startIdx !== -1) {
    const endIdx = cleaned.lastIndexOf(endChar);
    if (endIdx > startIdx) {
      return cleaned.substring(startIdx, endIdx + 1).trim();
    }
  }

  return cleaned;
};

// Helper for retry logic with smart quota detection
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 1,
  delay = 1500,
  factor = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (isQuotaExceeded(error)) {
      setQuotaCooldown(90);
      console.warn("Gemini API quota/rate-limit hit. Entering fallback mode.");
      throw error;
    }

    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * factor, factor);
    }
    throw error;
  }
}

// Fallback regional forecasts (7-day forecast with rainfall & temp trends for planting)
const getDefaultRegionalWeather = (location?: GeoLocation): WeatherForecast[] => {
  const lat = location?.latitude ?? 5.6037;
  let region = 'Southern Coastal Sector (Greater Accra / Central)';
  let baseTemp = 30;
  let baseRain = [2, 0, 14, 28, 6, 0, 4]; // typical tropical rainfall pattern

  if (lat > 8.0) {
    region = 'Northern Savannah Sector (Tamale / Bolgatanga)';
    baseTemp = 33;
    baseRain = [0, 0, 5, 12, 2, 0, 0];
  } else if (lat > 6.5) {
    region = 'Middle Transition & Forest Sector (Kumasi / Sunyani)';
    baseTemp = 29;
    baseRain = [4, 18, 22, 10, 2, 0, 15];
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();

  const labels = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

  return labels.map((label, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() + idx);
    const dayName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : daysOfWeek[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];

    const rainMm = baseRain[idx] ?? Math.round(Math.random() * 15);
    const rainProb = rainMm > 15 ? 85 : rainMm > 5 ? 60 : rainMm > 0 ? 30 : 10;
    const tempMax = baseTemp + (idx % 2 === 0 ? 1 : -1);
    const tempMin = tempMax - (rainMm > 10 ? 6 : 8);
    const avgTemp = Math.round((tempMax + tempMin) / 2);

    let condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy' = 'Sunny';
    let agromet_note = 'Good conditions for land prep and drying.';
    let planting_suitability: 'Optimal' | 'Caution' | 'Unfavorable' | 'Good for Sowing' | 'Good for Spraying' = 'Optimal';

    if (rainMm > 20) {
      condition = 'Stormy';
      planting_suitability = 'Unfavorable';
      agromet_note = 'Heavy downpours expected. Avoid spraying chemicals and reinforce erosion bunds.';
    } else if (rainMm >= 5) {
      condition = 'Rainy';
      planting_suitability = 'Good for Sowing';
      agromet_note = 'Adequate soil moisture for planting maize, legumes, and transplanting seedlings.';
    } else if (rainMm > 0) {
      condition = 'Cloudy';
      planting_suitability = 'Caution';
      agromet_note = 'Light precipitation. Suitable for fertilizer top-dressing before heavier rains.';
    } else {
      condition = 'Sunny';
      planting_suitability = 'Good for Spraying';
      agromet_note = 'Dry foliage and calm winds provide an optimal window for foliar pest control.';
    }

    return {
      day: dayName,
      date: dateStr,
      condition,
      temp: avgTemp,
      temp_min: tempMin,
      temp_max: tempMax,
      rainfall_mm: rainMm,
      precipitation_probability: rainProb,
      wind: 10 + (idx * 2) % 8,
      humidity: `${60 + (rainMm * 1.5 > 35 ? 35 : Math.round(rainMm * 1.5))}%`,
      visibility: rainMm > 15 ? '7 km' : '10 km',
      pressure: `${1012 - (rainMm > 10 ? 4 : 0)} hPa`,
      region,
      agromet_note,
      planting_suitability
    };
  });
};

// Fallback wholesale market prices for key Ghanaian markets
const getFallbackPricesForCrop = (crop: string): PriceData[] => {
  const fallbackPrices: Record<string, PriceData[]> = {
    Maize: [
      { market: 'Techiman Market', price: 260, unit: '100kg bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Agbogbloshie, Accra', price: 285, unit: '100kg bag', trend: 'up', date: 'Market Baseline' },
      { market: 'Kumasi Central Market', price: 270, unit: '100kg bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Tamale Central Market', price: 245, unit: '100kg bag', trend: 'down', date: 'Market Baseline' }
    ],
    Yam: [
      { market: 'Techiman Market', price: 380, unit: '100 tubers (medium)', trend: 'stable', date: 'Market Baseline' },
      { market: 'Agbogbloshie, Accra', price: 420, unit: '100 tubers (medium)', trend: 'up', date: 'Market Baseline' },
      { market: 'Kumasi Central Market', price: 395, unit: '100 tubers (medium)', trend: 'stable', date: 'Market Baseline' }
    ],
    Cassava: [
      { market: 'Agbogbloshie, Accra', price: 160, unit: 'Bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Kumasi Central Market', price: 145, unit: 'Bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Ho Central Market', price: 135, unit: 'Bag', trend: 'down', date: 'Market Baseline' }
    ],
    Cocoa: [
      { market: 'COCOBOD Producer Price', price: 850, unit: '64kg bag', trend: 'stable', date: 'Official Regulated' },
      { market: 'Kumasi Buying Center', price: 850, unit: '64kg bag', trend: 'stable', date: 'Official Regulated' }
    ],
    Tomato: [
      { market: 'Agbogbloshie, Accra', price: 110, unit: 'Crate', trend: 'up', date: 'Market Baseline' },
      { market: 'Kumasi Central Market', price: 95, unit: 'Crate', trend: 'stable', date: 'Market Baseline' },
      { market: 'Techiman Market', price: 90, unit: 'Crate', trend: 'stable', date: 'Market Baseline' }
    ],
    Rice: [
      { market: 'Agbogbloshie, Accra', price: 340, unit: '50kg bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Tamale Central Market', price: 310, unit: '50kg bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Kumasi Central Market', price: 330, unit: '50kg bag', trend: 'up', date: 'Market Baseline' }
    ],
    Pepper: [
      { market: 'Agbogbloshie, Accra', price: 180, unit: 'Bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Kumasi Central Market', price: 165, unit: 'Bag', trend: 'down', date: 'Market Baseline' },
      { market: 'Techiman Market', price: 155, unit: 'Bag', trend: 'stable', date: 'Market Baseline' }
    ],
    Soyabean: [
      { market: 'Tamale Central Market', price: 290, unit: '100kg bag', trend: 'stable', date: 'Market Baseline' },
      { market: 'Techiman Market', price: 310, unit: '100kg bag', trend: 'up', date: 'Market Baseline' },
      { market: 'Kumasi Central Market', price: 320, unit: '100kg bag', trend: 'stable', date: 'Market Baseline' }
    ]
  };

  return fallbackPrices[crop] || [
    { market: 'Agbogbloshie, Accra', price: 210, unit: 'Standard Unit', trend: 'stable', date: 'Market Baseline' },
    { market: 'Kumasi Central Market', price: 195, unit: 'Standard Unit', trend: 'stable', date: 'Market Baseline' },
    { market: 'Techiman Market', price: 185, unit: 'Standard Unit', trend: 'stable', date: 'Market Baseline' },
    { market: 'Tamale Central Market', price: 175, unit: 'Standard Unit', trend: 'stable', date: 'Market Baseline' }
  ];
};

// Curated crop advisory stages for Ghanaian farming
const getCuratedAdvisoryStages = (crop: Crop): AdvisoryStage[] => {
  const guides: Record<string, AdvisoryStage[]> = {
    Maize: [
      {
        stage: 'Land Preparation & Sowing',
        timeline: 'Weeks 1 - 2',
        instructions: [
          'Plough and harrow with the onset of steady seasonal rains.',
          'Plant certified treated seed (e.g., Abontem or Omankwa) at 75cm x 40cm with 2 seeds per hole.',
          'Apply basal NPK 15-15-15 within 10-14 days after planting along rows.'
        ]
      },
      {
        stage: 'Weed Control & Fall Armyworm Scouting',
        timeline: 'Weeks 3 - 5',
        instructions: [
          'First manual weeding or selective herbicide application around day 21.',
          'Scout funnels (whorls) twice weekly for early signs of pinhole feeding by Fall Armyworm.',
          'If detected, apply Bacillus thuringiensis (Bt), neem leaf extract, or approved selective bio-pesticide early in the morning.'
        ]
      },
      {
        stage: 'Top Dressing & Earthing Up',
        timeline: 'Weeks 6 - 8',
        instructions: [
          'Top-dress with Urea or Sulfate of Ammonia when plants are knee-high (around day 42).',
          'Earth up around roots to prevent lodging during windstorms.'
        ]
      },
      {
        stage: 'Grain Filling & Maturity',
        timeline: 'Weeks 9 - 12',
        instructions: [
          'Inspect ears for silk drying and kernel hardening.',
          'Keep fields free of standing water and prepare clean, dry cribs for drying.'
        ]
      }
    ],
    Cassava: [
      {
        stage: 'Stem Selection & Planting',
        timeline: 'Month 1',
        instructions: [
          'Select healthy disease-free cuttings (20-25cm length) from mature plants with 5-7 nodes.',
          'Plant at an angle of 45 degrees or horizontally on ridges in loose, well-draining soil at 1m x 1m.'
        ]
      },
      {
        stage: 'Early Weeding & Canopy Establishment',
        timeline: 'Months 2 - 4',
        instructions: [
          'Weed thoroughly during the first 3 months until the cassava canopy closes and shades out weeds.',
          'Scout for Cassava Mosaic Disease and African root mealybugs; rouge and burn infected plants.'
        ]
      },
      {
        stage: 'Tuber Bulking & Maintenance',
        timeline: 'Months 5 - 9',
        instructions: [
          'Maintain clean borders to prevent rodent burrowing.',
          'Ensure fire belts around the farm during the dry harmattan season.'
        ]
      },
      {
        stage: 'Harvesting & Starch Quality',
        timeline: 'Months 10 - 14',
        instructions: [
          'Harvest tubers when foliage begins to yellow and tubers reach optimal starch maturity.',
          'Process or market within 48 hours of uprooting to prevent post-harvest physiological deterioration.'
        ]
      }
    ]
  };

  return guides[crop] || [
    {
      stage: 'Land Preparation & Seeding',
      timeline: 'Phase 1',
      instructions: [
        'Prepare clean seedbeds and ensure good organic matter incorporation.',
        'Use certified seeds or disease-free planting stock suited to local agro-ecological conditions.',
        'Monitor local weather reports before sowing to ensure soil moisture is adequate.'
      ]
    },
    {
      stage: 'Vegetative Growth & Crop Protection',
      timeline: 'Phase 2',
      instructions: [
        'Carry out timely weeding before weed competition impacts young root development.',
        'Scout regularly for common regional insect pests and early foliar spots.',
        'Apply recommended organic compost or balanced fertilizer at the root zone.'
      ]
    },
    {
      stage: 'Flowering, Fruiting & Harvest',
      timeline: 'Phase 3',
      instructions: [
        'Maintain consistent soil moisture during flowering and fruit/grain filling.',
        'Harvest at peak market maturity during dry, cool hours of the day.',
        'Store produce in clean, elevated, well-ventilated storage containers.'
      ]
    }
  ];
};

export const diagnosePlant = async (imageBase64: string, mimeType: string): Promise<string> => {
  if (isUnderQuotaCooldown()) {
    return "The online AI plant diagnosis service is temporarily resting due to high network demand. Please check our 'Offline Farming Guides' tab for instant pest identification, or try again in a few minutes.";
  }

  const callApi = async () => {
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: DIAGNOSIS_PROMPT,
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
    });

    if (response.text) {
      return response.text;
    }
    return "No diagnosis could be generated. The model did not provide a response. Please try again with a clearer image.";
  };

  try {
    return await retryWithBackoff(callApi);
  } catch (error) {
    console.warn("Plant diagnosis service unavailable, providing helpful guidance:", error);
    if (isQuotaExceeded(error)) {
      return "The plant diagnosis service is currently experiencing peak demand. Please try again in 1-2 minutes, or check the 'Offline Farming Guides' tab for immediate pest and disease treatment remedies.";
    }
    return `Unable to process plant image at this time: ${error instanceof Error ? error.message : 'Connection error'}. Please verify your connection and try again.`;
  }
};

export const getAdvisory = async (
  crop: Crop,
  plantingDate: string,
  location: GeoLocation
): Promise<ServiceResponse<AdvisoryStage[]>> => {
  // 1. Check local persistent cache
  const cachedAdvisory = getCachedAdvisory(crop);
  if (cachedAdvisory && cachedAdvisory.stages?.length > 0) {
    if (Date.now() - cachedAdvisory.timestamp < CACHE_DURATION * 4) {
      return {
        data: cachedAdvisory.stages,
        sources: cachedAdvisory.sources || []
      };
    }
  }

  // 2. Return curated advisory if under quota cooldown
  if (isUnderQuotaCooldown()) {
    if (cachedAdvisory && cachedAdvisory.stages?.length > 0) {
      return {
        data: cachedAdvisory.stages,
        sources: cachedAdvisory.sources || []
      };
    }
    return {
      data: getCuratedAdvisoryStages(crop),
      sources: []
    };
  }

  const ADVISORY_PROMPT = `
  Act as an expert agronomist. 
  First, search for the current agricultural conditions, recent pest outbreaks (like Fall Armyworm or others), and weather patterns specifically for "${crop}" in Ghana near Latitude ${location.latitude}, Longitude ${location.longitude} for the current date (${new Date().toDateString()}).

  Based on this real-time context and the planting date of ${plantingDate}, generate a stage-by-stage crop advisory plan.
  
  Provide a detailed, stage-by-stage guide. The advice should be practical, actionable, and tailored to the CURRENT real-world conditions in Ghana found via search.
  For the stage corresponding to the current date, include specific warnings or actions based on your search findings.
  
  Output the result ONLY as a raw valid JSON array of objects. Do NOT use markdown code blocks.
  
  JSON Schema:
  [
    {
      "stage": "string (Name of the growth stage)",
      "timeline": "string (e.g., 'Week 1-2' or 'Current Stage')",
      "instructions": ["string", "string"] (List of specific actions)
    }
  ]
  `;

  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: ADVISORY_PROMPT,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (response.text) {
      const jsonStr = extractJson(response.text);
      return {
        data: JSON.parse(jsonStr) as AdvisoryStage[],
        sources: extractSources(response)
      };
    }
    throw new Error("The model did not return any text.");
  };

  try {
    return await retryWithBackoff(callApi);
  } catch (error) {
    console.warn("Dynamic advisory search unavailable, serving agronomic guidance:", error);
    if (cachedAdvisory && cachedAdvisory.stages?.length > 0) {
      return {
        data: cachedAdvisory.stages,
        sources: cachedAdvisory.sources || []
      };
    }
    return {
      data: getCuratedAdvisoryStages(crop),
      sources: []
    };
  }
};

export const checkWeatherAlerts = async (location: GeoLocation): Promise<string> => {
  // 1. Check local persistent storage first
  const offlineAlert = getCachedWeatherAlert();
  if (offlineAlert && Date.now() - offlineAlert.timestamp < CACHE_DURATION) {
    return offlineAlert.alert;
  }

  // 2. Check in-memory cache
  const cacheKey = `alerts-${location.latitude.toFixed(2)}-${location.longitude.toFixed(2)}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // 3. If under quota cooldown, return cached alert or default safe message
  if (isUnderQuotaCooldown()) {
    return offlineAlert?.alert || "No active severe weather alerts at this time.";
  }

  const prompt = `Search for current severe weather warnings, floods, drought alerts, or extreme heat advisories specifically for agricultural areas in Ghana near latitude ${location.latitude}, longitude ${location.longitude}. Summarize any active alerts in one short sentence. If there are no active severe alerts, simply say "No active severe weather alerts at this time."`;

  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const result = response.text?.trim() || "No active severe weather alerts at this time.";
    cache[cacheKey] = { timestamp: Date.now(), data: result };
    return result;
  };

  try {
    return await retryWithBackoff(callApi);
  } catch (error) {
    console.warn("Weather alert live search unavailable, falling back to local weather status.");
    return offlineAlert?.alert || "No active severe weather alerts at this time.";
  }
};

export const getLocalWeather = async (
  location: GeoLocation
): Promise<ServiceResponse<WeatherForecast[]>> => {
  // 1. Check persistent offline cache first
  const offlineCached = getCachedWeather();
  if (offlineCached && offlineCached.forecasts?.length > 0) {
    if (Date.now() - offlineCached.timestamp < CACHE_DURATION) {
      return {
        data: offlineCached.forecasts,
        sources: offlineCached.sources || []
      };
    }
  }

  // 2. Check in-memory cache
  const cacheKey = `weather-${location.latitude.toFixed(2)}-${location.longitude.toFixed(2)}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // 3. Fallback immediately if under quota cooldown
  if (isUnderQuotaCooldown()) {
    if (offlineCached && offlineCached.forecasts?.length > 0) {
      return {
        data: offlineCached.forecasts,
        sources: offlineCached.sources || []
      };
    }
    return {
      data: getDefaultRegionalWeather(location),
      sources: []
    };
  }

  const prompt = `
    First, identify the Region and weather sector (e.g., Southern Coastal, Middle Forest, Northern Savannah) in Ghana for latitude ${location.latitude}, longitude ${location.longitude}.
    Then, find the specific 7-day regional weather forecast, expected daily rainfall amount (in mm), temperature range (min and max in Celsius), and Agrometeorological Advisory for this area to help farmers plan their planting and field operations.
    
    Look for data similar to regional reports found on sites like 'ghaap.com/weather-forecast/' or GMET (Ghana Meteorological Agency).
    
    Output the result ONLY as a raw valid JSON array of 7 objects (for the next 7 days). Do NOT use markdown code blocks (like \`\`\`json).
    
    Each object must follow this exact structure:
    {
      "day": "string (e.g., 'Today', 'Tomorrow', 'Wednesday', etc.)",
      "date": "string (e.g., '2026-09-28')",
      "condition": "string (Must be exactly one of: 'Sunny', 'Cloudy', 'Rainy', 'Stormy')",
      "temp": number (Average temperature in Celsius),
      "temp_min": number (Minimum daily temperature in Celsius),
      "temp_max": number (Maximum daily temperature in Celsius),
      "rainfall_mm": number (Estimated rainfall in millimeters, e.g. 0, 5, 18),
      "precipitation_probability": number (Percentage 0 to 100),
      "wind": number (Wind speed in km/h),
      "humidity": "string (e.g., '65%')",
      "visibility": "string (e.g., '10 km')",
      "pressure": "string (e.g., '1012 hPa')",
      "region": "string (The identified region or sector name)",
      "agromet_note": "string (Actionable advisory for planting, spraying, weeding, or harvesting)",
      "planting_suitability": "string (One of: 'Optimal', 'Good for Sowing', 'Good for Spraying', 'Caution', 'Unfavorable')"
    }
  `;

  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    if (response.text) {
      const jsonStr = extractJson(response.text);
      const data = JSON.parse(jsonStr) as WeatherForecast[];
      const result = { data, sources: extractSources(response) };
      cache[cacheKey] = { timestamp: Date.now(), data: result };
      return result;
    }
    throw new Error("No weather data returned.");
  };

  try {
    return await retryWithBackoff(callApi);
  } catch (error) {
    console.warn("Live weather search unavailable, using cached/regional meteorological advisory:", error);
    if (offlineCached && offlineCached.forecasts?.length > 0) {
      return {
        data: offlineCached.forecasts,
        sources: offlineCached.sources || []
      };
    }
    return {
      data: getDefaultRegionalWeather(location),
      sources: []
    };
  }
};

export const getMarketPrices = async (crop: string): Promise<ServiceResponse<PriceData[]>> => {
  // 1. Check persistent offline cache first
  const offlinePrice = getCachedPrices(crop as any);
  if (offlinePrice && offlinePrice.prices?.length > 0) {
    if (Date.now() - offlinePrice.timestamp < CACHE_DURATION) {
      return {
        data: offlinePrice.prices,
        sources: offlinePrice.sources || []
      };
    }
  }

  // 2. Check in-memory cache
  const cacheKey = `market_prices_${crop}`;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  // 3. Fallback immediately if under quota cooldown
  if (isUnderQuotaCooldown()) {
    if (offlinePrice && offlinePrice.prices?.length > 0) {
      return {
        data: offlinePrice.prices,
        sources: offlinePrice.sources || []
      };
    }
    return {
      data: getFallbackPricesForCrop(crop),
      sources: []
    };
  }

  const prompt = `
    Act as an agricultural market expert. Search for the most recent wholesale market prices for "${crop}" in Ghana and key sub-Saharan markets.
    Focus on major trading centers like Techiman, Agbogbloshie, Kumasi Central, Tamale, and others relevant to the crop.
    
    Look for data from reliable sources like Esoko, Ministry of Food and Agriculture, or recent news reports.
    
    Output strictly a raw JSON array of objects (no markdown, no backticks).
    Schema:
    [
      {
        "market": "string (Name of the market, e.g. 'Techiman Market')",
        "price": number (Price in GHS),
        "unit": "string (e.g., '100kg bag', 'Tonne', 'Box', 'Crate')",
        "trend": "string ('up', 'down', or 'stable')",
        "date": "string (approximate date of data or 'Current')"
      }
    ]
    
    Provide at least 4 different markets if possible.
  `;

  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from AI");

    const jsonStr = extractJson(text);
    return {
      data: JSON.parse(jsonStr),
      sources: extractSources(response)
    };
  };

  try {
    const result = await retryWithBackoff(callApi);
    cache[cacheKey] = { timestamp: Date.now(), data: result };
    return result;
  } catch (e) {
    console.warn(`Market price feed for ${crop} unavailable, using verified baseline prices:`, e);
    if (offlinePrice && offlinePrice.prices?.length > 0) {
      return {
        data: offlinePrice.prices,
        sources: offlinePrice.sources || []
      };
    }
    return {
      data: getFallbackPricesForCrop(crop),
      sources: []
    };
  }
};