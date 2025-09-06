





import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TravelPlan, DestinationSuggestion, DailyPlan, ItineraryLocation, PackingListCategory } from '../types';
import InteractiveMap from './InteractiveMap';
import TripTimelineChart from './TripTimelineChart';
import PackingListModal from './PackingListModal';
import { getPackingList } from '../services/geminiService';

interface TravelPlanProps {
  plan: TravelPlan;
  destination: DestinationSuggestion;
  onReset: () => void;
  onBack: () => void;
  onDeleteActivity: (dayIndex: number, activityId: string) => void;
  onReorderActivities: (dayIndex: number, reorderedActivities: ItineraryLocation[]) => void;
  onRebuildPlan: (refinementNotes: string) => Promise<void>;
  onOpenSaveModal: () => void;
  isPlanModified: boolean;
  isLoading: boolean;
  onError: (message: string) => void;
  onUpdatePackingList: (list: PackingListCategory[]) => void;
  onTogglePackingItem: (item: string) => void;
  onAddItemToPackingList: (categoryName: string, item: string) => void;
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

const TransportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2h4.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16m-3.5 1.5a1.5 1.5 0 000-3H6" />
    </svg>
);

const BuildingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const ChartPieIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

const StopwatchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    isHighlighted: boolean;
    onHighlight: () => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ location, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, onDragEnter, isDragging, isDragOver, isPotentialDropTarget, isHighlighted, onHighlight }) => {
    const baseClasses = 'bg-slate-800/50 p-4 rounded-lg border transition-all group cursor-pointer';
    
    let conditionalClasses = '';
    if (isHighlighted) {
        conditionalClasses = 'border-cyan-400 shadow-lg shadow-cyan-500/30 scale-[1.02]';
    } else if (isDragging) {
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
            id={`activity-${location.id}`}
            onClick={onHighlight}
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
                             <button onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label={`Remove ${location.name}`} className="text-slate-500 hover:text-red-400 transition-colors">
                                <TrashIcon />
                            </button>
                        </div>
                    </div>

                    {location.duration && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2">
                            <StopwatchIcon />
                            <span>{location.duration}</span>
                        </div>
                    )}
                    
                    <p className="text-slate-400 text-sm">{location.description}</p>

                    {location.links && location.links.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                             <h5 className="text-xs font-bold text-slate-400 mb-2">Relevant Links</h5>
                             <ul className="space-y-2">
                               {location.links.map((link, index) => (
                                 <li key={index}>
                                   <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-400 transition-colors group" onClick={(e) => e.stopPropagation()}>
                                     <ExternalLinkIcon />
                                     <span className="truncate group-hover:underline">{link.title}</span>
                                   </a>
                                 </li>
                               ))}
                             </ul>
                        </div>
                    )}

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
    highlightedActivityId: string | null;
    onActivityHighlight: (id: string) => void;
    onShowMap: () => void;
}

const DailyPlanCard: React.FC<DailyPlanCardProps> = ({ dailyPlan, dayIndex, draggedActivityId, setDraggedActivityId, dragOverActivityId, setDragOverActivityId, onDeleteActivity, onReorderActivities, highlightedActivityId, onActivityHighlight, onShowMap }) => {

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
        <div className="relative pl-8 py-4 border-l-2 border-slate-700">
            <div className="absolute -left-4 top-4 h-8 w-8 bg-slate-800 rounded-full border-4 border-slate-900 flex items-center justify-center">
                <span className="font-bold text-cyan-400 text-sm">{dailyPlan.day}</span>
            </div>
             {dailyPlan.travelInfo && (
                <div className="mb-6 p-4 bg-slate-800/70 rounded-lg border border-cyan-500/30">
                    <div className="flex items-center mb-3">
                        <TransportIcon />
                        <h4 className="font-bold text-cyan-300 text-lg">Travel: {dailyPlan.travelInfo.fromCity} to {dailyPlan.travelInfo.toCity}</h4>
                    </div>
                    <div className="space-y-4">
                        {dailyPlan.travelInfo.options.map((option, index) => (
                            <div key={index} className="p-3 bg-slate-900/40 rounded-lg border border-slate-700">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <span className="font-bold text-white">{option.mode}</span>
                                    <div className="flex items-center gap-4 text-sm flex-shrink-0">
                                         <div className="flex items-center gap-1.5 text-slate-300">
                                            <StopwatchIcon />
                                            <span>{option.duration}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-300 font-mono bg-slate-700/50 px-2 py-1 rounded">
                                            <span>~${option.cost.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                {option.description && (
                                    <p className="mt-2 text-xs text-slate-400">{option.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-white">{dailyPlan.title}</h3>
                {dailyPlan.activities.length > 0 && (
                     <button
                        onClick={onShowMap}
                        className="flex items-center gap-2 bg-slate-700/80 hover:bg-cyan-600 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-all"
                        aria-label={`Show activities for Day ${dailyPlan.day} on map`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        View on Map
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {dailyPlan.activities.map((activity) => (
                    <ActivityCard
                        key={activity.id}
                        location={activity}
                        isHighlighted={highlightedActivityId === activity.id}
                        onHighlight={() => onActivityHighlight(activity.id)}
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

const TravelPlanComponent: React.FC<TravelPlanProps> = ({ plan, destination, onReset, onBack, onDeleteActivity, onReorderActivities, onRebuildPlan, onOpenSaveModal, isPlanModified, isLoading, onError, onUpdatePackingList, onTogglePackingItem, onAddItemToPackingList }) => {
    const totalEstimatedCost = destination.averageCost > 0
        ? Math.round((destination.averageCost / 7) * plan.itinerary.length)
        : 0;

    const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);
    const [dragOverActivityId, setDragOverActivityId] = useState<string | null>(null);
    const [refinementNotes, setRefinementNotes] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [mapDayIndex, setMapDayIndex] = useState<number | null>(null);
    const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);
    const [isPackingListModalOpen, setIsPackingListModalOpen] = useState(false);
    const [isPackingListLoading, setIsPackingListLoading] = useState(false);


    const showRebuildButton = isPlanModified || refinementNotes.trim() !== '';

    const costSummary = useMemo(() => {
        if (!plan || !destination) {
          return {
            accommodation: 0,
            activities: 0,
            travel: 0,
            food: 0,
            grandTotal: 0,
          };
        }
    
        const totalAccommodationCost = plan.cityAccommodationCosts?.reduce((sum, cost) => sum + cost.estimatedCost, 0) ?? 0;
    
        const totalActivitiesCost = plan.itinerary.reduce((sum, day) => {
          return sum + day.activities.reduce((daySum, activity) => daySum + activity.averageCost, 0);
        }, 0);
    
        const totalTravelCost = plan.itinerary.reduce((sum, day) => {
          if (day.travelInfo && day.travelInfo.options.length > 0) {
            const cheapestOption = Math.min(...day.travelInfo.options.map(opt => opt.cost));
            return sum + cheapestOption;
          }
          return sum;
        }, 0);
        
        // Prorate food cost from 7-day estimate to the actual trip duration
        const dailyFoodCost = (destination.costBreakdown?.food ?? 0) / 7;
        const totalFoodCost = Math.round(dailyFoodCost * plan.itinerary.length);
    
        const grandTotal = totalAccommodationCost + totalActivitiesCost + totalTravelCost + totalFoodCost;
    
        return {
          accommodation: totalAccommodationCost,
          activities: totalActivitiesCost,
          travel: totalTravelCost,
          food: totalFoodCost,
          grandTotal: grandTotal,
        };
    }, [plan, destination]);

    const handleHighlightActivity = (activityId: string) => {
        setHighlightedActivityId(activityId);
        const element = document.getElementById(`activity-${activityId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleShowMap = (dayIndex: number) => {
        setMapDayIndex(dayIndex);
        setIsMapModalOpen(true);
    };

    const handleCloseMap = () => {
        setIsMapModalOpen(false);
        setHighlightedActivityId(null); // Clear highlight on close
        // Keep mapDayIndex so it reopens to the same day if reopened quickly
    };

    const handleRebuildClick = async () => {
        try {
            await onRebuildPlan(refinementNotes);
            setRefinementNotes(''); // Clear notes on success
        } catch (error) {
            console.error("Failed to rebuild plan, notes will be kept.", error);
            // Error is handled in App.tsx, so we just log it here and don't clear the notes
        }
    };
    
    const handlePackingListButtonClick = async () => {
        if (plan.packingList && plan.packingList.length > 0) {
            setIsPackingListModalOpen(true);
            return;
        }

        setIsPackingListLoading(true);
        onError(''); // Clear previous errors
        try {
            const allActivities = plan.itinerary.flatMap(day => day.activities);
            const list = await getPackingList(destination.name, plan.itinerary.length, allActivities);
            onUpdatePackingList(list);
            setIsPackingListModalOpen(true);
        } catch (err) {
            onError(err instanceof Error ? err.message : 'Failed to generate packing list.');
        } finally {
            setIsPackingListLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        const contentToExport = document.getElementById('pdf-export-content');
        if (!contentToExport) {
            console.error("PDF export content wrapper not found.");
            return;
        }
    
        setIsDownloading(true);
    
        try {
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'pt',
                format: 'a4'
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
    
            // --- Cover Page ---
            pdf.setFillColor('#0f172a'); // bg-slate-900
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
            pdf.setTextColor('#e2e8f0'); // text-slate-200
            pdf.setFontSize(32);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Your Trip to ${destination.name}`, pdfWidth / 2, pdfHeight / 2 - 20, { align: 'center' });
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor('#94a3b8'); // text-slate-400
            pdf.text(`${plan.itinerary.length} Day Adventure`, pdfWidth / 2, pdfHeight / 2 + 10, { align: 'center' });
            
            // --- Itinerary Content ---
            const canvas = await html2canvas(contentToExport, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#1e293b' // Match the card background color
            });
    
            const contentWidth = pdfWidth - margin * 2;
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
            
            const pageContentHeight = pdfHeight - margin * 2;
            let heightLeft = imgHeight;
            let position = 0;
    
            pdf.addPage();
    
            // Add the image, slicing it across pages by adjusting the y-position
            while (heightLeft > 0) {
                pdf.addImage(imgData, 'PNG', margin, position + margin, contentWidth, imgHeight);
                heightLeft -= pageContentHeight;
                
                if (heightLeft > 0) {
                    position -= pageContentHeight;
                    pdf.addPage();
                }
            }
    
            const contentRect = contentToExport.getBoundingClientRect();
            const scale = contentWidth / contentRect.width;

            // --- Overlay Clickable Links ---
            const links = contentToExport.querySelectorAll('a');
            links.forEach(link => {
                const linkRect = link.getBoundingClientRect();
                const href = link.getAttribute('href');
                
                if (href && href.startsWith('http')) {
                    const linkTopInCanvas = (linkRect.top - contentRect.top) * scale;
                    const pageNum = Math.floor(linkTopInCanvas / pageContentHeight);
                    const yOnPage = (linkTopInCanvas % pageContentHeight) + margin;
                    
                    pdf.setPage(pageNum + 2);
    
                    const pdfX = margin + (linkRect.left - contentRect.left) * scale;
                    const pdfLinkWidth = linkRect.width * scale;
                    const pdfLinkHeight = linkRect.height * scale;
                    
                    pdf.link(pdfX, yOnPage, pdfLinkWidth, pdfLinkHeight, { url: href });
                }
            });

            // --- Overlay selectable, invisible text ---
            const addTextLayer = (element: HTMLElement, parentRect: DOMRect) => {
                // Handle direct text children of the current element
                Array.from(element.childNodes).forEach(child => {
                    if (child.nodeType === Node.TEXT_NODE && child.nodeValue?.trim()) {
                        const range = document.createRange();
                        range.selectNode(child);
                        const rect = range.getBoundingClientRect();
                        const text = child.nodeValue.trim();

                        if (rect.width > 0 && rect.height > 0) {
                            const computedStyle = window.getComputedStyle(element);
                            const fontSize = parseFloat(computedStyle.fontSize);

                            // Skip if element is not visible
                            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || fontSize === 0) {
                                return;
                            }

                            const textTopInCanvas = (rect.top - parentRect.top) * scale;
                            const pageNum = Math.floor(textTopInCanvas / pageContentHeight);
                            // Y position in jsPDF is the baseline. A good approximation is top + height.
                            const yOnPage = (textTopInCanvas % pageContentHeight) + margin + (rect.height * scale);

                            if (yOnPage > pdfHeight - margin) return;

                            pdf.setPage(pageNum + 2);
                            
                            const pdfX = margin + (rect.left - parentRect.left) * scale;
                            
                            // Convert font size from px to pt for jsPDF (1px = 0.75pt)
                            const pdfFontSize = fontSize * 0.75;
                            pdf.setFontSize(pdfFontSize);
                            
                            // Pass the 'invisible' rendering mode directly to the text call
                            pdf.text(text, pdfX, yOnPage, { renderingMode: 'invisible' } as any);
                        }
                    }
                });

                // Recurse into child elements
                Array.from(element.children).forEach((child: Element) => {
                    if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
                        addTextLayer(child as HTMLElement, parentRect);
                    }
                });
            };
            
            addTextLayer(contentToExport, contentRect);
            
            pdf.save(`trip-to-${destination.name}.pdf`);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };
    

    return (
        <>
            <div className="w-full max-w-4xl mx-auto bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
                {/* Wrapper for PDF export content */}
                <div id="pdf-export-content">
                    <div className="text-center mb-10">
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

                    <TripTimelineChart itinerary={plan.itinerary} />

                    {plan.cityAccommodationCosts && plan.cityAccommodationCosts.length > 0 && (
                        <div className="mb-10 p-6 bg-slate-800 rounded-xl border border-slate-700">
                            <div className="flex items-center mb-4">
                                <BuildingIcon />
                                <h3 className="text-xl font-bold text-cyan-300">Estimated Accommodation Costs</h3>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">Based on average 4-star hotel prices per city.</p>
                            <ul className="space-y-3">
                                {plan.cityAccommodationCosts.map((cost, index) => (
                                    <li key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-700/50 p-3 rounded-lg">
                                        <div className="font-semibold text-slate-200">{cost.city}</div>
                                        <div className="flex items-center gap-4 text-slate-300">
                                            <span>{cost.nights} night{cost.nights > 1 ? 's' : ''}</span>
                                            <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">~${cost.estimatedCost.toLocaleString()}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {plan.officialLinks && plan.officialLinks.length > 0 && (
                        <div className="mb-10 p-6 bg-slate-800 rounded-xl border border-slate-700">
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
                                highlightedActivityId={highlightedActivityId}
                                onActivityHighlight={handleHighlightActivity}
                                onShowMap={() => handleShowMap(index)}
                            />
                        ))}
                    </div>

                    <div className="mt-10 p-6 bg-slate-800 rounded-xl border border-slate-700">
                        <div className="flex items-center mb-4">
                            <ChartPieIcon />
                            <h3 className="text-xl font-bold text-cyan-300">Final Estimated Cost Summary</h3>
                        </div>
                        <ul className="space-y-3 mb-4">
                            <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                <span className="font-semibold text-slate-200">🏠 Accommodation</span>
                                <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                    ${costSummary.accommodation.toLocaleString()}
                                </span>
                            </li>
                            <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                <span className="font-semibold text-slate-200">🎟️ Activities</span>
                                <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                    ${costSummary.activities.toLocaleString()}
                                </span>
                            </li>
                            <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                <span className="font-semibold text-slate-200">✈️ Inter-city Travel</span>
                                <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                    ${costSummary.travel.toLocaleString()}
                                </span>
                            </li>
                            <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                <span className="font-semibold text-slate-200">🍜 Food & Dining</span>
                                <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                    ${costSummary.food.toLocaleString()}
                                </span>
                            </li>
                        </ul>
                        <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-lg font-bold text-cyan-300">Grand Total (per person)</span>
                            <span className="text-xl font-bold font-mono text-white bg-cyan-600/50 px-4 py-2 rounded-lg">
                                ~${costSummary.grandTotal.toLocaleString()}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 text-center">
                            Disclaimer: These are estimates based on the generated plan and do not include international airfare.
                        </p>
                    </div>


                    <div className="mt-10 p-6 bg-slate-800 rounded-xl border border-cyan-500/30 relative">
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
                </div>
                
                {/* --- End of PDF export content --- */}

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
                        disabled={isLoading || isDownloading || isPackingListLoading}
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
                            disabled={isLoading || isDownloading || isPackingListLoading}
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           Rebuild Itinerary
                        </button>
                    )}
                    <button
                        onClick={onOpenSaveModal}
                        disabled={isLoading || isDownloading || isPackingListLoading}
                        className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        Export Plan to File
                    </button>
                    <button
                        onClick={handlePackingListButtonClick}
                        disabled={isLoading || isDownloading || isPackingListLoading}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPackingListLoading ? 'Generating List...' : (plan.packingList && plan.packingList.length > 0 ? 'View Packing List' : 'Generate Packing List')}
                    </button>
                     <button
                        onClick={handleDownloadPdf}
                        disabled={isLoading || isDownloading || isPackingListLoading}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? 'Generating PDF...' : 'Download as PDF'}
                    </button>
                    <button
                        onClick={onReset}
                        disabled={isLoading || isDownloading || isPackingListLoading}
                        className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Start a New Plan
                    </button>
                </div>
            </div>

             {/* Map Modal */}
            {isMapModalOpen && mapDayIndex !== null && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
                    onClick={handleCloseMap}
                    role="dialog"
                    aria-modal="true"
                >
                    <div 
                        className="bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl mx-4 relative"
                        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
                    >
                        <button 
                            onClick={handleCloseMap}
                            className="absolute -top-3 -right-3 bg-slate-700 hover:bg-red-500 text-white rounded-full p-2 z-[1001]"
                            aria-label="Close map view"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                           </svg>
                        </button>
                        <InteractiveMap
                            locations={plan.itinerary[mapDayIndex].activities}
                            highlightedId={highlightedActivityId}
                            onMarkerClick={handleHighlightActivity}
                            dayTitle={`Day ${plan.itinerary[mapDayIndex].day}: ${plan.itinerary[mapDayIndex].title}`}
                        />
                    </div>
                </div>
            )}
            
            {/* Packing List Modal */}
            {plan.packingList && plan.packingList.length > 0 && (
                <PackingListModal
                    isOpen={isPackingListModalOpen}
                    onClose={() => setIsPackingListModalOpen(false)}
                    list={plan.packingList}
                    destinationName={destination.name}
                    checkedItems={plan.checkedPackingItems || {}}
                    onToggleItem={onTogglePackingItem}
                    onAddItem={onAddItemToPackingList}
                />
            )}
        </>
    );
};

export default TravelPlanComponent;