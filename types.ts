

export interface CurrencyInfo {
  code: string; // e.g., EUR
  symbol: string; // e.g., €
  usdToLocalRate: number;
  usdToInrRate: number;
}

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
  averageCost: number; // This will remain in USD as the base currency
  costBreakdown: CostBreakdown; // Also in USD
  currencyInfo: CurrencyInfo;
}

export interface ItineraryLink {
  title: string;
  url: string;
}

export interface ItineraryLocation {
  id: string; // Unique identifier for each activity
  name: string;
  description: string;
  city: string;
  type: 'Touristy' | 'Off-beat';
  links: ItineraryLink[];
  averageCost: number;
  costBreakdown: CostBreakdown;
  lat: number;
  lng: number;
  duration?: string;
  visitingTip?: string;
}

export interface TransportOption {
  mode: string;
  duration: string;
  cost: number;
  description?: string;
}

export interface TravelInfo {
  fromCity: string;
  toCity: string;
  options: TransportOption[];
}

export interface KeepInMindItem {
  type: 'do' | 'dont' | 'warning' | 'info';
  tip: string;
}

export interface DailyPlan {
  day: number;
  title: string;
  activities: ItineraryLocation[];
  keepInMind: KeepInMindItem[];
  travelInfo?: TravelInfo[];
  userNotes?: string;
  weatherForecast?: string;
}

export interface OfficialLink {
  title: string;
  url: string;
}

export interface CityAccommodationCost {
  city: string;
  estimatedCost: number;
  nights: number;
}

export interface TravelPlan {
  itinerary: DailyPlan[];
  optimizationSuggestions: string;
  officialLinks?: OfficialLink[];
  cityAccommodationCosts?: CityAccommodationCost[];
  packingList?: PackingListCategory[];
  checkedPackingItems?: Record<string, boolean>;
}

export interface SavedPlan {
  id: string;
  name: string;
  plan: TravelPlan;
  destination: DestinationSuggestion;
  savedAt: string; // ISO string date
  timeOfYear: string;
  itineraryStyle: ItineraryStyle;
  additionalNotes: string;
}

export type AppStep = 'input' | 'suggestions' | 'duration' | 'plan';

export type ItineraryStyle = 'Mixed' | 'Touristy' | 'Off-beat';

export interface PackingListCategory {
  categoryName: string;
  items: string[];
}