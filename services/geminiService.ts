

import { GoogleGenAI, Type } from "@google/genai";
import type { DestinationSuggestion, TravelPlan, ItineraryStyle, CostBreakdown, DailyPlan } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getDirectCountryInfo(countryName: string): Promise<{ description: string; visaInfo: string; averageCost: number; costBreakdown: CostBreakdown; }> {
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
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(`Error fetching info for ${countryName}:`, error);
    // Provide a fallback response so the app doesn't crash
    return {
      description: `An amazing travel destination with rich culture and beautiful landscapes.`,
      visaInfo: 'Visa requirements could not be fetched. Please check official government sources.',
      averageCost: 0,
      costBreakdown: { accommodation: 0, food: 0, activities: 0 },
    };
  }
}


export async function getTravelSuggestions(budget: string, timeOfYear: string, continent: string): Promise<DestinationSuggestion[]> {
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
    
    return suggestions;

  } catch (error) {
    console.error("Error fetching travel suggestions:", error);
    throw new Error("Failed to generate travel suggestions. Please try again.");
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
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Touristy', 'Off-beat'] },
                link: { type: Type.STRING, description: "A valid, working URL for booking or information from a reputable site like TripAdvisor or a major travel publication about the activity." },
                averageCost: { type: Type.NUMBER, description: "Estimated cost per person in USD. Must be the sum of the breakdown." },
                costBreakdown: {
                  type: Type.OBJECT,
                  description: "Cost breakdown per person. Accommodation is usually 0.",
                  properties: {
                    accommodation: { type: Type.NUMBER, description: "Cost for accommodation, if part of the activity (e.g., overnight trek). Usually 0." },
                    food: { type: Type.NUMBER, description: "Cost for food, if it is a main part of the activity (e.g., dinner cruise). Usually 0." },
                    activities: { type: Type.NUMBER, description: "Cost for tickets, entrance fees, or the primary activity itself." }
                  },
                  required: ["accommodation", "food", "activities"]
                }
              },
              required: ["name", "description", "type", "link", "averageCost", "costBreakdown"],
            }
          },
          keepInMind: { type: Type.STRING, description: "A bulleted list of helpful 'dos and don'ts' and warnings about potential local scams relevant to the day's activities. Use markdown for bullet points (e.g., '* Do this...')." },
        },
        required: ["day", "title", "activities", "keepInMind"],
      },
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
          required: ["title", "url"]
      }
    }
  },
  required: ["itinerary", "optimizationSuggestions", "officialLinks"],
});


export async function getTravelPlan(country: string, duration: number, style: ItineraryStyle, additionalNotes: string): Promise<TravelPlan> {
  
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
    *   **Daily Structure:** For each day, provide a day number, a creative title, and a list of 2-4 activities.
    *   **Activity Details:** For each activity, you **must** provide:
        1.  Its name.
        2.  A short description (1-2 sentences).
        3.  Classification as 'Touristy' or 'Off-beat'.
        4.  A **valid, working URL from TripAdvisor** for the specific activity. If a TripAdvisor link is absolutely not available, you may use a link from Viator or GetYourGuide. This is a strict requirement; do not use any other sources like blogs, government sites, or Google Maps.
        5.  An estimated average cost per person in USD.
        6.  A cost breakdown into 'accommodation', 'food', and 'activities'. For most activities, 'accommodation' will be 0. Include 'food' costs only if it's a primary part of the experience (like a food tour). 'activities' should be the ticket/entrance fee. The total 'averageCost' must be the sum of the breakdown. If an activity is free, all cost values should be 0.
    *   **Logical Flow:** Ensure daily activities are geographically grouped.
    *   **Keep in Mind Section:** For each day, provide a "Keep in Mind" section. This must be a short, bulleted list of crucial advice including at least one "Do", one "Don't", and a warning about a specific, relevant scam if common. Use markdown for bullet points (e.g., \`* Do try the local street food...\`).
    ${userRequests}

2.  **Provide Official Links:** List up to 4 highly relevant official tourism links for ${country} (e.g., national tourism board, national parks). For each, provide a concise title and the full URL.

3.  **Review and Optimize:** Write a summary of optimization suggestions (e.g., best order to visit attractions, morning/afternoon splits).`;

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
    const plan = JSON.parse(jsonText);
    return plan as TravelPlan;
  } catch (error) {
    console.error("Error fetching travel plan:", error);
    throw new Error("Failed to generate a travel plan. Please try again.");
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

    // We only need the activity details for the prompt, not the day structure
    const activityList = existingActivities.flatMap(day => day.activities.map(({ name, description, type, link, averageCost, costBreakdown }) => ({ name, description, type, link, averageCost, costBreakdown })));

    const prompt = `You are an expert travel planner specializing in ${country}.
A user has modified their itinerary and wants you to re-optimize it.

**Instructions:**

1.  **Rebuild Itinerary:** The user has provided the following list of activities they want to do. Create a new, optimized ${duration}-day itinerary using **only** these activities. Do not add or remove any activities from this list.
    *   **User's Selected Activities:**
        \`\`\`json
        ${JSON.stringify(activityList, null, 2)}
        \`\`\`
    *   **Style:** ${styleInstruction}
    *   **Logic:** Group the activities logically and geographically for each day into a ${duration}-day plan.
    *   **Structure:** For each day, provide a day number, a creative title, and the list of activities. For each activity, retain its original details. If an activity is missing a link, you **must** find a valid one. The link **must be from TripAdvisor**. If a TripAdvisor link is absolutely not available, you may use a link from Viator or GetYourGuide. This is a strict requirement; do not use any other sources. Ensure the cost breakdown rules are followed (e.g., 'accommodation' is usually 0, 'averageCost' is the sum of the breakdown).
    *   **Keep in Mind Section:** Based on the newly arranged activities for each day, generate a *new* "Keep in Mind" section with relevant dos, don'ts, and scam warnings. Use markdown for bullet points.
    ${userRequests}

2.  **Provide Official Links:** List up to 4 highly relevant official tourism links for ${country}.

3.  **Review and Optimize:** Write a *new* summary of optimization suggestions based on the rebuilt itinerary.`;

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
        const plan = JSON.parse(jsonText);
        return plan as TravelPlan;
    } catch (error) {
        console.error("Error rebuilding travel plan:", error);
        throw new Error("Failed to rebuild the travel plan. Please try again.");
    }
}