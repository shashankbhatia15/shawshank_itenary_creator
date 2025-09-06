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

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('input');
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<DestinationSuggestion | null>(null);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlanModified, setIsPlanModified] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State to hold original plan inputs for rebuild
  const [itineraryStyle, setItineraryStyle] = useState<ItineraryStyle>('Mixed');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleGetSuggestions = async (budget: string, timeOfYear: string, continent: string, country: string) => {
    setError(null);
    setIsLoading(true);
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
      setStep('plan');
      setIsPlanModified(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('duration'); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteActivity = (dayIndex: number, activityId: string) => {
    if (!plan) return;
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
  
  const handleRebuildPlan = async (refinementNotes: string) => {
      if (!plan || !selectedDestination) return;
      setIsLoading(true);
      setError(null);
      
      const combinedNotes = [additionalNotes, refinementNotes]
          .filter(Boolean) // Remove empty strings to avoid extra whitespace/labels
          .join('\n\nAdditional Refinements:\n');

      try {
          const result = await rebuildTravelPlan(
              selectedDestination.name,
              plan.itinerary.length,
              itineraryStyle,
              plan.itinerary,
              combinedNotes
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
          setIsPlanModified(false);
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          throw err; // Re-throw to allow the component to handle UI state
      } finally {
          setIsLoading(false);
      }
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

  const handleSavePlanToFile = (name: string) => {
    if (!plan || !selectedDestination) return;

    const planToSave: SavedPlan = {
        id: crypto.randomUUID(),
        name: name,
        plan,
        destination: selectedDestination,
        savedAt: new Date().toISOString(),
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
                    itinerary: loadedData.plan.itinerary.map((day: DailyPlan) => ({
                        ...day,
                        activities: day.activities.map((activity: ItineraryLocation) => ({
                            ...activity,
                            id: activity.id || crypto.randomUUID(),
                        })),
                    })),
                };

                setPlan(planWithIds);
                setSelectedDestination(loadedData.destination);
                setStep('plan');
                setError(null);
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
    setError(null);
    setIsPlanModified(false);
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
        break;
      case 'plan':
        setStep('duration');
        setPlan(null);
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
          return <DurationInput destination={selectedDestination} onGetPlan={handleGetPlan} isLoading={isLoading} onBack={handleBack} />;
        }
        handleReset();
        return null;
      case 'plan':
        if (plan && selectedDestination) {
          return <TravelPlanComponent 
            plan={plan} 
            destination={selectedDestination} 
            onReset={handleReset} 
            onBack={handleBack}
            onDeleteActivity={handleDeleteActivity}
            onReorderActivities={handleReorderActivities}
            onRebuildPlan={handleRebuildPlan}
            onOpenSaveModal={() => setIsSaveModalOpen(true)}
            isPlanModified={isPlanModified}
            isLoading={isLoading}
            onError={setError}
            onUpdatePackingList={handleUpdatePackingList}
            onTogglePackingItem={handleTogglePackingItem}
            onAddItemToPackingList={handleAddItemToPackingList}
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
        <header className="w-full max-w-6xl mx-auto text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
                Shawshank <span className="text-cyan-400">Travel Planner</span>
            </h1>
            <p className="mt-4 text-lg text-slate-300">Your AI-powered guide to the world.</p>
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