import React, { useState } from 'react';
import type { DestinationSuggestion, ItineraryStyle } from '../types';

interface DurationInputProps {
    destination: DestinationSuggestion;
    onGetPlan: (duration: number, style: ItineraryStyle, additionalNotes: string) => void;
    isLoading: boolean;
    onBack: () => void;
    initialStyle: ItineraryStyle;
    initialNotes: string;
    onReturnToPlan?: () => void;
}

const DurationInput: React.FC<DurationInputProps> = ({ destination, onGetPlan, isLoading, onBack, initialStyle, initialNotes, onReturnToPlan }) => {
    const [duration, setDuration] = useState(7);
    const [style, setStyle] = useState<ItineraryStyle>(initialStyle);
    const [additionalNotes, setAdditionalNotes] = useState(initialNotes);
    const [letAiDecide, setLetAiDecide] = useState(false);

    const isUpdating = !!onReturnToPlan;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalDuration = letAiDecide ? 0 : duration;
        if (finalDuration >= 0 && finalDuration <= 30) {
            onGetPlan(finalDuration, style, additionalNotes);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
            <div className="relative mb-2">
                <button 
                    onClick={onBack} 
                    aria-label="Go back" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-700/50 hover:bg-cyan-600 text-white p-2 rounded-full transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
                <h2 className="text-3xl font-bold text-center text-cyan-300">Trip to {destination.name}</h2>
            </div>
            <p className="text-center text-slate-400 mb-8">How long will your adventure be?</p>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-slate-300 mb-2">
                        Number of Days (1-30)
                    </label>
                    <input
                        id="duration"
                        type="number"
                        min="1"
                        max="30"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading || letAiDecide}
                    />
                </div>

                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="ai-duration"
                            aria-describedby="ai-duration-description"
                            name="ai-duration"
                            type="checkbox"
                            checked={letAiDecide}
                            onChange={(e) => setLetAiDecide(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-600 disabled:opacity-50"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="ai-duration" className="font-medium text-slate-300">
                           Let AI Suggest Duration
                        </label>
                        <p id="ai-duration-description" className="text-slate-400">
                            Check this for a comprehensive full-country tour.
                        </p>
                    </div>
                </div>

                <div>
                    <label htmlFor="style" className="block text-sm font-medium text-slate-300 mb-2">
                        What's your travel style?
                    </label>
                    <select
                        id="style"
                        value={style}
                        onChange={(e) => setStyle(e.target.value as ItineraryStyle)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        disabled={isLoading}
                    >
                        <option value="Mixed">A mix of popular & local spots</option>
                        <option value="Touristy">Mainly popular tourist sites</option>
                        <option value="Off-beat">Mostly off-beat & local</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="additionalNotes" className="block text-sm font-medium text-slate-300 mb-2">
                        Any specific requests? (Optional)
                    </label>
                    <textarea
                        id="additionalNotes"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        rows={3}
                        placeholder="e.g., I'm a vegetarian, I love hiking, no museums please."
                        disabled={isLoading}
                    />
                </div>
                <div className="mt-6 flex flex-col gap-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105"
                    >
                        {isLoading ? (isUpdating ? 'Updating Itinerary...' : 'Building Itinerary...') : (isUpdating ? 'Update Itinerary' : 'Generate Itinerary')}
                    </button>
                    {isUpdating && (
                        <button
                            type="button"
                            onClick={onReturnToPlan}
                            disabled={isLoading}
                            className="w-full bg-slate-600 hover:bg-slate-500 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                        >
                            Back to Itinerary
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default DurationInput;