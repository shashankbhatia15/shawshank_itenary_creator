import React, { useState } from 'react';

interface TripInputFormProps {
  onGetSuggestions: (budget: string, timeOfYear: string, continent: string, country: string) => void;
  isLoading: boolean;
}

const TripInputForm: React.FC<TripInputFormProps> = ({ onGetSuggestions, isLoading }) => {
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
      </form>
    </div>
  );
};

export default TripInputForm;