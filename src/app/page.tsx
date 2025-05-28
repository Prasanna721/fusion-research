'use client';

import Head from 'next/head';
import React, { useState } from 'react';
import '@/lib/env';

import { SearchView } from '@/app/SearchView';
import { DeepSearchView } from '@/app/DeepSearchView';

// !STARTERCONF -> Select !STARTERCONF and CMD + SHIFT + F
// Before you begin editing, follow all comments with `STARTERCONF`,
// to customize the default configuration.

export default function HomePage() {
  const [researchUrl, setSearchUrl] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [retrySeq, setRetrySeq] = useState(0);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    if (isValidUrl(searchTerm)) {
      setSearchUrl(searchTerm);
    }

  };

  const resetResearchUrl = () => {
    setSearchUrl('');
    setSearchTerm('');
  }

  const retryResearch = () => {
    setRetrySeq((n) => n + 1);
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  return (
    <>
      <Head>
        <title>Dynamic Research Page</title>
        <meta
          name="description"
          content="Search and discover with real-time updates."
        />
      </Head>
      <main className="w-full min-h-[100dvh] flex flex-col items-center justify-center bg-[#f7f7f7] text-offblack">
        {!isValidUrl(researchUrl) ?
          <SearchView searchTerm={searchTerm} setSearchTerm={setSearchTerm} handleSearch={handleSearch} /> :
          <DeepSearchView
            key={`${researchUrl}-${retrySeq}`}
            url={researchUrl}
            retryResearch={retryResearch}
            resetResearchUrl={resetResearchUrl} />}
      </main>
    </>
  );
}