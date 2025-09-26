import React from 'react';
import type { DailyPlan } from '../types';

const RightArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

const RemoveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
    </svg>
);

interface TripTimelineChartProps {
    itinerary: DailyPlan[];
    citiesMarkedForRemoval: Set<number>;
    onToggleCity: (index: number) => void;
    isLoading: boolean;
    onCityClick: (city: string) => void;
}

const TripTimelineChart: React.FC<TripTimelineChartProps> = ({ itinerary, citiesMarkedForRemoval, onToggleCity, isLoading, onCityClick }) => {
    const citiesVisited = itinerary
        .flatMap(day => day.activities.map(activity => activity.city))
        .reduce((uniqueCities: string[], city) => {
            if (city && (uniqueCities.length === 0 || uniqueCities[uniqueCities.length - 1] !== city)) {
                uniqueCities.push(city);
            }
            return uniqueCities;
        }, []);

    if (citiesVisited.length <= 1) {
        return null; // Don't show the chart if only one city is visited.
    }

    return (
        <div className="mb-10 p-6 bg-slate-800 rounded-xl border border-slate-700">
            <h3 className="text-xl font-bold text-cyan-300 mb-4 text-center">Trip Route</h3>
            <div className="flex items-center justify-center flex-wrap gap-y-4">
                {citiesVisited.map((city, index) => {
                    const isMarkedForRemoval = citiesMarkedForRemoval.has(index);
                    return (
                        <React.Fragment key={`${city}-${index}`}>
                            <div className="group flex items-center gap-2 bg-slate-700/50 py-2 pl-4 pr-2 rounded-lg relative transition-all">
                                <button
                                    onClick={() => onCityClick(city)}
                                    disabled={isMarkedForRemoval || isLoading}
                                    className={`font-semibold transition-colors disabled:cursor-not-allowed ${isMarkedForRemoval ? 'text-slate-500 line-through' : 'text-slate-200 hover:text-cyan-300'}`}
                                    aria-label={`Scroll to the first day in ${city}`}
                                >
                                    {city}
                                </button>
                                {citiesVisited.length > 1 && (
                                    <button
                                        onClick={() => onToggleCity(index)}
                                        disabled={isLoading}
                                        className={`ml-1 transition-colors disabled:cursor-not-allowed ${isMarkedForRemoval ? 'text-green-400 hover:text-green-300' : 'text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100'}`}
                                        aria-label={isMarkedForRemoval ? `Undo removal of ${city}`: `Mark ${city} for removal`}
                                    >
                                       {isMarkedForRemoval ? <UndoIcon /> : <RemoveIcon />}
                                    </button>
                                )}
                            </div>
                            {index < citiesVisited.length - 1 && (
                                <div className="px-2">
                                    <RightArrowIcon />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {citiesMarkedForRemoval.size > 0 && (
                 <p className="text-center text-sm text-amber-300 mt-4 pt-4 border-t border-slate-700">
                    City removals will be applied when you click "Rebuild Itinerary".
                </p>
            )}
        </div>
    );
};

export default TripTimelineChart;