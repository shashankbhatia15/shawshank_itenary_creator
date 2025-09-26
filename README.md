# Shawshank Travel Planner

An intelligent, AI-powered travel planner that suggests destinations based on your preferences, then creates a curated, interactive, and fully editable itinerary.

<!-- Placeholder for a screenshot or GIF of the app in action -->
<!-- ![Shawshank Travel Planner Demo](link-to-your-screenshot.png) -->

## Key Features

-   **AI-Powered Discovery Engine**:
    -   **Personalized Suggestions**: Get destination ideas based on your budget, travel dates, and preferred continent.
    -   **Direct Country Search**: Already have a place in mind? Jump straight into planning for any country.
    -   **Off-Beat Inspiration**: Spark your adventurous side with the "Inspire Me: Off-Beat Ideas" feature for unique, less-traveled destinations.

-   **Dynamic & Flexible Itinerary Generation**:
    -   **Custom Duration**: Plan a trip for any length, from a short getaway to a month-long expedition.
    -   **AI-Suggested Duration**: Let the AI create a comprehensive, full-country tour with an optimal duration.
    -   **Travel Styles**: Tailor your itinerary to be `Touristy`, `Off-beat`, or a `Mixed` blend of both.

-   **Interactive & Evolving Plan Management**:
    -   **Edit with Ease**: Drag and drop to reorder activities, delete unwanted suggestions, and add personal notes to each day's plan.
    -   **AI Refinement Engine**: Request changes in natural language (e.g., "add more hiking," "make day 2 more relaxed"). The AI rebuilds the entire plan, remembering previously deleted activities to avoid repeating suggestions.
    -   **Route Modification**: Visually mark entire cities for removal from your trip route timeline and have the AI generate a new, shorter, and logically sound itinerary.
    -   **Save & Load**: Export your plan to a JSON file and load it back anytime to continue where you left off.

-   **Rich Visualizations & Insights**:
    -   **Daily Activity Map**: View each day's plan on an interactive map. Clicking a map marker highlights the corresponding activity in your itinerary.
    -   **Trip Route Timeline**: See your entire journey laid out city by city and interact with it to modify your trip.
    -   **Cost Overview Map**: A high-level map showing the estimated costs associated with each city stop.

-   **Smart Packing Assistant**:
    -   Get an AI-generated packing list tailored to your specific destination, trip length, and planned activities.
    -   **Fully Editable**: Check off items as you pack, add your own custom items to any category, and remove anything you don't need.

-   **Comprehensive Trip Details**:
    -   **Cost Breakdowns**: Get detailed cost estimates for accommodation, activities, inter-city travel, and food, with currency conversions.
    -   **Travel Logistics**: The plan automatically includes travel information between cities with multiple transport options (flight, train, bus), including estimated costs and durations.
    -   **Daily Pro-Tips**: Each day includes actionable "Pro-Tips" for activities and a "Keep In Mind" section with practical advice, dos and don'ts.

-   **Export & Share**:
    -   Download your complete, personalized itinerary as a polished, print-ready PDF. The export includes a cover page, cost summaries, daily plans, your personal notes, the full packing list, and clickable links for online resources.

-   **Smart Caching**: API requests are cached in your browser's local storage to provide instant results for recent searches and save on API usage.


## Tech Stack

-   **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
-   **AI Integration**: [Google Gemini API](https://ai.google.dev/) via `@google/genai` SDK
-   **Mapping**: [Leaflet.js](https://leafletjs.com/)
-   **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)

## Getting Started

Follow these steps to get the development environment running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 18.x or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)
-   A Google Gemini API Key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/shawshank-travel-planner.git
    cd shawshank-travel-planner
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    The application requires a Google Gemini API key to function.
    1.  Create a new file named `.env` in the root directory. You can do this by copying the example file if one exists, or creating it manually.
    2.  Open the new `.env` file and add your API key:
        ```
        API_KEY="YOUR_GEMINI_API_KEY"
        ```
        Replace `"YOUR_GEMINI_API_KEY"` with your actual key.

### Running the Application

Start the Vite development server:

```bash
npm run dev
```

The application will now be running and accessible at `http://localhost:5173` (or the next available port). The browser will automatically reload when you make changes to the source code.

## Available Scripts

In the project directory, you can run:

-   `npm run dev`: Starts the application in development mode.
-   `npm run build`: Bundles the app for production.
-   `npm run preview`: Serves the production build locally for testing.
