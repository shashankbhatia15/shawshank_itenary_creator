
import { GoogleGenAI, Type } from "@google/genai";
import type { DestinationSuggestion, TravelPlan, ItineraryStyle, CostBreakdown, DailyPlan, ItineraryLocation, PackingListCategory } from '../types';

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


export async function getDirectCountryInfo(countryName: string): Promise<{ description: string; visaInfo: string; averageCost: number; costBreakdown: CostBreakdown; }> {
  const cacheKey = `country-info:${countryName.trim().toLowerCase()}`;
  const cachedData = getFromCache<{ description: string; visaInfo: string; averageCost: number; costBreakdown: CostBreakdown; }>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert travel agent. For the country "${countryName}", provide:
1. A short, compelling description of why it's a good travel destination (2-3 sentences).
2. A summary of visa requirements for Indian citizens. Specifically mention if an e-visa or visa on arrival is available.
3. An estimated average cost in USD for a solo traveler for a 7-day trip. This should include mid-range (3-4 star) hotels, daily meals, and one tourist activity per day. Provide only a single number for the cost. Also provide a breakdown of this 7-day cost into 'accommodation', 'food', and 'activities'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            visaInfo: { type: Type.STRING, description: "Visa requirements for Indian citizens, including e-visa or visa on arrival details." },
            averageCost: { type: Type.NUMBER, description: "Estimated 7-day cost in USD for a solo traveler."},
            costBreakdown: {
              type: Type.OBJECT,
              description: "Breakdown of the 7-day cost.",
              properties: {
                accommodation: { type: Type.NUMBER, description: "Estimated 7-day accommodation cost in USD." },
                food: { type: Type.NUMBER, description: "Estimated 7-day food cost in USD." },
                activities: { type: Type.NUMBER, description: "Estimated 7-day activities cost in USD." }
              },
              required: ["accommodation", "food", "activities"]
            }
          },
          required: ["description", "visaInfo", "averageCost", "costBreakdown"],
        },
      },
    });
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    setInCache(cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(parseApiError(error, `fetching info for "${countryName}"`));
  }
}


export async function getTravelSuggestions(budget: string, timeOfYear: string, continent: string): Promise<DestinationSuggestion[]> {
  const cacheKey = `suggestions:${budget}:${timeOfYear}:${continent}`;
  const cachedData = getFromCache<DestinationSuggestion[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const continentQuery = continent === 'Any' ? '' : `within ${continent}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert travel agent. Based on a ${budget} budget and traveling during ${timeOfYear}, suggest 7-8 countries to visit ${continentQuery}. For each country, provide:
1. Its name.
2. A short, compelling description (2-3 sentences).
3. A summary of visa requirements for Indian citizens (mention e-visa/visa on arrival).
4. An estimated average cost in USD for a solo traveler for a 7-day trip, including mid-range (3-4 star) hotels, daily meals, and one tourist activity per day. Provide only a single number for the cost. Also provide a breakdown of this 7-day cost into 'accommodation', 'food', and 'activities'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the country." },
              country: { type: Type.STRING, description: "The name of the country." },
              description: { type: Type.STRING },
              visaInfo: { type: Type.STRING, description: "Visa requirements for Indian citizens, including e-visa or visa on arrival details." },
              averageCost: { type: Type.NUMBER, description: "Estimated 7-day cost in USD for a solo traveler."},
              costBreakdown: {
                type: Type.OBJECT,
                description: "Breakdown of the 7-day cost.",
                properties: {
                  accommodation: { type: Type.NUMBER, description: "Estimated 7-day accommodation cost in USD." },
                  food: { type: Type.NUMBER, description: "Estimated 7-day food cost in USD." },
                  activities: { type: Type.NUMBER, description: "Estimated 7-day activities cost in USD." }
                },
                required: ["accommodation", "food", "activities"]
              }
            },
            required: ["name", "country", "description", "visaInfo", "averageCost", "costBreakdown"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    const suggestions: DestinationSuggestion[] = JSON.parse(jsonText);
    setInCache(cacheKey, suggestions);
    return suggestions;

  } catch (error) {
    throw new Error(parseApiError(error, "generating travel suggestions"));
  }
}

export async function getOffBeatSuggestions(): Promise<DestinationSuggestion[]> {
  const cacheKey = `offbeat-suggestions`;
  const cachedData = getFromCache<DestinationSuggestion[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert travel agent specializing in unique, off-the-beaten-path destinations. Suggest 5 countries that are considered safe for tourists but are not typically on mainstream "top 10" travel lists. For each country, provide:
1. Its name.
2. A short, compelling description (2-3 sentences) of why it's a great off-beat destination.
3. A summary of visa requirements for Indian citizens (mention e-visa/visa on arrival).
4. An estimated average cost in USD for a solo traveler for a 7-day trip, including mid-range (3-4 star) hotels, daily meals, and one tourist activity per day. Provide only a single number for the cost. Also provide a breakdown of this 7-day cost into 'accommodation', 'food', and 'activities'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the country." },
              country: { type: Type.STRING, description: "The name of the country." },
              description: { type: Type.STRING },
              visaInfo: { type: Type.STRING, description: "Visa requirements for Indian citizens, including e-visa or visa on arrival details." },
              averageCost: { type: Type.NUMBER, description: "Estimated 7-day cost in USD for a solo traveler."},
              costBreakdown: {
                type: Type.OBJECT,
                description: "Breakdown of the 7-day cost.",
                properties: {
                  accommodation: { type: Type.NUMBER, description: "Estimated 7-day accommodation cost in USD." },
                  food: { type: Type.NUMBER, description: "Estimated 7-day food cost in USD." },
                  activities: { type: Type.NUMBER, description: "Estimated 7-day activities cost in USD." }
                },
                required: ["accommodation", "food", "activities"]
              }
            },
            required: ["name", "country", "description", "visaInfo", "averageCost", "costBreakdown"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    const suggestions: DestinationSuggestion[] = JSON.parse(jsonText);
    setInCache(cacheKey, suggestions);
    return suggestions;

  } catch (error) {
    throw new Error(parseApiError(error, "generating off-beat travel suggestions"));
  }
}

const getBaseTravelPlanSchema = () => ({
  type: Type.OBJECT,
  properties: {
    itinerary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          title: { type: Type.STRING },
          travelInfo: {
            type: Type.OBJECT,
            description: "Information about travel between cities. Only include if traveling from one city to another, which should happen at the start of the day. Provide 2-3 diverse options where applicable (e.g., flight, train, bus).",
            properties: {
              fromCity: { type: Type.STRING },
              toCity: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                description: "An array of transportation options to get from the fromCity to the toCity.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    mode: { type: Type.STRING, description: "e.g., 'Train', 'Flight', 'Bus', 'Rental Car'" },
                    duration: { type: Type.STRING, description: "e.g., '3 hours', '1h 30m'" },
                    cost: { type: Type.NUMBER, description: "Estimated cost per person in USD." },
                    description: { type: Type.STRING, description: "A brief, helpful note about this option, e.g., 'Fastest but most expensive', 'Scenic route'." }
                  },
                  propertyOrdering: ["mode", "duration", "cost", "description"],
                  required: ["mode", "duration", "cost"]
                }
              }
            },
            propertyOrdering: ["fromCity", "toCity", "options"],
            required: ["fromCity", "toCity", "options"]
          },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                city: { type: Type.STRING, description: "The city where the activity is located." },
                type: { type: Type.STRING, enum: ['Touristy', 'Off-beat'] },
                duration: { type: Type.STRING, description: "Estimated time to complete the activity, e.g., '2-3 hours', 'Full day'." },
                averageCost: { type: Type.NUMBER, description: "Estimated cost per person in USD. Must be the sum of the breakdown." },
                costBreakdown: {
                  type: Type.OBJECT,
                  description: "Cost breakdown per person. Accommodation is usually 0.",
                  properties: {
                    accommodation: { type: Type.NUMBER, description: "Cost for accommodation, if part of the activity (e.g., overnight trek). Usually 0." },
                    food: { type: Type.NUMBER, description: "Cost for food, if it is a main part of the activity (e.g., dinner cruise). Usually 0." },
                    activities: { type: Type.NUMBER, description: "Cost for tickets, entrance fees, or the primary activity itself." }
                  },
                  propertyOrdering: ["accommodation", "food", "activities"],
                  required: ["accommodation", "food", "activities"]
                },
                lat: { type: Type.NUMBER, description: "The precise latitude of the activity location." },
                lng: { type: Type.NUMBER, description: "The precise longitude of the activity location." },
                links: {
                  type: Type.ARRAY,
                  description: "Up to 2 relevant informational or official links (e.g., official website, Wikipedia page).",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "The title of the link." },
                      url: { type: Type.STRING, description: "The full URL." }
                    },
                    required: ["title", "url"]
                  }
                }
              },
              propertyOrdering: ["name", "description", "city", "type", "duration", "averageCost", "costBreakdown", "lat", "lng", "links"],
              required: ["name", "description", "city", "type", "averageCost", "costBreakdown", "lat", "lng", "duration", "links"],
            }
          },
          keepInMind: {
            type: Type.ARRAY,
            description: "An array of helpful tips, dos, don'ts, and scam warnings for the day. Each tip must have a type and the text content.",
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ['do', 'dont', 'warning', 'info'],
                  description: "The type of tip: 'do' for positive advice, 'dont' for what to avoid, 'warning' for scams or dangers, 'info' for general information."
                },
                tip: {
                  type: Type.STRING,
                  description: "The text content of the tip, without any prefix like 'Do:' or 'Warning:'."
                }
              },
              required: ["type", "tip"]
            }
          },
        },
        propertyOrdering: ["day", "title", "travelInfo", "activities", "keepInMind"],
        required: ["day", "title", "activities", "keepInMind"],
      },
    },
    cityAccommodationCosts: {
      type: Type.ARRAY,
      description: "An array detailing the estimated accommodation cost for each city visited, based on 4-star hotels.",
      items: {
        type: Type.OBJECT,
        properties: {
          city: { type: Type.STRING, description: "The name of the city." },
          estimatedCost: { type: Type.NUMBER, description: "The total estimated accommodation cost in USD for the duration of the stay in this city." },
          nights: { type: Type.INTEGER, description: "The number of nights spent in this city." }
        },
        propertyOrdering: ["city", "nights", "estimatedCost"],
        required: ["city", "nights", "estimatedCost"]
      }
    },
    optimizationSuggestions: { type: Type.STRING, description: "A paragraph with tips to optimize the travel schedule." },
    officialLinks: {
      type: Type.ARRAY,
      description: "An array of up to 4 official tourism links for the country.",
      items: {
          type: Type.OBJECT,
          properties: {
              title: { type: Type.STRING, description: "A concise title for the link." },
              url: { type: Type.STRING, description: "The full, valid URL for the resource." }
          },
          propertyOrdering: ["title", "url"],
          required: ["title", "url"]
      }
    }
  },
  propertyOrdering: ["itinerary", "cityAccommodationCosts", "optimizationSuggestions", "officialLinks"],
  required: ["itinerary", "optimizationSuggestions", "officialLinks"],
});


export async function getTravelPlan(country: string, duration: number, style: ItineraryStyle, additionalNotes: string): Promise<TravelPlan> {
  const cacheKey = `plan:${country}:${duration}:${style}:${additionalNotes.trim()}`;
  const cachedData = getFromCache<TravelPlan>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  let styleInstruction = "The itinerary should include a good mix of both popular tourist attractions and off-beat local experiences.";
  if (style === 'Touristy') {
    styleInstruction = "The itinerary should focus exclusively on popular, well-known tourist attractions.";
  } else if (style === 'Off-beat') {
    styleInstruction = "The itinerary should focus exclusively on unique, off-the-beaten-path experiences and local secrets.";
  }

  const userRequests = additionalNotes.trim()
    ? `*   **User Requests:** Please carefully consider and incorporate the following user preferences into the itinerary: "${additionalNotes}"`
    : "";


  const prompt = `You are an expert travel planner specializing in ${country}.
Your task is to create a highly optimized and logical travel itinerary.

**Instructions:**

1.  **Generate Itinerary:** Create a day-by-day plan for a ${duration}-day trip.
    *   **Style:** ${styleInstruction}
    *   **Travel Between Cities:** If a day begins in a new city (different from where the previous day ended), you **must** include a \`travelInfo\` object for that day. This object must detail the journey from the previous city to the new one. Provide 2-3 realistic and diverse transportation \`options\` (e.g., a flight, a train, and a bus) where applicable. For each option, include the mode of transport, estimated travel duration, and the cost in USD per person. This should happen at the beginning of the day.
    *   **Daily Structure:** For each day, provide a day number, a creative title, and a list of 2-4 activities.
    *   **Activity Details:** For each activity, you **must** provide:
        1.  Its name.
        2.  A short description (1-2 sentences).
        3.  The city where it's located.
        4.  Classification as 'Touristy' or 'Off-beat'.
        5.  The estimated time taken for the activity (e.g., "2-3 hours", "Half day").
        6.  An estimated average cost per person in USD.
        7.  A cost breakdown into 'accommodation', 'food', and 'activities'. For most activities, 'accommodation' will be 0. Include 'food' costs only if it's a primary part of the experience (like a food tour). 'activities' should be the ticket/entrance fee. The total 'averageCost' must be the sum of the breakdown. If an activity is free, all cost values should be 0.
        8.  The precise latitude for the activity.
        9.  The precise longitude for the activity.
        10. Up to 2 relevant informational links (e.g., official website, Wikipedia page).
    *   **Logical Flow:** Ensure daily activities are geographically grouped.
    *   **Keep in Mind Section:** For each day, provide a "Keep in Mind" section as an array of tip objects. Each object must have a 'type' ('do', 'dont', 'warning', 'info') and the 'tip' text. The 'tip' text itself should be the advice, without prefixes like "Do:" or "Warning:". Include crucial advice, with at least one 'do', one 'dont', and one 'warning' about a specific, relevant scam if common.
    ${userRequests}

2.  **Calculate Accommodation Costs:** For each distinct city visited in the itinerary, calculate the total estimated accommodation cost. Base this on the average price of a good 4-star hotel in that city. Provide the city name, the total number of nights spent there, and the total estimated cost in USD.

3.  **Provide Official Links:** List up to 4 highly relevant official tourism links for ${country} (e.g., national tourism board, national parks). For each, provide a concise title and the full URL.

4.  **Review and Optimize:** Write a summary of optimization suggestions (e.g., best order to visit attractions, morning/afternoon splits).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: getBaseTravelPlanSchema(),
      },
    });

    const jsonText = response.text.trim();
    const plan: TravelPlan = JSON.parse(jsonText);
    
    setInCache(cacheKey, plan);
    return plan;
  } catch (error) {
    throw new Error(parseApiError(error, "generating the travel plan"));
  }
}

export async function getComprehensiveTravelPlan(country: string, style: ItineraryStyle, additionalNotes: string): Promise<TravelPlan> {
    const cacheKey = `comprehensive-plan:${country}:${style}:${additionalNotes.trim()}`;
    const cachedData = getFromCache<TravelPlan>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    let styleInstruction = "The itinerary should include a good mix of both popular tourist attractions and off-beat local experiences.";
    if (style === 'Touristy') {
        styleInstruction = "The itinerary should focus exclusively on popular, well-known tourist attractions.";
    } else if (style === 'Off-beat') {
        styleInstruction = "The itinerary should focus exclusively on unique, off-the-beaten-path experiences and local secrets.";
    }

    const userRequests = additionalNotes.trim()
        ? `*   **User Requests:** Please carefully consider and incorporate the following user preferences into the itinerary: "${additionalNotes}"`
        : "";

    const prompt = `You are an expert travel planner specializing in ${country}.
Your task is to create a comprehensive, optimized, and logical travel itinerary that covers the entire country.

**Instructions:**

1.  **Determine Optimal Duration:** First, decide the ideal number of days required for a long, exhaustive, and comprehensive tour of the main regions and attractions of ${country}. The goal is to create a detailed, extended itinerary that allows a traveler to deeply explore the country, not just see the highlights. Prioritize creating a longer, more in-depth plan over a shorter, rushed one. Do not feel constrained by typical vacation lengths.
2.  **Generate Itinerary:** Create a day-by-day plan for the duration you determined.
    *   **Style:** ${styleInstruction}
    *   **Travel Between Cities:** If a day begins in a new city (different from where the previous day ended), you **must** include a \`travelInfo\` object for that day. This object must detail the journey from the previous city to the new one. Provide 2-3 realistic and diverse transportation \`options\` (e.g., a flight, a train, and a bus) where applicable. For each option, include the mode of transport, estimated travel duration, and the cost in USD per person. This should happen at the beginning of the day.
    *   **Daily Structure:** For each day, provide a day number, a creative title, and a list of 2-4 activities.
    *   **Activity Details:** For each activity, you **must** provide:
        1.  Its name.
        2.  A short description (1-2 sentences).
        3.  The city where it's located.
        4.  Classification as 'Touristy' or 'Off-beat'.
        5.  The estimated time taken for the activity (e.g., "2-3 hours", "Half day").
        6.  An estimated average cost per person in USD.
        7.  A cost breakdown into 'accommodation', 'food', and 'activities' as per standard rules (accommodation is usually 0, etc.).
        8.  The precise latitude and longitude.
        9.  Up to 2 relevant informational links (e.g., official website, Wikipedia page).
    *   **Logical Flow:** Ensure the entire itinerary flows logically from one region to the next, minimizing backtracking. Daily activities must be geographically grouped.
    *   **Keep in Mind Section:** For each day, provide a "Keep in Mind" section as an array of tip objects, each with a 'type' ('do', 'dont', 'warning', 'info') and 'tip' text (without prefixes). Include relevant dos, don'ts, and scam warnings.
    ${userRequests}
3.  **Calculate Accommodation Costs:** For each distinct city visited in the itinerary, calculate the total estimated accommodation cost. Base this on the average price of a good 4-star hotel in that city. Provide the city name, the total number of nights spent there, and the total estimated cost in USD.
4.  **Provide Official Links:** List up to 4 highly relevant official tourism links for ${country}.
5.  **Review and Optimize:** Write a summary of optimization suggestions for the entire trip.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: getBaseTravelPlanSchema(),
            },
        });

        const jsonText = response.text.trim();
        const plan: TravelPlan = JSON.parse(jsonText);
        
        setInCache(cacheKey, plan);
        return plan;

    } catch (error) {
        throw new Error(parseApiError(error, "generating the comprehensive travel plan"));
    }
}


export async function rebuildTravelPlan(country: string, duration: number, style: ItineraryStyle, existingActivities: DailyPlan[], additionalNotes: string): Promise<TravelPlan> {
    let styleInstruction = "The itinerary should include a good mix of both popular tourist attractions and off-beat local experiences.";
    if (style === 'Touristy') {
        styleInstruction = "The itinerary should focus exclusively on popular, well-known tourist attractions.";
    } else if (style === 'Off-beat') {
        styleInstruction = "The itinerary should focus exclusively on unique, off-the-beaten-path experiences and local secrets.";
    }

    const userRequests = additionalNotes.trim()
        ? `*   **User Requests:** Please carefully consider and incorporate the following user preferences into the itinerary: "${additionalNotes}"`
        : "";

    // We only need the activity details for the prompt, not the day structure or links
    const activityList = existingActivities.flatMap(day => day.activities.map(({ name, description, city, type, averageCost, costBreakdown, lat, lng, duration }) => ({ name, description, city, type, averageCost, costBreakdown, lat, lng, duration })));

    const prompt = `You are an expert travel planner specializing in ${country}.
A user has modified their itinerary and wants you to re-optimize it.

**Instructions:**

1.  **Rebuild Itinerary:** The user has provided the following list of activities they want to do. Create a new, optimized ${duration}-day itinerary using **only** these activities. Do not add or remove any activities from this list.
    *   **User's Selected Activities:**
        \`\`\`json
        ${JSON.stringify(activityList, null, 2)}
        \`\`\`
    *   **Style:** ${styleInstruction}
    *   **Travel Between Cities:** As you group activities, if a day starts in a city different from where the previous day ended, you **must** generate and include a \`travelInfo\` object. This should detail the journey from the previous city to the new one. Provide 2-3 realistic and diverse transportation \`options\` (e.g., a flight, a train, and a bus) where applicable. For each option, include the mode of transport, estimated travel duration, and cost in USD per person.
    *   **Logic:** Group the activities logically and geographically for each day into a ${duration}-day plan.
    *   **Structure:** For each day, provide a day number, a creative title, and the list of activities. For each activity, retain its original details. 
    *   **Cost, Location & Links:** If an activity is missing latitude, longitude, or city, you must find them. If an activity is missing its duration, you must estimate one. Ensure the cost breakdown rules are followed (e.g., 'accommodation' is usually 0, 'averageCost' is the sum of the breakdown). You must also generate up to 2 relevant informational links for each activity.
    *   **Keep in Mind Section:** Based on the newly arranged activities for each day, generate a *new* "Keep in Mind" section as an array of tip objects. Each object must have a 'type' ('do', 'dont', 'warning', 'info') and 'tip' text (without prefixes). Include relevant dos, don'ts, and scam warnings.
    ${userRequests}

2.  **Calculate Accommodation Costs:** Based on the newly arranged itinerary, for each distinct city visited, calculate the total estimated accommodation cost. Base this on the average price of a good 4-star hotel in that city. Provide the city name, the total number of nights spent there, and the total estimated cost in USD.

3.  **Provide Official Links:** List up to 4 highly relevant official tourism links for ${country}.

4.  **Review and Optimize:** Write a *new* summary of optimization suggestions based on the rebuilt itinerary.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: getBaseTravelPlanSchema(),
            },
        });

        const jsonText = response.text.trim();
        const plan: TravelPlan = JSON.parse(jsonText);
        
        return plan;
    } catch (error) {
        throw new Error(parseApiError(error, "rebuilding the travel plan"));
    }
}

export async function getPackingList(destination: string, duration: number, activities: ItineraryLocation[]): Promise<PackingListCategory[]> {
    const activitySummary = [...new Set(activities.map(a => a.type === 'Off-beat' ? a.name : a.type))].join(', ');
    const cacheKey = `packing-list:${destination}:${duration}:${activitySummary}`;
    const cachedData = getFromCache<PackingListCategory[]>(cacheKey);
    if (cachedData) {
        return cachedData;
    }

    const prompt = `You are an expert travel packer. A user is planning a ${duration}-day trip to ${destination}.
Their planned activities include: ${activitySummary}.

Generate a comprehensive, personalized packing list.
- Base suggestions on the typical climate and weather of ${destination}.
- Recommend quantities appropriate for a ${duration}-day trip (e.g., "5 T-shirts").
- Categorize items into logical groups: "Documents & Money", "Clothing", "Toiletries", "Electronics", and "Miscellaneous".
- Do not add a 'Notes' or 'Tips' category. Only include physical items.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            categoryName: { type: Type.STRING },
                            items: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ["categoryName", "items"]
                    }
                },
            },
        });

        const jsonText = response.text.trim();
        const packingList: PackingListCategory[] = JSON.parse(jsonText);
        setInCache(cacheKey, packingList);
        return packingList;
    } catch (error) {
        throw new Error(parseApiError(error, "generating the packing list"));
    }
}