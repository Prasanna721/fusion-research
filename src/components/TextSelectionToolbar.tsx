// components/TextSelectionToolbar.tsx
'use client';

import React, { useRef, useEffect } from 'react';
import { RiFocus2Line, RiMenu5Fill } from 'react-icons/ri';

interface TextSelectionToolbarProps {
  x: number;
  y: number;
  onAddAsKeyFinding: () => void;
  onAddAsNote: () => void;
  onClose: () => void;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  x,
  y,
  onAddAsKeyFinding,
  onAddAsNote,
  onClose,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={toolbarRef}
      className="fixed w-[200px] flex flex-col items-center z-50 text-sm text-white/50 font-medium"
      style={{ left: `${x}px`, top: `${y}px` }}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { onAddAsKeyFinding(); onClose(); }}
        title="Add as research focus"
        className="w-full px-3 py-4 bg-[#040622] hover:text-white/80 transition-all duration-300 rounded-t-lg flex items-center justify-between group"
      >
        <span>Research Focus</span>
        <RiFocus2Line size={21} className="text-white/50 group-hover:text-white/80 transition-all duration-300" />
      </button>
      <button
        onClick={() => { onAddAsNote(); onClose(); }}
        title="Add to context"
        className="w-full px-3 py-4 bg-[#040622] hover:text-white/80 transition-all duration-300 rounded-b-lg flex items-center justify-between group"
      >
        <span>Add Context</span>
        <RiMenu5Fill size={21} className="text-white/50 group-hover:text-white/80 transition-all duration-300" />
      </button>
    </div>
  );
};