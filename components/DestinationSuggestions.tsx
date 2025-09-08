import React from 'react';
import type { DestinationSuggestion, CurrencyInfo } from '../types';

interface DestinationSuggestionsProps {
  suggestions: DestinationSuggestion[];
  onSelectDestination: (destination: DestinationSuggestion) => void;
  isLoading: boolean;
  onBack: () => void;
}

const MapPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);

const VisaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm4 0a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const MoneyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
        <path fillRule="evenodd" d="M18 9H2v7a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm3 0a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const CostDisplay: React.FC<{ usd: number; currencyInfo: CurrencyInfo }> = ({ usd, currencyInfo }) => {
    if (!currencyInfo) return <span>~${usd.toLocaleString()} USD</span>;
    const inr = usd * currencyInfo.usdToInrRate;
    const local = usd * currencyInfo.usdToLocalRate;

    return (
        <span className="font-semibold text-lg">
            ₹{inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span className="text-slate-400 text-sm font-normal ml-1">
                ({currencyInfo.symbol}{local.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </span>
        </span>
    );
};

const DestinationCard: React.FC<{suggestion: DestinationSuggestion, onSelect: () => void, isLoading: boolean}> = ({ suggestion, onSelect, isLoading }) => (
    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col transition-all duration-300 hover:border-cyan-500 hover:shadow-cyan-500/10">
        <h3 className="text-xl font-bold text-cyan-300">{suggestion.name}</h3>
        <p className="text-slate-400 mb-4 font-semibold flex items-center"><MapPinIcon /> {suggestion.country}</p>
        <p className="text-slate-300 flex-grow mb-4">{suggestion.description}</p>
        
        <div className="pt-4 border-t border-slate-700 space-y-3">
             <div className="flex items-start">
                <VisaIcon />
                <p className="text-slate-400 text-sm">
                    <span className="font-bold text-slate-300 block">Visa Info (for Indians):</span>
                    {suggestion.visaInfo}
                </p>
            </div>
             <div className="flex items-start">
                <MoneyIcon />
                <div className="text-slate-400 text-sm">
                    <span className="font-bold text-slate-300 block">Est. 7-Day Trip Cost (Solo):</span>
                     {suggestion.averageCost > 0 && suggestion.currencyInfo ? (
                        <CostDisplay usd={suggestion.averageCost} currencyInfo={suggestion.currencyInfo} />
                    ) : 'N/A'}
                </div>
            </div>
        </div>
        
        {suggestion.costBreakdown && suggestion.currencyInfo && (
            <div className="pt-3 mt-3 border-t border-slate-700">
                <h4 className="text-sm font-bold text-slate-300 mb-2">Cost Breakdown (est.)</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                    <li className="flex justify-between items-center">
                        <span>🏠 Accommodation</span>
                        <span className="font-mono text-slate-200"><CostDisplay usd={suggestion.costBreakdown.accommodation} currencyInfo={suggestion.currencyInfo} /></span>
                    </li>
                    <li className="flex justify-between items-center">
                        <span>🍜 Food & Dining</span>
                        <span className="font-mono text-slate-200"><CostDisplay usd={suggestion.costBreakdown.food} currencyInfo={suggestion.currencyInfo} /></span>
                    </li>
                    <li className="flex justify-between items-center">
                        <span>🎟️ Activities & Sights</span>
                        <span className="font-mono text-slate-200"><CostDisplay usd={suggestion.costBreakdown.activities} currencyInfo={suggestion.currencyInfo} /></span>
                    </li>
                </ul>
            </div>
        )}

        <button 
            onClick={onSelect}
            disabled={isLoading}
            className="mt-6 bg-slate-700 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all w-full"
        >
            Plan My Trip Here
        </button>
    </div>
);

const DestinationSuggestions: React.FC<DestinationSuggestionsProps> = ({ suggestions, onSelectDestination, isLoading, onBack }) => {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-10 w-full">
        <button 
            onClick={onBack}
            aria-label="Back to preferences"
            className="bg-slate-700 hover:bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center mb-6"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Preferences
        </button>
        <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-2">Here are some ideas...</h2>
            <p className="text-slate-400">Select a destination to build your detailed itinerary.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {suggestions.map((suggestion) => (
          <DestinationCard 
            key={suggestion.name} 
            suggestion={suggestion} 
            onSelect={() => onSelectDestination(suggestion)}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
};

export default DestinationSuggestions;