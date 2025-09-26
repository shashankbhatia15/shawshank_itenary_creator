import React, { useMemo, useState, useEffect } from 'react';
import type { PackingListCategory } from '../types';

interface PackingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: PackingListCategory[];
  destinationName: string;
  checkedItems: Record<string, boolean>;
  onToggleItem: (item: string) => void;
  onAddItem: (categoryName: string, item: string) => void;
  onRemoveItem: (item: string) => void;
}

const PackingListModal: React.FC<PackingListModalProps> = ({ isOpen, onClose, list, destinationName, checkedItems, onToggleItem, onAddItem, onRemoveItem }) => {
  const [newItem, setNewItem] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(list[0]?.categoryName || '');

  useEffect(() => {
    const categoryExists = list.some(c => c.categoryName === selectedCategory);
    if ((!selectedCategory || !categoryExists) && list.length > 0) {
      setSelectedCategory(list[0].categoryName);
    }
  }, [list, selectedCategory]);

  const handleCheckboxChange = (item: string) => {
    onToggleItem(item);
  };

  const handleAddItem = () => {
    if (newItem.trim() && selectedCategory) {
      onAddItem(selectedCategory, newItem.trim());
      setNewItem('');
    }
  };
  
  const totalItems = useMemo(() => list.reduce((sum, category) => sum + category.items.length, 0), [list]);
  const packedItems = useMemo(() => Object.values(checkedItems).filter(Boolean).length, [checkedItems]);
  const progress = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="packing-list-title"
    >
      <div
        className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col overflow-hidden">
          <div>
            <div className="flex justify-between items-start mb-4">
                <h2 id="packing-list-title" className="text-2xl sm:text-3xl font-bold text-cyan-300">
                  Packing List for {destinationName}
                </h2>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors"
                    aria-label="Close packing list"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center text-sm text-slate-300 mb-1">
                  <span>Packing Progress</span>
                  <span>{packedItems} / {totalItems}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                  <div 
                      className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${progress}%` }}
                  ></div>
              </div>
            </div>
          </div>
        
          <div className="overflow-y-auto pr-2 -mr-2 flex-grow">
            {list.map(category => (
              <div key={category.categoryName} className="mb-6">
                <h3 className="text-xl font-semibold text-white border-b-2 border-slate-700 pb-2 mb-3">
                  {category.categoryName}
                </h3>
                <ul className="space-y-1 columns-1 sm:columns-2">
                  {category.items.map(item => (
                    <li key={item} className="group flex items-center justify-between break-inside-avoid pr-2">
                      <label className="flex items-center text-slate-300 hover:text-white cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={!!checkedItems[item]}
                          onChange={() => handleCheckboxChange(item)}
                          className="h-4 w-4 flex-shrink-0 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-600 mr-3"
                        />
                        <span className={checkedItems[item] ? 'line-through text-slate-500' : ''}>
                          {item}
                        </span>
                      </label>
                       <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                        aria-label={`Remove ${item}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-700">
          <div className="space-y-3 mb-6">
            <label htmlFor="newItemInput" className="block text-lg font-semibold text-white">Add Custom Item</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="newItemInput"
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
                placeholder="e.g., Extra Socks"
                className="flex-grow bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                aria-label="Select category"
              >
                {list.map((cat) => (
                  <option key={cat.categoryName} value={cat.categoryName}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end items-center gap-4">
            <button
              onClick={onClose}
              className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleAddItem}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingListModal;