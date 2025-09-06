import React, { useState } from 'react';

interface TripInputFormProps {
  onGetSuggestions: (budget: string, timeOfYear: string, continent: string, country: string) => void;
  onGetOffBeatSuggestions: () => void;
  isLoading: boolean;
  onLoadFromFileClick: () => void;
}

const TripInputForm: React.FC<TripInputFormProps> = ({ onGetSuggestions, onGetOffBeatSuggestions, isLoading, onLoadFromFileClick }) => {
  const [budget, setBudget] = useState('Budget-friendly');
  const [timeOfYear, setTimeOfYear] = useState('Spring (Mar-May)');
  const [continent, setContinent] = useState('Any');
  const [country, setCountry] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGetSuggestions(budget, timeOfYear, continent, country);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700">
      <h2 className="text-3xl font-bold text-center text-cyan-300 mb-2">Plan Your Perfect Getaway</h2>
      <p className="text-center text-slate-400 mb-8">Tell us your preferences, and we'll find your next destination.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="continent" className="block text-sm font-medium text-slate-300 mb-2">
            Choose a continent for ideas...
          </label>
          <select
            id="continent"
            value={continent}
            onChange={(e) => setContinent(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
            disabled={isLoading}
          >
            <option>Any</option>
            <option>Africa</option>
            <option>Asia</option>
            <option>Europe</option>
            <option>North America</option>
            <option>South America</option>
            <option>Oceania</option>
          </select>
        </div>
        
        <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-slate-800 px-2 text-sm text-slate-400">OR</span>
            </div>
        </div>

        <div>
            <label htmlFor="country" className="block text-sm font-medium text-slate-300 mb-2">
            ...specify a country directly
            </label>
            <input
                type="text"
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                placeholder="e.g., Japan"
                disabled={isLoading}
            />
        </div>

        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-slate-300 mb-2">
            What's your budget?
          </label>
          <select
            id="budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
            disabled={isLoading}
          >
            <option>Budget-friendly</option>
            <option>Mid-range</option>
            <option>Luxury</option>
          </select>
        </div>
        <div>
          <label htmlFor="timeOfYear" className="block text-sm font-medium text-slate-300 mb-2">
            When do you want to travel?
          </label>
          <select
            id="timeOfYear"
            value={timeOfYear}
            onChange={(e) => setTimeOfYear(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
            disabled={isLoading}
          >
            <option>Spring (Mar-May)</option>
            <option>Summer (Jun-Aug)</option>
            <option>Autumn (Sep-Nov)</option>
            <option>Winter (Dec-Feb)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
        >
          {isLoading ? 'Searching...' : 'Find Destinations'}
        </button>

        <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-slate-800 px-2 text-sm text-slate-400">OR</span>
            </div>
        </div>

        <button
          type="button"
          onClick={onLoadFromFileClick}
          disabled={isLoading}
          className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.414l-1.293 1.293a1 1 0 01-1.414-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L13 9.414V13h-1.5z" />
            <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
          </svg>
          Load Plan from File
        </button>
        

        <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-600" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-slate-800 px-2 text-sm text-slate-400">OR</span>
            </div>
        </div>

        <button
          type="button"
          onClick={onGetOffBeatSuggestions}
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v1.5a1.5 1.5 0 01-3 0V12a2 2 0 00-2-2 2 2 0 01-2-2V8c0-.428.081-.83.225-1.195a.992.992 0 00-.225-.03c-.34.02-.67.1-.983.237a5.96 5.96 0 00-1.682 1.996z" clipRule="evenodd" />
          </svg>
          Inspire Me: Off-Beat Ideas
        </button>
      </form>
    </div>
  );
};

export default TripInputForm;
