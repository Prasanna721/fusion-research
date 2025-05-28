'use client';

import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { CornerDownLeft, X } from 'lucide-react';
import { Squircle } from '@squircle-js/react';
import {
  FocusCategory,
  FocusCategoryType,
  FocusItem,
} from '@/types/research';
import { FaExpand, FaEyeSlash, FaTrashCan } from 'react-icons/fa6';

interface ResearchFocusPanelProps {
  items: FocusItem[];
  onAddItem: (text: string, category: FocusCategory, isResearchContext?: boolean) => void;
  onRemoveItem: (id: string) => void;
  onToggleItemEnabled: (id: string) => void;
  addContextToResearch: string | null;
  handleClearContext: () => void;
}

const BG_CLASS_MAP: Record<FocusCategory, string> = {
  [FocusCategoryType.DOMAIN_1]: 'bg-[#3b82f6]/80 group-hover:bg-[#3b82f6]',
  [FocusCategoryType.DOMAIN_2]: 'bg-[#eab308]/80 group-hover:bg-[#eab308]',
  [FocusCategoryType.RESEARCH_CONTEXT]: 'bg-[#22c55e]/80 group-hover:bg-[#22c55e]',
};

export const ResearchFocusPanel: React.FC<ResearchFocusPanelProps> = ({
  items,
  onAddItem,
  onRemoveItem,
  onToggleItemEnabled,
  addContextToResearch,
  handleClearContext,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addContextToResearch) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [addContextToResearch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddItem(inputValue.trim(), FocusCategoryType.RESEARCH_CONTEXT, false);
      setInputValue('');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div ref={panelRef} className="rounded-lg bg-white shadow-sm mb-6 p-4">
      <h2 className="text-lg font-semibold mb-3">Research Focus</h2>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mb-4">
        {addContextToResearch && (
          <div className="mb-2 p-2.5 max-w-3xl bg-gray-100/80 rounded-lg text-sm text-gray-700 relative">
            <button
              type="button"
              onClick={handleClearContext}
              className="absolute top-1.5 right-1.5 p-2 text-gray-400 hover:text-black hover:bg-black/10 rounded-lg"
              aria-label="Clear context"
            >
              <X size={16} />
            </button>
            <div className="pr-6">
              <span className="font-medium text-gray-600 block mb-0.5">Add Context</span>
              <blockquote className="pl-2 italic border-l-2 border-gray-300 text-gray-600">
                "{addContextToResearch}"
              </blockquote>
            </div>
          </div>
        )}
        <div className="relative max-w-3xl">
          <input
            type="text"
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Add a research note or context..."
            className="w-full px-0 py-2 text-lg md:text-xl text-offblack placeholder-gray-300 font-medium border-none rounded-md focus:ring-0 focus:bg-white transition-colors duration-300"
          />
          {inputValue && (
            <button
              type="submit"
              title="Add Note"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center p-1 text-gray-300 hover:text-gray-600 transition-colors duration-300 text-base md:text-lg"
            >
              <CornerDownLeft size={22} className="mr-1" />
              Enter
            </button>
          )}
        </div>
      </form>

      {items.length === 0 && (
        <p className="text-base font-medium text-gray-700 w-full text-center">
          Add Research focus and context to get started!
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {items.map(item => {
          const bgClasses = BG_CLASS_MAP[item.category] ?? 'bg-gray-400/40 group-hover:bg-gray-400/70';
          const isDisabled = !item.isEnabled;
          const isExpanded = expandedIds.has(item.id);

          return (
            <div key={item.id} className="relative w-full sm:w-auto">
              <Squircle className="relative group" width={256} height={256} cornerRadius={64} cornerSmoothing={1}>
                <div
                  className={`w-full h-full p-6 items-center text-center text-sm leading-relaxed transition-all duration-300 overflow-y-auto ${bgClasses}`}
                >
                  {item.text}
                </div>

                {isDisabled && (
                  <Squircle
                    width={256}
                    height={256}
                    cornerRadius={64}
                    cornerSmoothing={1}
                    className="absolute flex items-center justify-center top-0 left-0 w-full h-full transition-all duration-300 backdrop-blur-sm"
                  >
                    <FaEyeSlash size={24} className="mr-1 text-black/60" />
                  </Squircle>
                )}

                <Squircle
                  width={256}
                  height={256}
                  cornerRadius={64}
                  cornerSmoothing={1}
                  className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm cursor-pointer"
                >
                  <button
                    onClick={() => onToggleItemEnabled(item.id)}
                    className="flex flex-row rounded-t-lg items-center justify-between w-[200px] px-3 py-4 bg-[#040622] text-white/50 shadow-md transition-all duration-300 hover:text-white/80"
                  >
                    <span className="text-sm font-medium ml-1">
                      {item.isEnabled ? 'Disable' : 'Enable'}
                    </span>
                    <FaEyeSlash size={21} className="mr-1 text-white/50" />
                  </button>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="flex flex-row items-center justify-between w-[200px] px-3 py-4 bg-[#040622] text-white/50 shadow-md transition-all duration-300 hover:text-white/80"
                  >
                    <span className="text-sm font-medium ml-1 capitalize">delete</span>
                    <FaTrashCan size={21} className="mr-1 text-white/50" />
                  </button>

                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="flex flex-row items-center justify-between w-[200px] px-3 py-4 bg-[#040622] text-white/50 shadow-md transition-all duration-300 hover:text-white/80 rounded-b-lg"
                  >
                    <span className="text-sm font-medium ml-1 capitalize">expand</span>
                    <FaExpand size={21} className="mr-1 text-white/50" />
                  </button>
                </Squircle>
              </Squircle>
            </div>
          );
        })}
      </div>
    </div>
  );
};
