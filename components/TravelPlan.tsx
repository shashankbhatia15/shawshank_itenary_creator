
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TravelPlan, DestinationSuggestion, DailyPlan, ItineraryLocation } from '../types';

interface TravelPlanProps {
  plan: TravelPlan;
  destination: DestinationSuggestion;
  onReset: () => void;
  onBack: () => void;
  onDeleteActivity: (dayIndex: number, activityId: string) => void;
  onReorderActivities: (dayIndex: number, reorderedActivities: ItineraryLocation[]) => void;
  onRebuildPlan: (refinementNotes: string) => Promise<void>;
  isPlanModified: boolean;
  isLoading: boolean;
}

// --- Icon Components ---

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MoneyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const LightbulbIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-cyan-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 5.05A1 1 0 003.636 6.464l.707.707a1 1 0 001.414-1.414l-.707-.707zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM10 18a1 1 0 001-1v-1a1 1 0 10-2 0v1a1 1 0 001 1zM8.94 15.06a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM15.061 13.94a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707z" />
    <path d="M10 4a6 6 0 100 12 6 6 0 000-12zM9 14a1 1 0 112 0 1 1 0 01-2 0z" />
  </svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9" />
  </svg>
);

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

const DragHandleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 cursor-grab group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-yellow-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);


// --- Draggable Activity Card ---

interface ActivityCardProps {
    location: ItineraryLocation;
    onDelete: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    isDragging: boolean;
    isDragOver: boolean;
    isPotentialDropTarget: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ location, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, onDragEnter, isDragging, isDragOver, isPotentialDropTarget }) => {
    const baseClasses = 'bg-slate-800/50 p-4 rounded-lg border transition-all group';
    
    let conditionalClasses = '';
    if (isDragging) {
        conditionalClasses = 'opacity-50 border-cyan-500 shadow-lg shadow-cyan-500/20';
    } else if (isDragOver) {
        conditionalClasses = '!border-cyan-400 border-dashed border-2 bg-slate-800';
    } else if (isPotentialDropTarget) {
        conditionalClasses = 'border-slate-600';
    } else {
        conditionalClasses = 'border-slate-700 hover:shadow-lg hover:border-slate-600';
    }

    return (
        <div
            draggable="true"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnter={onDragEnter}
            className={`${baseClasses} ${conditionalClasses}`}
        >
            <div className="flex items-start gap-2">
                <div className="flex-shrink-0 pt-1">
                    <DragHandleIcon />
                </div>
                <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-bold text-cyan-300">{location.name}</h4>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                location.averageCost > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}>
                                {location.averageCost > 0 ? `~$${location.averageCost}` : 'Free'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                location.type === 'Touristy'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-green-500/20 text-green-300 border border-green-500/30'
                            }`}>
                                {location.type}
                            </span>
                            {location.link && (
                                <a href={location.link} target="_blank" rel="noopener noreferrer" aria-label={`Learn more about ${location.name}`} className="text-slate-400 hover:text-cyan-400 transition-colors">
                                    <ExternalLinkIcon />
                                </a>
                            )}
                             <button onClick={onDelete} aria-label={`Remove ${location.name}`} className="text-slate-500 hover:text-red-400 transition-colors">
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm">{location.description}</p>

                    {location.averageCost > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <h5 className="text-xs font-bold text-slate-400 mb-1">Cost Breakdown (est. per person)</h5>
                            <ul className="text-sm text-slate-300 space-y-1">
                                {location.costBreakdown.activities > 0 && (
                                    <li className="flex justify-between items-center">
                                        <span>🎟️ Activity / Ticket</span>
                                        <span className="font-mono text-slate-200">${location.costBreakdown.activities.toLocaleString()}</span>
                                    </li>
                                )}
                                {location.costBreakdown.food > 0 && (
                                    <li className="flex justify-between items-center">
                                        <span>🍜 Food / Dining</span>
                                        <span className="font-mono text-slate-200">${location.costBreakdown.food.toLocaleString()}</span>
                                    </li>
                                )}
                                {location.costBreakdown.accommodation > 0 && (
                                    <li className="flex justify-between items-center">
                                        <span>🏠 Accommodation</span>
                                        <span className="font-mono text-slate-200">${location.costBreakdown.accommodation.toLocaleString()}</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Daily Plan Container ---

interface DailyPlanCardProps {
    dailyPlan: DailyPlan;
    dayIndex: number;
    draggedActivityId: string | null;
    setDraggedActivityId: (id: string | null) => void;
    dragOverActivityId: string | null;
    setDragOverActivityId: (id: string | null) => void;
    onDeleteActivity: (dayIndex: number, activityId: string) => void;
    onReorderActivities: (dayIndex: number, reorderedActivities: ItineraryLocation[]) => void;
    className?: string;
}

const DailyPlanCard: React.FC<DailyPlanCardProps> = ({ dailyPlan, dayIndex, draggedActivityId, setDraggedActivityId, dragOverActivityId, setDragOverActivityId, onDeleteActivity, onReorderActivities, className }) => {

    const handleDragStart = (e: React.DragEvent, activityId: string) => {
        setDraggedActivityId(activityId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', activityId);
    };

    const handleDrop = (e: React.DragEvent, targetActivityId: string) => {
        e.preventDefault();
        if (!draggedActivityId || draggedActivityId === targetActivityId) return;

        const activities = [...dailyPlan.activities];
        const sourceIndex = activities.findIndex(a => a.id === draggedActivityId);
        const targetIndex = activities.findIndex(a => a.id === targetActivityId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const [removed] = activities.splice(sourceIndex, 1);
        activities.splice(targetIndex, 0, removed);
        onReorderActivities(dayIndex, activities);
    };

    return (
        <div className={`relative pl-8 py-4 border-l-2 border-slate-700 ${className || ''}`}>
            <div className="absolute -left-4 top-4 h-8 w-8 bg-slate-800 rounded-full border-4 border-slate-900 flex items-center justify-center">
                <span className="font-bold text-cyan-400 text-sm">{dailyPlan.day}</span>
            </div>
            <div className="mb-4">
                <h3 className="text-2xl font-semibold text-white">{dailyPlan.title}</h3>
            </div>
            <div className="space-y-4">
                {dailyPlan.activities.map((activity) => (
                    <ActivityCard
                        key={activity.id}
                        location={activity}
                        onDelete={() => onDeleteActivity(dayIndex, activity.id)}
                        onDragStart={(e) => handleDragStart(e, activity.id)}
                        onDragEnd={() => {
                            setDraggedActivityId(null);
                            setDragOverActivityId(null);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            handleDrop(e, activity.id);
                            setDragOverActivityId(null);
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            if (draggedActivityId && draggedActivityId !== activity.id) {
                                setDragOverActivityId(activity.id);
                            }
                        }}
                        isDragging={draggedActivityId === activity.id}
                        isDragOver={dragOverActivityId === activity.id}
                        isPotentialDropTarget={draggedActivityId !== null && draggedActivityId !== activity.id}
                    />
                ))}
            </div>

            {dailyPlan.keepInMind && (
                <div className="mt-6 p-4 bg-slate-800/70 rounded-lg border border-yellow-500/30">
                    <div className="flex items-center mb-2">
                        <InfoIcon />
                        <h4 className="font-bold text-yellow-300">Keep In Mind</h4>
                    </div>
                    <ul className="list-none pl-4 space-y-1">
                        {dailyPlan.keepInMind.split('\n').map((item, index) => {
                            if (!item.trim()) return null;
                            const text = item.replace(/^\s*\*\s*/, ''); // Remove markdown bullet
                            return (
                                <li key={index} className="flex items-start">
                                    <span className="text-yellow-400 mr-2 mt-1">&#8227;</span>
                                    <span className="text-slate-300 text-sm">{text}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- Main Travel Plan Component ---

const TravelPlanComponent: React.FC<TravelPlanProps> = ({ plan, destination, onReset, onBack, onDeleteActivity, onReorderActivities, onRebuildPlan, isPlanModified, isLoading }) => {
    const totalEstimatedCost = destination.averageCost > 0
        ? Math.round((destination.averageCost / 7) * plan.itinerary.length)
        : 0;

    const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);
    const [dragOverActivityId, setDragOverActivityId] = useState<string | null>(null);
    const [refinementNotes, setRefinementNotes] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    const showRebuildButton = isPlanModified || refinementNotes.trim() !== '';

    const handleRebuildClick = async () => {
        try {
            await onRebuildPlan(refinementNotes);
            setRefinementNotes(''); // Clear notes on success
        } catch (error) {
            console.error("Failed to rebuild plan, notes will be kept.", error);
            // Error is handled in App.tsx, so we just log it here and don't clear the notes
        }
    };
    
    const handleDownloadPdf = async () => {
        const sections = document.querySelectorAll<HTMLElement>('.pdf-section');
        if (sections.length === 0) {
            console.error("No content sections found for PDF export.");
            return;
        }
        
        setIsDownloading(true);

        try {
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 40; // pt
            let yPos = margin;

            for (const section of Array.from(sections)) {
                await new Promise(r => setTimeout(r, 50));
                
                const canvas = await html2canvas(section, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#1e293b' // slate-800 for consistent background
                });

                const imgData = canvas.toDataURL('image/png');
                const imgProps = pdf.getImageProperties(imgData);
                const imgHeight = ((imgProps.height * (pdfWidth - margin * 2)) / imgProps.width);

                if (yPos + imgHeight > pdfHeight - margin) {
                    pdf.addPage();
                    yPos = margin;
                }

                pdf.addImage(imgData, 'PNG', margin, yPos, pdfWidth - margin * 2, imgHeight);
                yPos += imgHeight + 15;
            }
            
            pdf.save(`trip-to-${destination.name}.pdf`);

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
            <div className="text-center mb-10 pdf-section">
                <h2 className="text-4xl font-bold text-cyan-300">Your Trip to {destination.name}</h2>
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 text-slate-300">
                    <div className="flex items-center gap-2">
                        <CalendarIcon />
                        <span className="text-lg">{plan.itinerary.length} Day Adventure</span>
                    </div>
                    {totalEstimatedCost > 0 && (
                        <div className="flex items-center gap-2">
                            <MoneyIcon />
                            <span className="text-lg">
                                Est. Budget: ~${totalEstimatedCost.toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {plan.officialLinks && plan.officialLinks.length > 0 && (
                <div className="mb-10 p-6 bg-slate-800 rounded-xl border border-slate-700 pdf-section">
                    <div className="flex items-center mb-4">
                        <GlobeIcon />
                        <h3 className="text-xl font-bold text-cyan-300">Official Resources</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {plan.officialLinks.map((link) => (
                            <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 bg-slate-700/50 p-3 rounded-lg border border-slate-600 hover:border-cyan-500 hover:bg-slate-700 transition-all group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span className="text-slate-300 group-hover:text-cyan-300 transition-colors text-sm truncate">{link.title}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {plan.itinerary.map((dailyPlan, index) => (
                    <DailyPlanCard
                        key={dailyPlan.day}
                        dailyPlan={dailyPlan}
                        dayIndex={index}
                        draggedActivityId={draggedActivityId}
                        setDraggedActivityId={setDraggedActivityId}
                        dragOverActivityId={dragOverActivityId}
                        setDragOverActivityId={setDragOverActivityId}
                        onDeleteActivity={onDeleteActivity}
                        onReorderActivities={onReorderActivities}
                        className="pdf-section"
                    />
                ))}
            </div>

            <div className="mt-10 p-6 bg-slate-800 rounded-xl border border-cyan-500/30 relative pdf-section">
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
                        <div className="flex items-center gap-2 text-cyan-300">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Rebuilding plan...</span>
                        </div>
                    </div>
                )}
                <div className="flex items-center mb-3">
                    <LightbulbIcon />
                    <h3 className="text-xl font-bold text-cyan-300">Pro-Tip: Itinerary Optimization</h3>
                </div>
                <p className="text-slate-300">{plan.optimizationSuggestions}</p>
            </div>
            
            <div className="mt-8">
                <label htmlFor="refinement-notes" className="block text-lg font-semibold text-cyan-300 mb-3">
                    Refine Your Plan
                </label>
                <textarea
                    id="refinement-notes"
                    rows={3}
                    className="w-full bg-slate-700/80 border border-slate-600 rounded-lg py-3 px-4 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition disabled:opacity-50"
                    placeholder="e.g., 'Add a good vegetarian restaurant for Day 2 lunch', 'Make Day 1 more relaxed'"
                    value={refinementNotes}
                    onChange={(e) => setRefinementNotes(e.target.value)}
                    disabled={isLoading}
                />
            </div>


            <div className="mt-12 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4">
                <button
                    onClick={onBack}
                    disabled={isLoading || isDownloading}
                    className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Change Duration
                </button>

                {showRebuildButton && (
                     <button
                        onClick={handleRebuildClick}
                        disabled={isLoading || isDownloading}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       Rebuild Itinerary
                    </button>
                )}
                 <button
                    onClick={handleDownloadPdf}
                    disabled={isLoading || isDownloading}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDownloading ? 'Generating PDF...' : 'Download as PDF'}
                </button>
                <button
                    onClick={onReset}
                    disabled={isLoading || isDownloading}
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Start a New Plan
                </button>
            </div>
        </div>
    );
};

export default TravelPlanComponent;