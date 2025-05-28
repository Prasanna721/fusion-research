import React, { useState } from 'react';
import { PencilLine } from 'lucide-react';
import UrlInput from './UrlInput';
import Image from 'next/image';

import LogoImg from '~/images/logo.png';

interface PageHeaderProps {
  url: string;
  pageTitle?: string;
  resetResearchUrl: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ url, pageTitle, resetResearchUrl }) => {
  const [currentUrl, setCurrentUrl] = useState(url);

  const handleUrlChange = (newUrl: string) => {
    try {
      const urlObj = new URL(newUrl);
      if (urlObj.href !== currentUrl) {
        setCurrentUrl(newUrl);
      }
    }
    catch (error) {

    }

  };

  return (
    <div className="w-full flex flex-row items-center mb-2 space-x-2 p-2">
      <Image
        src={LogoImg}
        title='Fusion Research'
        alt="Research Icon"
        className="h-7 w-7 flex-shrink-0 ml-1 cursor-pointer"
        width={24}
        height={24}
      />
      <div
        className='p-2 hover:bg-gray-100 transition-colors duration-150 rounded-lg cursor-pointer'
        onClick={resetResearchUrl}>
        <PencilLine className="h-5 w-5 text-gray-700 flex-shrink-0" />
      </div>
      <UrlInput
        url={currentUrl}
        onUrlChange={handleUrlChange}
        pageTitle={pageTitle}
        placeholder="Enter a URL"
        textClassName="text-base text-gray-500"
      />
    </div>
  );
};

export default PageHeader;