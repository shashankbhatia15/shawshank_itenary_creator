import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import type { TravelPlan, DestinationSuggestion, DailyPlan, ItineraryLocation, PackingListCategory, CurrencyInfo } from '../types';
import InteractiveMap from './InteractiveMap';
import TripTimelineChart from './TripTimelineChart';
import TripOverviewMap from './LoadPlanModal';
import PackingListModal from './PackingListModal';
import { getPackingList } from '../services/geminiService';

interface TravelPlanProps {
  plan: TravelPlan;
  destination: DestinationSuggestion;
  timeOfYear: string;
  onReset: () => void;
  onBack: () => void;
  onDeleteActivity: (dayIndex: number, activityId: string) => void;
  onReorderActivities: (dayIndex: number, reorderedActivities: ItineraryLocation[]) => void;
  onUpdateUserNote: (dayIndex: number, note: string) => void;
  onRebuildPlan: (refinementNotes: string) => Promise<void>;
  onDiscardChanges: () => void;
  onOpenSaveModal: () => void;
  isPlanModified: boolean;
  isLoading: boolean;
  onError: (message: string) => void;
  onUpdatePackingList: (list: PackingListCategory[]) => void;
  onTogglePackingItem: (item: string) => void;
  onAddItemToPackingList: (categoryName: string, item: string) => void;
  onRemovePackingItem: (item: string) => void;
  citiesMarkedForRemoval: Set<number>;
  onToggleCityForRemoval: (cityIndex: number) => void;
}

// --- Helper Components ---
const CostDisplay: React.FC<{ usd: number; currencyInfo: CurrencyInfo; className?: string }> = ({ usd, currencyInfo, className = '' }) => {
    if (!currencyInfo || usd <= 0) return <span className={className}>Free</span>;

    const inr = usd * currencyInfo.usdToInrRate;
    const local = usd * currencyInfo.usdToLocalRate;

    return (
        <span className={className}>
            ₹{inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span className="text-slate-400 text-xs ml-1 font-normal">
                ({currencyInfo.symbol}{local.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </span>
        </span>
    );
};

// --- Icon Components ---

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const SeasonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
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

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);


const StopwatchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WeatherIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const XCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const ExclamationTriangleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const LightbulbTipIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 5.05A1 1 0 003.636 6.464l.707.707a1 1 0 001.414-1.414l-.707-.707zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM10 18a1 1 0 001-1v-1a1 1 0 10-2 0v1a1 1 0 001 1zM8.94 15.06a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM15.061 13.94a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707z" />
      <path d="M10 4a6 6 0 100 12 6 6 0 000-12zM9 14a1 1 0 112 0 1 1 0 01-2 0z" />
    </svg>
);


// --- Draggable Activity Card ---

interface ActivityCardProps {
    location: ItineraryLocation;
    currencyInfo: CurrencyInfo;
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

const ActivityCard: React.FC<ActivityCardProps> = ({ location, currencyInfo, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, onDragEnter, isDragging, isDragOver, isPotentialDropTarget, isHighlighted, onHighlight }) => {
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
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnter={onDragEnter}
            className={`${baseClasses} ${conditionalClasses}`}
        >
            <div className="flex items-start gap-2">
                <div 
                    className="flex-shrink-0 pt-1" 
                    draggable="true" 
                    onDragStart={onDragStart} 
                    onDragEnd={onDragEnd}
                    onClick={(e) => e.stopPropagation()}
                >
                    <DragHandleIcon />
                </div>
                <div className="flex-grow select-text">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-bold text-cyan-300 select-text">{location.name}</h4>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                location.averageCost > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}>
                                <CostDisplay usd={location.averageCost} currencyInfo={currencyInfo} />
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full select-text ${
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
                        <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2 select-text">
                            <StopwatchIcon />
                            <span>{location.duration}</span>
                        </div>
                    )}
                    
                    <p className="text-slate-400 text-sm select-text">{location.description}</p>

                    {location.visitingTip && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                             <div className="bg-slate-700/50 p-3 rounded-md flex items-start gap-3">
                                <div className="flex-shrink-0 text-cyan-400 pt-0.5">
                                    <LightbulbTipIcon />
                                </div>
                                <div>
                                    <h5 className="font-semibold text-cyan-300 text-sm select-text">Pro Tip</h5>
                                    <p className="text-slate-300 text-sm select-text">{location.visitingTip}</p>
                                </div>
                             </div>
                        </div>
                    )}

                    {location.links && location.links.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                             <h5 className="text-xs font-bold text-slate-400 mb-2 select-text">Relevant Links</h5>
                             <ul className="space-y-2">
                               {location.links.map((link, index) => (
                                 <li key={index}>
                                   <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-400 transition-colors group" onClick={(e) => e.stopPropagation()}>
                                     <ExternalLinkIcon />
                                     <span className="truncate group-hover:underline select-text">{link.title}</span>
                                   </a>
                                 </li>
                               ))}
                             </ul>
                        </div>
                    )}

                    {location.averageCost > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <h5 className="text-xs font-bold text-slate-400 mb-1 select-text">Cost Breakdown (est. per person)</h5>
                            <ul className="text-sm text-slate-300 space-y-1">
                                {location.costBreakdown.activities > 0 && (
                                    <li className="flex justify-between items-center select-text">
                                        <span>🎟️ Activity / Ticket</span>
                                        <span className="font-mono text-slate-200"><CostDisplay usd={location.costBreakdown.activities} currencyInfo={currencyInfo}/></span>
                                    </li>
                                )}
                                {location.costBreakdown.food > 0 && (
                                    <li className="flex justify-between items-center select-text">
                                        <span>🍜 Food / Dining</span>
                                        <span className="font-mono text-slate-200"><CostDisplay usd={location.costBreakdown.food} currencyInfo={currencyInfo}/></span>
                                    </li>
                                )}
                                {location.costBreakdown.accommodation > 0 && (
                                    <li className="flex justify-between items-center select-text">
                                        <span>🏠 Accommodation</span>
                                        <span className="font-mono text-slate-200"><CostDisplay usd={location.costBreakdown.accommodation} currencyInfo={currencyInfo}/></span>
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
    currencyInfo: CurrencyInfo;
    draggedActivityId: string | null;
    setDraggedActivityId: (id: string | null) => void;
    dragOverActivityId: string | null;
    setDragOverActivityId: (id: string | null) => void;
    onDeleteActivity: (dayIndex: number, activityId: string) => void;
    onReorderActivities: (dayIndex: number, reorderedActivities: ItineraryLocation[]) => void;
    onUpdateUserNote: (dayIndex: number, note: string) => void;
    highlightedActivityId: string | null;
    onActivityHighlight: (id: string) => void;
    onShowMap: () => void;
}

const DailyPlanCard: React.FC<DailyPlanCardProps> = ({ dailyPlan, dayIndex, currencyInfo, draggedActivityId, setDraggedActivityId, dragOverActivityId, setDragOverActivityId, onDeleteActivity, onReorderActivities, onUpdateUserNote, highlightedActivityId, onActivityHighlight, onShowMap }) => {

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
             {dailyPlan.travelInfo && dailyPlan.travelInfo.length > 0 && (
                <div className="mb-6 p-4 bg-slate-800/70 rounded-lg border border-cyan-500/30">
                    {dailyPlan.travelInfo.map((travelLeg, legIndex) => (
                        <div key={legIndex} className={legIndex > 0 ? "mt-4 pt-4 border-t border-slate-700" : ""}>
                            <div className="flex items-center mb-3">
                                <TransportIcon />
                                <h4 className="font-bold text-cyan-300 text-lg">Travel: {travelLeg.fromCity} to {travelLeg.toCity}</h4>
                            </div>
                            <div className="space-y-4">
                                {travelLeg.options.map((option, index) => (
                                    <div key={index} className="p-3 bg-slate-900/40 rounded-lg border border-slate-700">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                            <span className="font-bold text-white">{option.mode}</span>
                                            <div className="flex items-center gap-4 text-sm flex-shrink-0">
                                                 <div className="flex items-center gap-1.5 text-slate-300">
                                                    <StopwatchIcon />
                                                    <span>{option.duration}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-300 font-mono bg-slate-700/50 px-2 py-1 rounded">
                                                    <CostDisplay usd={option.cost} currencyInfo={currencyInfo} />
                                                </div>
                                            </div>
                                        </div>
                                        {option.description && (
                                            <p className="mt-2 text-xs text-slate-400 select-text">{option.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-grow mr-4">
                    <h3 className="text-2xl font-semibold text-white">{dailyPlan.title}</h3>
                    {dailyPlan.weatherForecast && (
                        <div className="flex items-center text-slate-400 mt-1 text-sm">
                            <WeatherIcon />
                            <span>{dailyPlan.weatherForecast}</span>
                        </div>
                    )}
                </div>
                {dailyPlan.activities.length > 0 && (
                     <button
                        onClick={onShowMap}
                        className="flex-shrink-0 flex items-center gap-2 bg-slate-700/80 hover:bg-cyan-600 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-all"
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
                        currencyInfo={currencyInfo}
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

            {dailyPlan.keepInMind && dailyPlan.keepInMind.length > 0 && (
                <div className="mt-6 p-4 bg-slate-800/70 rounded-lg border border-slate-700">
                    <div className="flex items-center mb-3">
                        <InfoIcon />
                        <h4 className="font-bold text-yellow-300">Keep In Mind</h4>
                    </div>
                    <ul className="space-y-3">
                        {dailyPlan.keepInMind.map((item, index) => {
                            let IconComponent;
                            let iconColor;

                            switch (item.type) {
                                case 'do':
                                    IconComponent = CheckCircleIcon;
                                    iconColor = 'text-green-400';
                                    break;
                                case 'dont':
                                    IconComponent = XCircleIcon;
                                    iconColor = 'text-red-400';
                                    break;
                                case 'warning':
                                    IconComponent = ExclamationTriangleIcon;
                                    iconColor = 'text-amber-400';
                                    break;
                                case 'info':
                                default:
                                    IconComponent = LightbulbTipIcon;
                                    iconColor = 'text-sky-400';
                                    break;
                            }

                            return (
                                <li key={index} className="flex items-start gap-3">
                                    <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                                        <IconComponent />
                                    </div>
                                    <span className="text-slate-300 text-sm select-text">
                                        {item.tip}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
             <div className="mt-6">
                <div className="flex items-center mb-2">
                    <PencilIcon />
                    <h4 className="font-bold text-cyan-300">My Personal Notes</h4>
                </div>
                <textarea
                    value={dailyPlan.userNotes || ''}
                    onChange={(e) => onUpdateUserNote(dayIndex, e.target.value)}
                    rows={3}
                    className="w-full bg-slate-700/80 border border-slate-600 rounded-lg py-2 px-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                    placeholder="Add any personal reminders or notes for this day..."
                />
            </div>
        </div>
    );
};

// --- Main Travel Plan Component ---

const TravelPlanComponent: React.FC<TravelPlanProps> = ({ plan, destination, timeOfYear, onReset, onBack, onDeleteActivity, onReorderActivities, onUpdateUserNote, onRebuildPlan, onDiscardChanges, onOpenSaveModal, isPlanModified, isLoading, onError, onUpdatePackingList, onTogglePackingItem, onAddItemToPackingList, onRemovePackingItem, citiesMarkedForRemoval, onToggleCityForRemoval }) => {
    const totalEstimatedCostUsd = destination.averageCost > 0
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


    const showRebuildButton = isPlanModified || refinementNotes.trim() !== '' || citiesMarkedForRemoval.size > 0;

    const { currencyInfo } = destination;
    const localToInrRate = currencyInfo.usdToInrRate / currencyInfo.usdToLocalRate;
    const inrToLocalRate = 1 / localToInrRate;

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
            if (day.travelInfo && day.travelInfo.length > 0) {
              const dayTravelCost = day.travelInfo.reduce((legSum, travelLeg) => {
                  if (travelLeg.options && travelLeg.options.length > 0) {
                      const cheapestOption = Math.min(...travelLeg.options.map(opt => opt.cost));
                      return legSum + cheapestOption;
                  }
                  return legSum;
              }, 0);
              return sum + dayTravelCost;
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

    const handleDiscard = () => {
        setRefinementNotes('');
        onDiscardChanges();
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

    const handleCityClick = (cityName: string) => {
        const firstDayIndex = plan.itinerary.findIndex(day => 
            day.activities.some(activity => activity.city === cityName)
        );

        if (firstDayIndex !== -1) {
            const dayCards = document.querySelectorAll('[data-day-card]');
            const targetCard = dayCards[firstDayIndex] as HTMLElement;
            if (targetCard) {
                targetCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    };

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        try {
            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = pdfWidth - margin * 2;
    
            // --- Color Palette for Light Theme ---
            const PRIMARY_TEXT_COLOR = '#1f2937'; // slate-800
            const SECONDARY_TEXT_COLOR = '#6b7280'; // slate-500
            const HEADER_COLOR = '#0369a1'; // sky-700
            const LINK_COLOR = '#0ea5e9'; // sky-500
            const BORDER_COLOR = '#e5e7eb'; // slate-200
            const WARNING_COLOR = '#b45309'; // amber-700
    
            let yPos = margin;
    
            const checkAndAddPage = (neededHeight = 20) => {
                if (yPos + neededHeight > pdfHeight - margin) {
                    pdf.addPage();
                    yPos = margin;
                    return true; // page was added
                }
                return false;
            };
    
            // --- 1. Cover Page ---
            pdf.setTextColor(PRIMARY_TEXT_COLOR);
            pdf.setFontSize(32);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Your Trip to ${destination.name}`, pdfWidth / 2, pdfHeight / 2 - 20, { align: 'center' });
            pdf.setFontSize(18);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(SECONDARY_TEXT_COLOR);
            pdf.text(`${plan.itinerary.length} Day Adventure`, pdfWidth / 2, pdfHeight / 2 + 10, { align: 'center' });
    
            // --- 2. Summary Page (Text-based) ---
            pdf.addPage();
            yPos = margin;
            
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(PRIMARY_TEXT_COLOR);
            pdf.text("Trip Summary", pdfWidth / 2, yPos, { align: 'center' });
            yPos += 40;
    
            // --- Trip Route ---
            const citiesVisited = plan.itinerary
                .flatMap(day => day.activities.map(activity => activity.city))
                .reduce((uniqueCities, city) => {
                    if (city && (uniqueCities.length === 0 || uniqueCities[uniqueCities.length - 1] !== city)) {
                        uniqueCities.push(city);
                    }
                    return uniqueCities;
                }, [] as string[]);
            
            if (citiesVisited.length > 1) {
                checkAndAddPage(60);
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(HEADER_COLOR);
                pdf.text('Trip Route', margin, yPos);
                yPos += 25;
                
                pdf.setFontSize(11);
                pdf.setTextColor(PRIMARY_TEXT_COLOR);
                const routeText = citiesVisited.join(' to ');
                const splitRoute = pdf.splitTextToSize(routeText, contentWidth);
                pdf.text(splitRoute, margin, yPos);
                yPos += splitRoute.length * 15 + 15;
            }
    
            // --- Accommodation Costs ---
            if (plan.cityAccommodationCosts && plan.cityAccommodationCosts.length > 0) {
                checkAndAddPage(60 + plan.cityAccommodationCosts.length * 20);
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(HEADER_COLOR);
                pdf.text('Estimated Accommodation Costs', margin, yPos);
                yPos += 25;
    
                pdf.setFontSize(10);
                plan.cityAccommodationCosts.forEach(cost => {
                    checkAndAddPage(20);
                    pdf.setTextColor(PRIMARY_TEXT_COLOR);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(cost.city, margin, yPos);
                    
                    const costText = `~₹${(cost.estimatedCost * currencyInfo.usdToInrRate).toLocaleString('en-IN', {maximumFractionDigits: 0})} for ${cost.nights} night${cost.nights > 1 ? 's' : ''}`;
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(SECONDARY_TEXT_COLOR);
                    pdf.text(costText, pdfWidth - margin, yPos, { align: 'right' });
                    yPos += 20;
                });
                yPos += 15;
            }
    
            // --- Official Resources ---
            if (plan.officialLinks && plan.officialLinks.length > 0) {
                checkAndAddPage(60 + plan.officialLinks.length * 15);
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(HEADER_COLOR);
                pdf.text('Official Resources', margin, yPos);
                yPos += 25;
    
                pdf.setFontSize(10);
                plan.officialLinks.forEach(link => {
                    checkAndAddPage(15);
                    pdf.setTextColor(LINK_COLOR);
                    pdf.textWithLink(link.title, margin, yPos, { url: link.url });
                    yPos += 15;
                });
                yPos += 15;
            }
            
            // --- Final Cost Summary ---
            checkAndAddPage(150);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(HEADER_COLOR);
            pdf.text('Final Estimated Cost Summary', margin, yPos);
            yPos += 25;
    
            const summaryItems = [
                { label: 'Accommodation', value: costSummary.accommodation },
                { label: 'Activities', value: costSummary.activities },
                { label: 'Inter-city Travel', value: costSummary.travel },
                { label: 'Food & Dining', value: costSummary.food },
            ];
            
            pdf.setFontSize(10);
            summaryItems.forEach(item => {
                checkAndAddPage(20);
                pdf.setTextColor(PRIMARY_TEXT_COLOR);
                pdf.setFont('helvetica', 'normal');
                pdf.text(item.label, margin, yPos);
    
                pdf.setFont('helvetica', 'bold');
                pdf.text(`₹${(item.value * currencyInfo.usdToInrRate).toLocaleString('en-IN', {maximumFractionDigits: 0})}`, pdfWidth - margin, yPos, { align: 'right' });
                yPos += 20;
            });
    
            yPos += 10;
            pdf.setDrawColor(BORDER_COLOR);
            pdf.line(margin, yPos, pdfWidth - margin, yPos);
            yPos += 20;
    
            checkAndAddPage(25);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(PRIMARY_TEXT_COLOR);
            pdf.text('Grand Total (per person)', margin, yPos);
            pdf.setFontSize(14);
            pdf.text(`~₹${(costSummary.grandTotal * currencyInfo.usdToInrRate).toLocaleString('en-IN', {maximumFractionDigits: 0})}`, pdfWidth - margin, yPos, { align: 'right' });
            yPos += 25;
    
    
            // --- 3. Itinerary Pages ---
            pdf.addPage();
            yPos = margin;
    
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(PRIMARY_TEXT_COLOR);
            pdf.text("Detailed Itinerary", pdfWidth / 2, yPos, { align: 'center' });
            yPos += 40;
    
            plan.itinerary.forEach((day, index) => {
                // Start each new day on a new page, except for Day 1.
                if (index > 0) {
                    pdf.addPage();
                    yPos = margin;
                } else {
                    // For Day 1, just ensure there's enough space after the main title.
                    checkAndAddPage(60);
                }
    
                pdf.setFontSize(18);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(HEADER_COLOR);
                pdf.text(`Day ${day.day}: ${day.title}`, margin, yPos);
                yPos += 25;

                if (day.weatherForecast) {
                    checkAndAddPage(15);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'italic');
                    pdf.setTextColor(SECONDARY_TEXT_COLOR);
                    pdf.text(day.weatherForecast, margin, yPos);
                    yPos += 15;
                }
                
                pdf.setDrawColor(BORDER_COLOR);
                pdf.line(margin, yPos, pdfWidth - margin, yPos);
                yPos += 20;
    
                if (day.travelInfo) {
                    checkAndAddPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(PRIMARY_TEXT_COLOR);
                    pdf.text('Travel Information', margin, yPos);
                    yPos += 20;
    
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(SECONDARY_TEXT_COLOR);
                    pdf.text(`${day.travelInfo.fromCity} to ${day.travelInfo.toCity}`, margin + 10, yPos);
                    yPos += 15;
    
                    day.travelInfo.options.forEach(opt => {
                        checkAndAddPage(40); // Estimate needed space for one option

                        let currentX = margin + 20;
                        pdf.setFontSize(10);

                        // --- Render BOLD part ---
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor(PRIMARY_TEXT_COLOR);
                        const costInr = (opt.cost * currencyInfo.usdToInrRate).toLocaleString('en-IN', {maximumFractionDigits: 0});
                        const boldText = `${opt.mode}: ${opt.duration}, ~₹${costInr}`;
                        
                        pdf.text(boldText, currentX, yPos);
                        currentX += pdf.getTextWidth(boldText) + 4; // Add 4pt space

                        // --- Render NORMAL part (description) ---
                        if (opt.description) {
                            pdf.setFont('helvetica', 'normal');
                            pdf.setTextColor(SECONDARY_TEXT_COLOR);
                            const normalText = `(${opt.description})`;

                            const remainingWidth = pdfWidth - margin - currentX;

                            // Handle cases where there's no space left on the line
                            if (remainingWidth < 20) {
                                yPos += 12;
                                currentX = margin + 20;
                                const splitDesc = pdf.splitTextToSize(normalText, contentWidth - 20);
                                checkAndAddPage(splitDesc.length * 12);
                                pdf.text(splitDesc, currentX, yPos);
                                yPos += splitDesc.length * 12;
                            } else {
                                const splitText = pdf.splitTextToSize(normalText, remainingWidth);
                                pdf.text(splitText[0], currentX, yPos); // Print the first line part

                                if (splitText.length > 1) {
                                    yPos += 12; // Move to next line
                                    const restOfText = splitText.slice(1);
                                    // The rest of the description gets the full width
                                    const subsequentSplit = pdf.splitTextToSize(restOfText.join(' '), contentWidth - 20);
                                    checkAndAddPage(subsequentSplit.length * 12);
                                    pdf.text(subsequentSplit, margin + 20, yPos);
                                    yPos += subsequentSplit.length * 12;
                                }
                            }
                        }
                        
                        yPos += 14; // Space before the next option
                    });
                    yPos += 10;
                }
                
                day.activities.forEach(activity => {
                    checkAndAddPage(80);
                    
                    pdf.setFontSize(12);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(HEADER_COLOR);
                    pdf.text(activity.name, margin, yPos);
                    yPos += 18;
    
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(SECONDARY_TEXT_COLOR);
                    const costText = activity.averageCost > 0 ? `~₹${(activity.averageCost * currencyInfo.usdToInrRate).toLocaleString('en-IN', {maximumFractionDigits: 0})}` : 'Free';
                    const details = `${activity.type} | ${activity.duration} | ${costText}`;
                    pdf.text(details, margin, yPos);
                    yPos += 15;
    
                    pdf.setTextColor(PRIMARY_TEXT_COLOR);
                    const descLines = pdf.splitTextToSize(activity.description, contentWidth);
                    checkAndAddPage(descLines.length * 12);
                    pdf.text(descLines, margin, yPos);
                    yPos += descLines.length * 12 + 5;
    
                    if (activity.links && activity.links.length > 0) {
                        activity.links.forEach(link => {
                            checkAndAddPage(12);
                            pdf.setTextColor(LINK_COLOR);
                            pdf.textWithLink(link.title, margin, yPos, { url: link.url });
                            yPos += 12;
                        });
                    }

                    if (activity.averageCost > 0 && activity.costBreakdown) {
                        const breakdownItems = [
                            { label: 'Activity / Ticket', value: activity.costBreakdown.activities },
                            { label: 'Food / Dining', value: activity.costBreakdown.food },
                            { label: 'Accommodation', value: activity.costBreakdown.accommodation }
                        ].filter(item => item.value > 0);

                        if (breakdownItems.length > 0) {
                            yPos += 10;
                            checkAndAddPage(15 + breakdownItems.length * 12);
                            
                            pdf.setFontSize(10);
                            pdf.setFont('helvetica', 'bold');
                            pdf.setTextColor(PRIMARY_TEXT_COLOR);
                            pdf.text('Cost Breakdown (est. per person)', margin, yPos);
                            yPos += 15;

                            pdf.setFontSize(9);
                            pdf.setFont('helvetica', 'normal');

                            breakdownItems.forEach(item => {
                                checkAndAddPage(12);
                                pdf.setTextColor(SECONDARY_TEXT_COLOR);
                                pdf.text(item.label, margin + 10, yPos);

                                pdf.setTextColor(PRIMARY_TEXT_COLOR);
                                pdf.setFont('helvetica', 'bold');
                                pdf.text(`₹${(item.value * currencyInfo.usdToInrRate).toLocaleString('en-IN', {maximumFractionDigits: 0})}`, pdfWidth - margin, yPos, { align: 'right' });
                                yPos += 12;
                                pdf.setFont('helvetica', 'normal');
                            });
                        }
                    }

                    yPos += 15;
                });
    
                if (day.keepInMind && day.keepInMind.length > 0) {
                    checkAndAddPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(WARNING_COLOR);
                    pdf.text('Keep In Mind', margin, yPos);
                    yPos += 20;
    
                    pdf.setFontSize(10);
                    pdf.setTextColor(PRIMARY_TEXT_COLOR);
                    const mindItems = day.keepInMind.map(item => item.tip);
                    mindItems.forEach(item => {
                        const text = item.replace(/^\s*\*\s*/, '').trim();
                        const splitText = pdf.splitTextToSize(text, contentWidth - 20);
                        checkAndAddPage(splitText.length * 12 + 5);
                        pdf.text(splitText, margin + 20, yPos);
                        yPos += splitText.length * 12;
                    });
                     yPos += 10;
                }
                
                if (day.userNotes) {
                    checkAndAddPage(30);
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(PRIMARY_TEXT_COLOR);
                    pdf.text('My Notes', margin, yPos);
                    yPos += 20;

                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'normal');
                    const noteLines = pdf.splitTextToSize(day.userNotes, contentWidth);
                    checkAndAddPage(noteLines.length * 12);
                    pdf.text(noteLines, margin + 10, yPos);
                    yPos += noteLines.length * 12 + 10;
                }
            });
    
            // --- 4. Packing List Page ---
            if (plan.packingList && plan.packingList.length > 0) {
                pdf.addPage();
                yPos = margin;
                
                pdf.setTextColor(PRIMARY_TEXT_COLOR);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(24);
                pdf.text('Packing List', pdfWidth / 2, yPos, { align: 'center' });
                yPos += 40;
                
                plan.packingList.forEach(category => {
                    checkAndAddPage(40);
    
                    pdf.setFontSize(16);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(HEADER_COLOR);
                    pdf.text(category.categoryName, margin, yPos);
                    yPos += 25;
    
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'normal');
                    pdf.setTextColor(PRIMARY_TEXT_COLOR);
    
                    category.items.forEach(item => {
                        checkAndAddPage(15);
                        pdf.text(item, margin + 20, yPos);
                        yPos += 15;
                    });
                    yPos += 10;
                });
            }
    
            pdf.save(`trip-to-${destination.name}.pdf`);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            onError("Failed to generate PDF. Please try again.");
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
                            {timeOfYear && (
                                <div className="flex items-center gap-2">
                                    <SeasonIcon />
                                    <span className="text-lg">{timeOfYear}</span>
                                </div>
                            )}
                            {totalEstimatedCostUsd > 0 && (
                                <div className="flex items-center gap-2">
                                    <MoneyIcon />
                                    <span className="text-lg">
                                        Est. Budget: <CostDisplay usd={totalEstimatedCostUsd} currencyInfo={currencyInfo} className="font-semibold" />
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 text-sm text-cyan-200 bg-cyan-900/50 inline-block px-3 py-1 rounded-full">
                           <p>
                             <strong>Conversion Rates (approx.):</strong> 1 {currencyInfo.code} ≈ ₹{localToInrRate.toFixed(2)} | ₹1 ≈ {currencyInfo.symbol}{inrToLocalRate.toFixed(2)}
                           </p>
                        </div>
                    </div>

                    <div id="pdf-summary-content">
                        <TripTimelineChart
                            itinerary={plan.itinerary}
                            citiesMarkedForRemoval={citiesMarkedForRemoval}
                            onToggleCity={onToggleCityForRemoval}
                            isLoading={isLoading}
                            onCityClick={handleCityClick}
                        />

                        <TripOverviewMap
                            itinerary={plan.itinerary}
                            cityAccommodationCosts={plan.cityAccommodationCosts || []}
                            currencyInfo={destination.currencyInfo}
                        />

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
                                                <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                                    <CostDisplay usd={cost.estimatedCost} currencyInfo={currencyInfo} />
                                                </span>
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
                        
                        <div className="mt-10 p-6 bg-slate-800 rounded-xl border border-slate-700">
                            <div className="flex items-center mb-4">
                                <ChartPieIcon />
                                <h3 className="text-xl font-bold text-cyan-300">Final Estimated Cost Summary</h3>
                            </div>
                            <ul className="space-y-3 mb-4">
                                <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                    <span className="font-semibold text-slate-200">🏠 Accommodation</span>
                                    <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                        <CostDisplay usd={costSummary.accommodation} currencyInfo={currencyInfo} />
                                    </span>
                                </li>
                                <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                    <span className="font-semibold text-slate-200">🎟️ Activities</span>
                                    <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                        <CostDisplay usd={costSummary.activities} currencyInfo={currencyInfo} />
                                    </span>
                                </li>
                                <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                    <span className="font-semibold text-slate-200">✈️ Inter-city Travel</span>
                                    <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                        <CostDisplay usd={costSummary.travel} currencyInfo={currencyInfo} />
                                    </span>
                                </li>
                                <li className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg">
                                    <span className="font-semibold text-slate-200">🍜 Food & Dining</span>
                                    <span className="font-mono text-white bg-slate-900/40 px-3 py-1 rounded-md text-sm">
                                        <CostDisplay usd={costSummary.food} currencyInfo={currencyInfo} />
                                    </span>
                                </li>
                            </ul>
                            <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                                <span className="text-lg font-bold text-cyan-300">Grand Total (per person)</span>
                                <span className="text-xl font-bold font-mono text-white bg-cyan-600/50 px-4 py-2 rounded-lg">
                                    <CostDisplay usd={costSummary.grandTotal} currencyInfo={currencyInfo} />
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
                            <p className="text-slate-300 select-text">{plan.optimizationSuggestions}</p>
                        </div>
                    </div>


                    <div className="space-y-8 mt-10">
                        {plan.itinerary.map((dailyPlan, index) => (
                            <div key={dailyPlan.day} data-day-card>
                                <DailyPlanCard
                                    dailyPlan={dailyPlan}
                                    dayIndex={index}
                                    currencyInfo={currencyInfo}
                                    draggedActivityId={draggedActivityId}
                                    setDraggedActivityId={setDraggedActivityId}
                                    dragOverActivityId={dragOverActivityId}
                                    setDragOverActivityId={setDragOverActivityId}
                                    onDeleteActivity={onDeleteActivity}
                                    onReorderActivities={onReorderActivities}
                                    onUpdateUserNote={onUpdateUserNote}
                                    highlightedActivityId={highlightedActivityId}
                                    onActivityHighlight={handleHighlightActivity}
                                    onShowMap={() => handleShowMap(index)}
                                />
                            </div>
                        ))}
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
                         <>
                            <button
                                onClick={handleRebuildClick}
                                disabled={isLoading || isDownloading || isPackingListLoading}
                                className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               Rebuild Itinerary
                            </button>
                             <button
                                onClick={handleDiscard}
                                disabled={isLoading || isDownloading || isPackingListLoading}
                                className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" />
                                </svg>
                                Discard Changes
                            </button>
                        </>
                    )}
                    <button
                        onClick={onOpenSaveModal}
                        disabled={isLoading || isDownloading || isPackingListLoading}
                        className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M17 3H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H7a1 1 0 100 2h3.586l3 3H5V5h12v2.414zM11 13a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        Save Plan
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
                    onRemoveItem={onRemovePackingItem}
                />
            )}
        </>
    );
};

export default TravelPlanComponent;
