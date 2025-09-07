# Shawshank Travel Planner

An intelligent, AI-powered travel planner that suggests destinations based on your preferences, then creates a curated, interactive, and fully editable itinerary.

<!-- Placeholder for a screenshot or GIF of the app in action -->
<!-- ![Shawshank Travel Planner Demo](link-to-your-screenshot.png) -->

## Key Features

-   **AI-Powered Discovery Engine**: Not sure where to go? Get personalized destination ideas based on your budget, travel dates, and preferred continent. Or, spark your adventurous side with the "Inspire Me: Off-Beat Ideas" feature.
-   **Direct Country Search**: Already have a place in mind? Jump straight into planning for any country directly.
-   **Dynamic Itinerary Generation**:
    -   **Custom Duration**: Plan a trip for any length from a short getaway to a month-long expedition.
    -   **AI-Suggested Duration**: Let the AI create a comprehensive, full-country tour with an optimal duration.
    -   **Travel Styles**: Tailor your itinerary to be `Touristy`, `Off-beat`, or a `Mixed` blend of both.
-   **Interactive Plan Management**:
    -   **Drag & Drop**: Easily reorder activities within a day to match your flow.
    -   **Delete Activities**: Remove any suggestion that doesn't fit your interests.
    -   **Save & Load**: Export your progress to a JSON file and load it back anytime to continue planning.
-   **AI-Assisted Refinement**: Made changes to your plan? Add new requests and click "Rebuild Itinerary" to have the AI re-optimize the entire schedule, travel routes, and daily tips based on your modifications.
-   **Comprehensive Trip Details**:
    -   **Cost Breakdowns**: Get detailed cost estimates for accommodation, activities, inter-city travel, and food.
    -   **Travel Logistics**: The plan automatically includes travel information between cities with multiple transport options (flight, train, bus), including estimated costs and durations.
    -   **Daily Tips**: Each day includes a "Keep in Mind" section with practical advice, dos and don'ts, and local scam warnings.
-   **Interactive Map Visualization**: Click the "View on Map" button for any day to see all activities pinned on an interactive map, helping you visualize your route. Clicking a map marker highlights the activity in your plan.
-   **AI-Generated Packing List**: Get a personalized, categorized packing list for your specific destination and trip length. You can check off items as you pack and even add your own custom items to the list.
-   **PDF Export**: Download your final itinerary as a clean, print-ready PDF, complete with a cover page, summary, and preserved clickable links for online resources.
-   **Smart Caching**: API requests are cached in your browser's local storage to provide instant results for recent searches and save on API usage.


## Tech Stack

-   **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
-   **AI Integration**: [Google Gemini API](https://ai.google.dev/) via `@google/genai` SDK
-   **Mapping**: [Leaflet.js](https://leafletjs.com/)
-   **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) & [html2canvas](https://html2canvas.hertzen.com/)

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