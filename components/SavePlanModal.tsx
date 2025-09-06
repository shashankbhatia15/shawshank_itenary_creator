import React, { useState, useEffect } from 'react';

interface SavePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planName: string) => void;
  defaultName: string;
}

const SavePlanModal: React.FC<SavePlanModalProps> = ({ isOpen, onClose, onSave, defaultName }) => {
  const [planName, setPlanName] = useState(defaultName);

  useEffect(() => {
    if (isOpen) {
      setPlanName(defaultName);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (planName.trim()) {
      onSave(planName.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-plan-title"
    >
      <div
        className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="save-plan-title" className="text-2xl font-bold text-cyan-300 mb-4">Name Your Itinerary</h2>
        <p className="text-slate-400 mb-6">Enter a name for your plan file. Your browser will then ask where to save it.</p>
        <div>
          <label htmlFor="planName" className="sr-only">Plan Name</label>
          <input
            type="text"
            id="planName"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
            autoFocus
          />
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!planName.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavePlanModal;
