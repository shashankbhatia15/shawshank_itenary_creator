import React, { useState, useEffect, useRef } from 'react';
import type { AppStep, DestinationSuggestion, TravelPlan, ItineraryStyle, DailyPlan, ItineraryLocation, SavedPlan, PackingListCategory } from './types';
import { getTravelSuggestions, getTravelPlan, getDirectCountryInfo, rebuildTravelPlan, getOffBeatSuggestions, getComprehensiveTravelPlan } from './services/geminiService';
import TripInputForm from './components/TripInputForm';
import DestinationSuggestions from './components/DestinationSuggestions';
import TravelPlanComponent from './components/TravelPlan';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import DurationInput from './components/DurationInput';
import SavePlanModal from './components/SavePlanModal';
import Logo from './components/Logo';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('input');
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<DestinationSuggestion | null>(null);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [originalPlan, setOriginalPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlanModified, setIsPlanModified] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [deletedActivityIds, setDeletedActivityIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [citiesMarkedForRemoval, setCitiesMarkedForRemoval] = useState<Set<number>>(new Set());

  // State to hold original plan inputs for rebuild
  const [itineraryStyle, setItineraryStyle] = useState<ItineraryStyle>('Mixed');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [timeOfYear, setTimeOfYear] = useState('');

  const handleGetSuggestions = async (budget: string, timeOfYear: string, continent: string, country: string) => {
    setError(null);
    setIsLoading(true);
    setTimeOfYear(timeOfYear);
    const trimmedCountry = country.trim();

    try {
      if (trimmedCountry) {
        const countryInfo = await getDirectCountryInfo(trimmedCountry);
        
        const directDestination: DestinationSuggestion = {
          name: trimmedCountry,
          country: trimmedCountry,
          description: countryInfo.description,
          visaInfo: countryInfo.visaInfo,
          averageCost: countryInfo.averageCost,
          costBreakdown: countryInfo.costBreakdown,
          currencyInfo: countryInfo.currencyInfo,
        };
        handleSelectDestination(directDestination);
      } else {
        const result = await getTravelSuggestions(budget, timeOfYear, continent);
        setSuggestions(result);
        setStep('suggestions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetOffBeatSuggestions = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await getOffBeatSuggestions();
      setSuggestions(result);
      setStep('suggestions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDestination = (destination: DestinationSuggestion) => {
    setSelectedDestination(destination);
    setStep('duration');
  };

  const handleGetPlan = async (duration: number, style: ItineraryStyle, notes: string) => {
    if (!selectedDestination) return;
    setIsLoading(true);
    setError(null);
    setItineraryStyle(style);
    setAdditionalNotes(notes);
    try {
      let result;
      if (duration === 0) { // Special value for AI-decided duration
        result = await getComprehensiveTravelPlan(selectedDestination.name, style, notes);
      } else {
        result = await getTravelPlan(selectedDestination.name, duration, style, notes);
      }
      
      // Add unique IDs to each activity for stable rendering and D&D
      const planWithIds: TravelPlan = {
        ...result,
        itinerary: result.itinerary.map(day => ({
          ...day,
          activities: day.activities.map(activity => ({
            ...activity,
            id: crypto.randomUUID(),
          })),
        })),
      };

      setPlan(planWithIds);
      setOriginalPlan(JSON.parse(JSON.stringify(planWithIds)));
      setStep('plan');
      setIsPlanModified(false);
      setCitiesMarkedForRemoval(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('duration'); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteActivity = (dayIndex: number, activityId: string) => {
    if (!plan) return;

    const activityToDelete = plan.itinerary[dayIndex].activities.find(a => a.id === activityId);
    if (activityToDelete) {
        // Create a unique, non-random identifier for tracking deleted activities
        const uniqueIdentifier = `${activityToDelete.name.toLowerCase().trim()}|${activityToDelete.city.toLowerCase().trim()}`;
        setDeletedActivityIds(prev => new Set(prev).add(uniqueIdentifier));
    }
    
    const newPlan = { ...plan };
    const newActivities = newPlan.itinerary[dayIndex].activities.filter(a => a.id !== activityId);
    newPlan.itinerary[dayIndex].activities = newActivities;
    setPlan(newPlan);
    setIsPlanModified(true);
  };

  const handleReorderActivities = (dayIndex: number, reorderedActivities: ItineraryLocation[]) => {
    if (!plan) return;
    const newPlan = { ...plan };
    newPlan.itinerary[dayIndex].activities = reorderedActivities;
    setPlan(newPlan);
    setIsPlanModified(true);
  };

  const handleUpdateUserNote = (dayIndex: number, note: string) => {
    if (!plan) return;
    const newPlan = { ...plan };
    const newItinerary = [...newPlan.itinerary];
    newItinerary[dayIndex] = { ...newItinerary[dayIndex], userNotes: note };
    newPlan.itinerary = newItinerary;
    setPlan(newPlan);
    setIsPlanModified(true);
  };
  
  const handleRebuildPlan = async (refinementNotes: string) => {
      if (!plan || !selectedDestination) return;
      setIsLoading(true);
      setError(null);
      
      let finalNotes = refinementNotes || 'No specific notes provided.';

      if (citiesMarkedForRemoval.size > 0) {
        const citiesVisited = plan.itinerary
            .flatMap(day => day.activities.map(activity => activity.city))
            .reduce((uniqueCities: string[], city) => {
                if (city && (uniqueCities.length === 0 || uniqueCities[uniqueCities.length - 1] !== city)) {
                    uniqueCities.push(city);
                }
                return uniqueCities;
            }, [] as string[]);
        
        // FIX: Explicitly typing `index` as `number` to prevent a type inference issue.
        const removalInstructions = Array.from(citiesMarkedForRemoval).map((index: number) => 
            `- The visit to ${citiesVisited[index]} (which is stop number ${index + 1} in the sequence: ${citiesVisited.join(' -> ')})`
        ).join('\n');
        
        const removalPrompt = `CRITICAL TASK: First, you MUST remove the following city stops and all their associated days/activities from the itinerary. This will make the trip shorter.
${removalInstructions}

Once the cities are removed, apply the user's other refinement notes (if any) to the REMAINING plan.
`;
        finalNotes = `${removalPrompt}\n\nOther refinement notes: ${refinementNotes}`;
      }

      try {
          const result = await rebuildTravelPlan(
              selectedDestination.name,
              plan.itinerary.length,
              itineraryStyle,
              plan.itinerary,
              finalNotes,
              Array.from(deletedActivityIds)
          );
          
          const planWithIds: TravelPlan = {
            ...result,
            itinerary: result.itinerary.map(day => ({
              ...day,
              activities: day.activities.map(activity => ({
                ...activity,
                id: crypto.randomUUID(),
              })),
            })),
          };

          setPlan(planWithIds);
          setOriginalPlan(JSON.parse(JSON.stringify(planWithIds)));
          setIsPlanModified(false);
          setCitiesMarkedForRemoval(new Set());
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          throw err; // Re-throw to allow the component to handle UI state
      } finally {
          setIsLoading(false);
      }
  };

  const handleDiscardChanges = () => {
    if (!originalPlan) return;
    setPlan(JSON.parse(JSON.stringify(originalPlan)));
    setIsPlanModified(false);
    setDeletedActivityIds(new Set());
    setCitiesMarkedForRemoval(new Set());
  };

  const handleToggleCityForRemoval = (cityIndex: number) => {
    setCitiesMarkedForRemoval(prev => {
        const newSet = new Set(prev);
        if (newSet.has(cityIndex)) {
            newSet.delete(cityIndex);
        } else {
            newSet.add(cityIndex);
        }
        return newSet;
    });
  };

  const handleUpdatePackingList = (list: PackingListCategory[]) => {
    if (!plan) return;
    setPlan(prevPlan => {
      if (!prevPlan) return null;
      return {
        ...prevPlan,
        packingList: list,
        checkedPackingItems: {}, // Reset checked items when a new list is generated
      };
    });
  };

  const handleTogglePackingItem = (item: string) => {
    if (!plan) return;
    setPlan(prevPlan => {
      if (!prevPlan) return null;
      const newCheckedItems = { ...(prevPlan.checkedPackingItems || {}) };
      newCheckedItems[item] = !newCheckedItems[item];
      return { 
        ...prevPlan,
        checkedPackingItems: newCheckedItems 
      };
    });
  };

  const handleAddItemToPackingList = (categoryName: string, item: string) => {
    if (!plan?.packingList) return;

    setPlan(prevPlan => {
        if (!prevPlan || !prevPlan.packingList) return prevPlan;

        const itemExists = prevPlan.packingList.some(cat => cat.items.includes(item));
        if (itemExists) {
            console.warn(`Item "${item}" already exists in the packing list.`);
            return prevPlan;
        }

        const newPackingList = prevPlan.packingList.map(category => {
            if (category.categoryName === categoryName) {
                return {
                    ...category,
                    items: [...category.items, item].sort()
                };
            }
            return category;
        });

        return {
            ...prevPlan,
            packingList: newPackingList
        };
    });
  };

  const handleRemovePackingItem = (itemToRemove: string) => {
    if (!plan?.packingList) return;

    setPlan(prevPlan => {
      if (!prevPlan || !prevPlan.packingList) return prevPlan;

      // Filter out the item from the correct category
      const newPackingList = prevPlan.packingList.map(category => ({
        ...category,
        items: category.items.filter(item => item !== itemToRemove),
      }));

      // Remove the item from the checked items record
      const newCheckedItems = { ...(prevPlan.checkedPackingItems || {}) };
      delete newCheckedItems[itemToRemove];

      return {
        ...prevPlan,
        packingList: newPackingList,
        checkedPackingItems: newCheckedItems,
      };
    });
  };

  const handleSavePlanToFile = (name: string) => {
    if (!plan || !selectedDestination) return;

    const planToSave: SavedPlan = {
        id: crypto.randomUUID(),
        name: name,
        plan,
        destination: selectedDestination,
        savedAt: new Date().toISOString(),
        timeOfYear: timeOfYear,
        itineraryStyle: itineraryStyle,
        additionalNotes: additionalNotes,
    };

    const blob = new Blob([JSON.stringify(planToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Sanitize the user-provided name for use in a filename
    const sanitizedName = name.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
    const fileName = `${sanitizedName || 'itinerary'}.json`;

    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadPlanFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File content is not text");
            
            const loadedData = JSON.parse(text) as SavedPlan;
            
            // Basic validation
            if (loadedData.plan && loadedData.destination && loadedData.plan.itinerary) {
                const planWithIds: TravelPlan = {
                    ...loadedData.plan,
                    itinerary: loadedData.plan.itinerary.map((day: any) => ({
                        ...day,
                        activities: day.activities.map((activity: ItineraryLocation) => ({
                            ...activity,
                            id: activity.id || crypto.randomUUID(),
                        })),
                        // Migration for travelInfo to ensure it's always an array
                        travelInfo: day.travelInfo ? (Array.isArray(day.travelInfo) ? day.travelInfo : [day.travelInfo]) : undefined,
                    })),
                };

                setPlan(planWithIds);
                setOriginalPlan(JSON.parse(JSON.stringify(planWithIds)));
                setSelectedDestination(loadedData.destination);
                setTimeOfYear(loadedData.timeOfYear || '');
                setItineraryStyle(loadedData.itineraryStyle || 'Mixed');
                setAdditionalNotes(loadedData.additionalNotes || '');
                setStep('plan');
                setError(null);
                setDeletedActivityIds(new Set()); // Reset deleted activities for the new plan
                setCitiesMarkedForRemoval(new Set());
            } else {
                throw new Error("Invalid itinerary file format.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to read or parse the file.");
        }
    };
    reader.onerror = () => {
        setError("Failed to read the file.");
    };
    reader.readAsText(file);

    // Reset the input value to allow loading the same file again
    event.target.value = ''; 
  };


  const handleReset = () => {
    setStep('input');
    setSuggestions([]);
    setSelectedDestination(null);
    setPlan(null);
    setOriginalPlan(null);
    setError(null);
    setIsPlanModified(false);
    setDeletedActivityIds(new Set());
    setCitiesMarkedForRemoval(new Set());
    setTimeOfYear('');
    setItineraryStyle('Mixed');
    setAdditionalNotes('');
  };

  const handleReturnToPlan = () => {
    if (plan) {
        setError(null);
        setStep('plan');
    }
  };

  const handleBack = () => {
    setError(null);
    setIsPlanModified(false); // Reset modified flag when navigating away
    switch (step) {
      case 'suggestions':
        setStep('input');
        setSuggestions([]);
        break;
      case 'duration':
        if (suggestions.length > 0) {
          setStep('suggestions');
        } else {
          setStep('input');
        }
        setSelectedDestination(null);
        setPlan(null);
        setOriginalPlan(null);
        break;
      case 'plan':
        setStep('duration');
        // When navigating away from the plan, discard any un-rebuilt changes.
        if (originalPlan) {
            setPlan(JSON.parse(JSON.stringify(originalPlan)));
        }
        setDeletedActivityIds(new Set());
        setCitiesMarkedForRemoval(new Set());
        break;
      default:
        break;
    }
  };
  
  const renderContent = () => {
    if (isLoading && (step === 'input' || step === 'duration')) {
        return <LoadingSpinner />;
    }
    
    switch (step) {
      case 'input':
        return <TripInputForm 
            onGetSuggestions={handleGetSuggestions} 
            onGetOffBeatSuggestions={handleGetOffBeatSuggestions} 
            isLoading={isLoading} 
            onLoadFromFileClick={() => fileInputRef.current?.click()}
        />;
      case 'suggestions':
        return <DestinationSuggestions suggestions={suggestions} onSelectDestination={handleSelectDestination} isLoading={isLoading} onBack={handleBack} />;
      case 'duration':
        if (selectedDestination) {
          return <DurationInput 
            destination={selectedDestination} 
            onGetPlan={handleGetPlan} 
            isLoading={isLoading} 
            onBack={handleBack} 
            initialStyle={itineraryStyle}
            initialNotes={additionalNotes}
            onReturnToPlan={plan ? handleReturnToPlan : undefined}
          />;
        }
        handleReset();
        return null;
      case 'plan':
        if (plan && selectedDestination) {
          return <TravelPlanComponent 
            plan={plan} 
            destination={selectedDestination} 
            timeOfYear={timeOfYear}
            onReset={handleReset} 
            onBack={handleBack}
            onDeleteActivity={handleDeleteActivity}
            onReorderActivities={handleReorderActivities}
            onUpdateUserNote={handleUpdateUserNote}
            onRebuildPlan={handleRebuildPlan}
            onDiscardChanges={handleDiscardChanges}
            onOpenSaveModal={() => setIsSaveModalOpen(true)}
            isPlanModified={isPlanModified}
            isLoading={isLoading}
            onError={setError}
            onUpdatePackingList={handleUpdatePackingList}
            onTogglePackingItem={handleTogglePackingItem}
            onAddItemToPackingList={handleAddItemToPackingList}
            onRemovePackingItem={handleRemovePackingItem}
            citiesMarkedForRemoval={citiesMarkedForRemoval}
            onToggleCityForRemoval={handleToggleCityForRemoval}
            />;
        }
        handleReset();
        return null;
      default:
        return <TripInputForm 
            onGetSuggestions={handleGetSuggestions} 
            onGetOffBeatSuggestions={handleGetOffBeatSuggestions} 
            isLoading={isLoading} 
            onLoadFromFileClick={() => fileInputRef.current?.click()}
        />;
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleLoadPlanFromFile}
            accept=".json,application/json"
            className="hidden"
            aria-hidden="true"
        />
        <SavePlanModal
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            onSave={handleSavePlanToFile}
            defaultName={
                selectedDestination ? `Trip to ${selectedDestination.name}` : 'My Itinerary'
            }
        />
        <div className="absolute top-0 left-0 w-full h-full bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.3),rgba(255,255,255,0))] -z-10"></div>
        <header className="w-full max-w-6xl mx-auto text-center mb-12 flex flex-col items-center gap-4">
            <Logo />
            <div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
                  Shawshank <span className="text-cyan-400">Travel Planner</span>
              </h1>
              <p className="mt-2 text-lg text-slate-300">Your AI-powered guide to the world.</p>
            </div>
        </header>
        <div className="w-full flex-grow flex items-center justify-center">
            {error && (
                <div className="absolute top-20 z-10">
                    <ErrorDisplay message={error} />
                </div>
            )}
            {renderContent()}
        </div>
    </main>
  );
};

export default App;