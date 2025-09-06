import React from 'react';
import type { DailyPlan } from '../types';

const RightArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

interface TripTimelineChartProps {
    itinerary: DailyPlan[];
}

const TripTimelineChart: React.FC<TripTimelineChartProps> = ({ itinerary }) => {
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
                {citiesVisited.map((city, index) => (
                    <React.Fragment key={city}>
                        <div className="flex items-center gap-2 bg-slate-700/50 py-2 px-4 rounded-lg">
                            <span className="font-semibold text-slate-200">{city}</span>
                        </div>
                        {index < citiesVisited.length - 1 && (
                            <div className="px-2">
                                <RightArrowIcon />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default TripTimelineChart;
