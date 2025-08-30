# Shawshank Travel Planner

An intelligent, AI-powered travel planner that suggests destinations based on your budget and time of year, then creates a curated, interactive itinerary of both popular and off-beat attractions.

<!-- Placeholder for a screenshot or GIF of the app in action -->
<!-- ![Shawshank Travel Planner Demo](link-to-your-screenshot.png) -->

## Key Features

-   **AI-Powered Suggestions**: Get personalized destination ideas based on your budget, travel dates, and preferred continent.
-   **Direct Country Search**: Already know where you want to go? Get information and start planning for any country directly.
-   **Detailed Itineraries**: Generate a complete, day-by-day travel plan including activities, descriptions, costs, and links.
-   **Customizable Travel Style**: Tailor your itinerary to be `Touristy`, `Off-beat`, or a `Mixed` blend of both.
-   **Interactive Plan Editing**: Freely modify your itinerary by dragging and dropping to reorder activities or deleting them.
-   **AI-Powered Refinement**: After making changes, have the AI rebuild and re-optimize your plan based on your modifications and additional notes.
-   **Helpful Travel Tips**: Each day includes a "Keep in Mind" section with practical advice, dos and don'ts, and local scam warnings.
-   **PDF Export**: Download your final itinerary as a clean, print-ready PDF with clickable links preserved.

## Tech Stack

-   **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
-   **AI Integration**: [Google Gemini API](https://ai.google.dev/) via `@google/genai` SDK
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
    1.  Create a new file named `.env` in the root directory by copying the example file:
        ```bash
        cp .env.example .env
        ```
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