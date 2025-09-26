import { GoogleGenAI, Type } from "@google/genai";
import type { DestinationSuggestion, TravelPlan, ItineraryStyle, CostBreakdown, DailyPlan, ItineraryLocation, PackingListCategory, CurrencyInfo } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Persistent Caching Mechanism ---
const CACHE_PREFIX = 'shawshank-travel-cache:';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getFromCache<T>(key: string): T | null {
  const cacheKey = CACHE_PREFIX + key;
  try {
    const rawEntry = localStorage.getItem(cacheKey);
    if (!rawEntry) {
      console.log(`[Cache] MISS for key: ${key}`);
      return null;
    }

    const entry = JSON.parse(rawEntry) as CacheEntry<T>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      console.log(`[Cache] STALE for key: ${key}`);
      localStorage.removeItem(cacheKey);
      return null;
    }

    console.log(`[Cache] HIT for key: ${key}`);
    return entry.data;
  } catch (error) {
    console.error("Cache read error:", error);
    // If there's a parsing error, remove the corrupted key
    localStorage.removeItem(cacheKey);
    return null;
  }
}

function setInCache<T>(key: string, data: T): void {
  const cacheKey = CACHE_PREFIX + key;
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log(`[Cache] SET for key: ${key}`);
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

function cleanupExpiredCache() {
  console.log('[Cache] Running cleanup...');
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const rawEntry = localStorage.getItem(key);
        if (rawEntry) {
          try {
            const entry = JSON.parse(rawEntry) as CacheEntry<any>;
            if (!entry.timestamp || Date.now() - entry.timestamp > CACHE_TTL_MS) {
              keysToRemove.push(key);
            }
          } catch {
            // Invalid JSON, mark for removal
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(key => {
        console.log(`[Cache] CLEANUP: Removing stale key ${key}`);
        localStorage.removeItem(key);
    });
  } catch (error) {
    console.error("Cache cleanup error:", error);
  }
}

// Run cleanup once on script load
cleanupExpiredCache();
// --- End Caching Mechanism ---

/**
 * Parses errors from the Gemini API to return user-friendly messages.
 * @param error The error object caught.
 * @param context A string describing the action that failed (e.g., "generating travel suggestions").
 * @returns A user-friendly error string.
 */
function parseApiError(error: unknown, context: string): string {
  console.error(`Error ${context}:`, error);

  if (error instanceof Error) {
    const message = error.message;
    // Check for specific keywords related to quota/rate limiting
    if (message.includes('429') || /quota|rate limit|resource exhausted/i.test(message)) {
      return "API quota exceeded. Please check your Google AI Studio plan and billing details, then try again later.";
    }
  }
  // Generic fallback for other errors
  return `Failed to ${context.replace(/ing$/i, 'e')}. Please check your connection and try again.`;
}


// --- Response Schemas ---

const currencyInfoSchema = {
  type: Type.OBJECT,
  properties: {
    code: { type: Type.STRING, description: "The 3-letter currency code, e.g., EUR" },
    symbol: { type: Type.STRING, description: "The currency symbol, e.g., €" },
    usdToLocalRate: { type: Type.NUMBER, description: "Approximate conversion rate from 1 USD to the local currency." },
    usdToInrRate: { type: Type.NUMBER, description: "Approximate conversion rate from 1 USD to Indian Rupees (INR)." },
  },
  required: ['code', 'symbol', 'usdToLocalRate', 'usdToInrRate'],
};

const costBreakdownSchema = {
  type: Type.OBJECT,
  properties: {
    accommodation: { type: Type.NUMBER, description: 'Estimated cost for accommodation in USD.' },
    food: { type: Type.NUMBER, description: 'Estimated cost for food in USD.' },
    activities: { type: Type.NUMBER, description: 'Estimated cost for activities in USD.' },
  },
  required: ['accommodation', 'food', 'activities'],
};

const directCountryInfoSchema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "A short, compelling description of the country as a travel destination (2-3 sentences)." },
    visaInfo: { type: Type.STRING, description: "A summary of visa requirements for Indian citizens, mentioning e-visa or visa on arrival availability." },
    averageCost: { type: Type.NUMBER, description: "An estimated total average cost in USD for a solo traveler for a 7-day trip." },
    costBreakdown: costBreakdownSchema,
    currencyInfo: currencyInfoSchema,
  },
  required: ['description', 'visaInfo', 'averageCost', 'costBreakdown', 'currencyInfo'],
};

const destinationSuggestionSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The name of the country suggested." },
    country: { type: Type.STRING, description: "The formal name of the country." },
    description: { type: Type.STRING, description: "A short, compelling description of the country as a travel destination (2-3 sentences)." },
    visaInfo: { type: Type.STRING, description: "A summary of visa requirements for Indian citizens, mentioning e-visa/visa on arrival availability." },
    averageCost: { type: Type.NUMBER, description: "An estimated total average cost in USD for a solo traveler for a 7-day trip." },
    costBreakdown: costBreakdownSchema,
    currencyInfo: currencyInfoSchema,
  },
  required: ['name', 'country', 'description', 'visaInfo', 'averageCost', 'costBreakdown', 'currencyInfo'],
};

const travelSuggestionsSchema = {
  type: Type.ARRAY,
  items: destinationSuggestionSchema,
};

const itineraryLinkSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    url: { type: Type.STRING },
  },
  required: ['title', 'url'],
};

const itineraryLocationSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    city: { type: Type.STRING },
    type: { type: Type.STRING, enum: ['Touristy', 'Off-beat'] },
    links: { type: Type.ARRAY, items: itineraryLinkSchema },
    averageCost: { type: Type.NUMBER },
    costBreakdown: costBreakdownSchema,
    lat: { type: Type.NUMBER },
    lng: { type: Type.NUMBER },
    duration: { type: Type.STRING, description: "e.g., '2-3 hours'" },
    visitingTip: { type: Type.STRING, description: "A concise, actionable tip for visiting this location, e.g., 'Book tickets online in advance' or 'Visit early to avoid crowds'." },
  },
  required: ['name', 'description', 'city', 'type', 'links', 'averageCost', 'costBreakdown', 'lat', 'lng'],
};

const transportOptionSchema = {
  type: Type.OBJECT,
  properties: {
    mode: { type: Type.STRING, description: "e.g., Train, Bus, Flight" },
    duration: { type: Type.STRING, description: "e.g., '4 hours'" },
    cost: { type: Type.NUMBER, description: "Estimated cost in USD" },
    description: { type: Type.STRING, description: "Brief description of the option" },
  },
  required: ['mode', 'duration', 'cost'],
};

const travelInfoSchema = {
  type: Type.OBJECT,
  properties: {
    fromCity: { type: Type.STRING },
    toCity: { type: Type.STRING },
    options: { type: Type.ARRAY, items: transportOptionSchema },
  },
  required: ['fromCity', 'toCity', 'options'],
};

const keepInMindItemSchema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ['do', 'dont', 'warning', 'info'] },
    tip: { type: Type.STRING },
  },
  required: ['type', 'tip'],
};

const dailyPlanSchema = {
  type: Type.OBJECT,
  properties: {
    day: { type: Type.INTEGER },
    title: { type: Type.STRING, description: "A catchy title for the day's plan" },
    activities: { type: Type.ARRAY, items: itineraryLocationSchema },
    keepInMind: { type: Type.ARRAY, items: keepInMindItemSchema },
    travelInfo: {
      type: Type.ARRAY,
      items: travelInfoSchema,
      description: "Travel information for the day. For inter-city travel, this will have one entry. For day trips, this MUST have two entries: one for the journey to the destination and one for the return journey."
    },
    weatherForecast: { type: Type.STRING, description: "A brief, general weather forecast for the city on this day, considering the time of year. e.g., 'Sunny with highs around 25°C.'" },
  },
  required: ['day', 'title', 'activities', 'keepInMind'],
};

const officialLinkSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    url: { type: Type.STRING },
  },
  required: ['title', 'url'],
};

const cityAccommodationCostSchema = {
  type: Type.OBJECT,
  properties: {
    city: { type: Type.STRING },
    estimatedCost: { type: Type.NUMBER, description: "Total estimated cost for all nights in this city" },
    nights: { type: Type.INTEGER, description: "Number of nights to stay in this city" },
  },
  required: ['city', 'estimatedCost', 'nights'],
};

const travelPlanSchema = {
  type: Type.OBJECT,
  properties: {
    itinerary: { type: Type.ARRAY, items: dailyPlanSchema },
    optimizationSuggestions: { type: Type.STRING, description: "Suggestions to optimize the travel plan, like reordering cities or activities." },
    officialLinks: { type: Type.ARRAY, items: officialLinkSchema, description: "Links to official tourism websites, visa portals, etc." },
    cityAccommodationCosts: { type: Type.ARRAY, items: cityAccommodationCostSchema, description: "Estimated accommodation costs per city for the trip." },
  },
  required: ['itinerary', 'optimizationSuggestions', 'officialLinks', 'cityAccommodationCosts'],
};

const packingListCategorySchema = {
  type: Type.OBJECT,
  properties: {
    categoryName: { type: Type.STRING },
    items: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['categoryName', 'items'],
};

const packingListSchema = {
    type: Type.ARRAY,
    items: packingListCategorySchema,
};

// --- API Functions ---

export async function getDirectCountryInfo(countryName: string): Promise<{ description: string; visaInfo: string; averageCost: number; costBreakdown: CostBreakdown; currencyInfo: CurrencyInfo; }> {
  const cacheKey = `country-info-v2:${countryName.trim().toLowerCase()}`;
  const cachedData = getFromCache<{ description: string; visaInfo: string; averageCost: number; costBreakdown: CostBreakdown; currencyInfo: CurrencyInfo; }>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert travel agent. For the country "${countryName}", provide:
1. A short, compelling description of why it's a good travel destination (2-3 sentences).
2. A summary of visa requirements for Indian citizens. Specifically mention if an e-visa or visa on arrival is available.
3. An estimated average cost in USD for a solo traveler for a 7-day trip.
4. A simple cost breakdown (Accommodation, Food, Activities) for that 7-day trip, in USD.
5. Currency information: the local 3-letter currency code, the currency symbol, an approximate conversion rate from 1 USD to the local currency, and from 1 USD to Indian Rupees (INR).
Return the data in the specified JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: directCountryInfoSchema,
      },
    });

    const data = JSON.parse(response.text.trim());
    setInCache(cacheKey, data);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, `getting information for ${countryName}`));
  }
}

export async function getTravelSuggestions(budget: string, timeOfYear: string, continent: string): Promise<DestinationSuggestion[]> {
  const cacheKey = `suggestions-v2:${budget}:${timeOfYear}:${continent}`;
  const cachedData = getFromCache<DestinationSuggestion[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert travel agent. Suggest 5-7 diverse countries for a traveler from India with the following preferences:
- Budget: ${budget}
- Time of Year: ${timeOfYear}
- Continent: ${continent}

For each country, provide:
1. The country name.
2. A short, compelling description (2-3 sentences).
3. A summary of visa requirements for Indian citizens (mention e-visa/visa on arrival).
4. An estimated average cost in USD for a solo traveler for a 7-day trip.
5. A simple cost breakdown (Accommodation, Food, Activities) for that 7-day trip, in USD.
6. Currency information: the local 3-letter currency code, the currency symbol, an approximate conversion rate from 1 USD to the local currency, and from 1 USD to Indian Rupees (INR).
Return the data as an array in the specified JSON format. Ensure all fields are filled.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: travelSuggestionsSchema,
      },
    });
    const data = JSON.parse(response.text.trim());
    setInCache(cacheKey, data);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, 'getting travel suggestions'));
  }
}

export async function getOffBeatSuggestions(): Promise<DestinationSuggestion[]> {
  const cacheKey = `suggestions-v2:off-beat`;
  const cachedData = getFromCache<DestinationSuggestion[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a seasoned traveler who loves finding hidden gems. Suggest 5-7 unique, off-the-beaten-path countries that are great for adventurous travelers from India. Avoid overly common tourist destinations.

For each country, provide:
1. The country name.
2. A short, compelling description highlighting its unique appeal (2-3 sentences).
3. A summary of visa requirements for Indian citizens (mention e-visa/visa on arrival).
4. An estimated average cost in USD for a solo traveler for a 7-day trip.
5. A simple cost breakdown (Accommodation, Food, Activities) for that 7-day trip, in USD.
6. Currency information: the local 3-letter currency code, the currency symbol, an approximate conversion rate from 1 USD to the local currency, and from 1 USD to Indian Rupees (INR).
Return the data as an array in the specified JSON format. Ensure all fields are filled.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: travelSuggestionsSchema,
      },
    });
    const data = JSON.parse(response.text.trim());
    setInCache(cacheKey, data);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, 'getting off-beat travel suggestions'));
  }
}

export async function getTravelPlan(destination: string, duration: number, style: ItineraryStyle, notes: string): Promise<TravelPlan> {
  const cacheKey = `plan:${destination}:${duration}:${style}:${notes}`;
  const cachedData = getFromCache<TravelPlan>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const prompt = `Create a detailed ${duration}-day travel itinerary for ${destination}.
Traveler preferences:
- Style: ${style}
- Notes: ${notes || 'None'}

The plan should include:
1.  A day-by-day itinerary. For each day, provide a brief, general 'weatherForecast' for the city based on the time of year. For each activity within the day:
    - Name, city, short description, and whether it's 'Touristy' or 'Off-beat'.
    - Lat/Lng coordinates.
    - Estimated duration (e.g., "2-3 hours").
    - A "visitingTip" which is a Pro Tip for visiting (e.g., "Book online to save time" or "Visit early to avoid crowds").
    - Estimated cost in USD and a breakdown (activities, food) in USD.
    - For each activity, find links by simulating a Google search for the activity's name. Provide up to 3 of the top search results. You MUST exclude Wikipedia links. Prioritize official websites, ticket vendors, and reputable travel guides.
2.  Include "TravelInfo". For days involving a change of accommodation city (e.g., moving from Rome to Florence), this will be an array with a single entry. For day trips (e.g., a trip from Florence to Pisa and back to Florence on the same day), this MUST be an array with two entries: one for the outbound journey and one for the return journey. All costs should be in USD.
3.  For each day, provide 2-3 "Keep In Mind" tips (dos, don'ts, warnings, info).
4.  Provide a list of "OfficialLinks" (e.g., official tourism board, visa info).
5.  Provide estimated "CityAccommodationCosts" in USD for each city visited, including nights and total cost.
6.  A concise "optimizationSuggestions" paragraph on how to best execute the plan.

Return a single JSON object matching the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: travelPlanSchema,
      },
    });
    const data = JSON.parse(response.text.trim());
    setInCache(cacheKey, data);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, `creating a travel plan for ${destination}`));
  }
}

export async function getComprehensiveTravelPlan(destination: string, style: ItineraryStyle, notes: string): Promise<TravelPlan> {
  const cacheKey = `comprehensive-plan:${destination}:${style}:${notes}`;
  const cachedData = getFromCache<TravelPlan>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  const prompt = `Create a comprehensive, full-country tour itinerary for ${destination}. You decide the optimal duration (between 7 and 14 days) to cover the main highlights without rushing.
Traveler preferences:
- Style: ${style}
- Notes: ${notes || 'None'}

The plan must include:
1.  An optimal duration decided by you.
2.  A day-by-day itinerary. For each day, provide a brief, general 'weatherForecast' for the city based on the time of year. For each activity within the day:
    - Name, city, short description, and whether it's 'Touristy' or 'Off-beat'.
    - Lat/Lng coordinates.
    - Estimated duration.
    - A "visitingTip" which is a Pro Tip for visiting (e.g., "Book online to save time" or "Visit early to avoid crowds").
    - Estimated cost in USD and a breakdown.
    - For each activity, find links by simulating a Google search for the activity's name. Provide up to 3 of the top search results. You MUST exclude Wikipedia links. Prioritize official websites, ticket vendors, and reputable travel guides.
3.  "TravelInfo". For days involving a change of accommodation city, this will be an array with a single entry. For day trips, this MUST be an array with two entries: one for the outbound journey and one for the return journey. All costs should be in USD.
4.  Daily "Keep In Mind" tips.
5.  "OfficialLinks".
6.  "CityAccommodationCosts" in USD.
7.  "optimizationSuggestions".

Return a single JSON object matching the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: travelPlanSchema,
      },
    });
    const data = JSON.parse(response.text.trim());
    setInCache(cacheKey, data);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, `creating a comprehensive travel plan for ${destination}`));
  }
}

export async function rebuildTravelPlan(destination: string, duration: number, style: ItineraryStyle, existingPlan: DailyPlan[], refinementNotes: string, deletedActivities: string[]): Promise<TravelPlan> {
  // Caching is intentionally disabled for rebuilds to ensure fresh results based on user feedback.

  let deletedActivitiesPrompt = '';
  if (deletedActivities && deletedActivities.length > 0) {
    const formattedDeletedList = deletedActivities.map(item => `- ${item.replace('|', ' in ')}`).join('\n');
    deletedActivitiesPrompt = `
IMPORTANT EXCLUSION LIST:
The user has previously deleted the following activities. You MUST NOT include these specific activities or any very similar ones in the new plan under any circumstances:
${formattedDeletedList}

If you cannot find enough new, unique activities to suggest after respecting this exclusion list, you MUST clearly state this in the 'optimizationSuggestions' field. For example: "I have included all available relevant activities and there are no more unique suggestions for this destination based on your criteria."
`;
  }
  
  const prompt = `You are a travel agent refining an existing plan.
Destination: ${destination}
Duration: ${duration} days
Style: ${style}

Here is the current plan that the user wants to modify:
${JSON.stringify(existingPlan, null, 2)}

Here are the user's refinement notes:
"${refinementNotes}"

${deletedActivitiesPrompt}

Please modify the plan based on the notes. You can add, remove, or reorder activities, or even change cities if requested. For any new activities you add, ensure you provide all required fields from the schema, including a concise "visitingTip", and find links by simulating a Google search for the activity's name. Provide up to 3 of the top search results. You MUST exclude Wikipedia links. Prioritize official websites, ticket vendors, and reputable travel guides. Ensure the new plan is coherent and still fits the duration. For each day in the updated plan, ensure there is a general 'weatherForecast'. Ensure all costs (activities, travel, accommodation) are in USD.

CRITICAL: You must preserve the 'userNotes' field on each day's plan. If you modify a day, carry its existing 'userNotes' over to the new version unless the user explicitly asks to change the notes. Ensure all travel is correctly represented: for day trips, the 'travelInfo' array for that day must contain two separate entries for the outbound and return journeys. For travel between base cities, it should contain a single entry.

Return the complete, updated travel plan as a single JSON object matching the provided schema. It must include all parts: itinerary, optimizationSuggestions, officialLinks, and cityAccommodationCosts.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: travelPlanSchema,
      },
    });
    const data = JSON.parse(response.text.trim());
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, `rebuilding the travel plan for ${destination}`));
  }
}

export async function getPackingList(destination: string, duration: number, activities: ItineraryLocation[]): Promise<PackingListCategory[]> {
  const activityNames = activities.map(a => a.name).join(', ');
  const cacheKey = `packing-list:${destination}:${duration}:${activityNames}`;
  const cachedData = getFromCache<PackingListCategory[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const prompt = `Create a detailed packing list for a ${duration}-day trip to ${destination}.
The traveler will be doing the following activities: ${activityNames}.
Group the items into logical categories (e.g., 'Clothing', 'Toiletries', 'Documents', 'Electronics', 'Miscellaneous').
Be specific and practical.

Return the packing list as an array of categories in the specified JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: packingListSchema,
      },
    });
    const data = JSON.parse(response.text.trim());
    setInCache(cacheKey, data);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, `generating a packing list for ${destination}`));
  }
}