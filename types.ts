export interface CostBreakdown {
  accommodation: number;
  food: number;
  activities: number;
}

export interface DestinationSuggestion {
  name: string; // This will now be a country name
  country: string; // This can be the same as name or a more formal name
  description: string;
  visaInfo: string;
  averageCost: number;
  costBreakdown: CostBreakdown;
}

export interface ItineraryLocation {
  id: string; // Unique identifier for each activity
  name: string;
  description: string;
  type: 'Touristy' | 'Off-beat';
  link: string;
  averageCost: number;
  costBreakdown: CostBreakdown;
}

export interface DailyPlan {
  day: number;
  title: string;
  activities: ItineraryLocation[];
  keepInMind: string;
}

export interface OfficialLink {
  title: string;
  url: string;
}

export interface TravelPlan {
  itinerary: DailyPlan[];
  optimizationSuggestions: string;
  officialLinks?: OfficialLink[];
}

export type AppStep = 'input' | 'suggestions' | 'duration' | 'plan';

export type ItineraryStyle = 'Mixed' | 'Touristy' | 'Off-beat';