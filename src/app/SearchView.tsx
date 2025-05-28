import React, { useEffect, useRef, useState } from "react";

import Image from "next/image";
import LogoImg from '~/images/logo.png';
import Typewriter from '@/components/Typewriter';
import { CornerDownLeft, Search } from 'lucide-react';

interface SearchViewProps {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  searchTerm,
  setSearchTerm,
  handleSearch,
}) => {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const typewriterTexts = [
    'Zinc-ion batteries, dentrite formation?',
    'Explore ARC-AGI 2 dataset, Test Time Training?',
    'Cross domain research, based on first principles!!',
  ];
  const typewriterWaitTimes = [2000, 1500, 2500];

  return (
    <div className="w-full space-y-8 flex flex-col text-center justify-center items-center pb-24 p-4">
      <Image
        src={LogoImg}
        alt="Logo"
        className="mx-auto h-16 w-auto sm:h-20 text-sky-400"
      />

      <h1 className="text-2xl sm:text-3xl md:text-3xl font-medium tracking-tight">
        <Typewriter
          texts={typewriterTexts}
          waitTimes={typewriterWaitTimes}
          typeSpeed={80}
          deleteSpeed={40}
        />
      </h1>

      <form
        onSubmit={handleSearch}
        className="relative w-full sm:w-full md:w-[600px] lg:w-[700px] xl:w-[800px] text-center"
        aria-label="Search form"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3">
          <Search
            className="h-5 w-5 text-gray-300 sm:h-6 sm:w-6"
            aria-hidden="true"
          />
        </div>
        <input
          name="search"
          id="search"
          value={searchTerm}
          ref={searchRef}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-2xl border-0.5 border-offblack/10 bg-white py-3.5 pl-10 sm:pl-12 pr-2 sm:pr-3 shadow-2xl placeholder:text-gray-300 text-base leading-6 transition-colors duration-150 focus:outline-none focus:ring-0 focus:border-offblack/10 focus:bg-white"
          placeholder="Enter research paper or article url"
          aria-label="Search query"
        />
        {searchTerm.trim() && (
          <div className='absolute right-2 top-0 h-full flex items-center justify-center'>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs sm:text-sm font-medium text-offblack shadow-sm hover:bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              Research
              <CornerDownLeft
                className="h-4 w-4 text-offblack/40 inline-flex self-center"
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}