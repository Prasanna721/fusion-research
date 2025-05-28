import { formatUrlBrowserStyle, formatUrlWithPageTitle } from '@/lib/formatter';
import { Globe2, NewspaperIcon } from 'lucide-react';
import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';


interface UrlInputProps {
  url: string;
  onUrlChange: (newUrl: string) => void;
  pageTitle?: string;
  placeholder?: string;
  className?: string;
  textClassName?: string;
}

const UrlInput: React.FC<UrlInputProps> = ({
  url,
  onUrlChange,
  pageTitle,
  placeholder = "Enter URL",
  className = "",
  textClassName = "text-xl md:text-2xl",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(url);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(url);
    }
  }, [url, isEditing]);

  const handleDisplayClick = () => {
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (inputValue.trim() && inputValue !== url) {
      onUrlChange(inputValue);
    } else {
      setInputValue(url);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(url);
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const formattedDisplay = (pageTitle && pageTitle != '')
    ? formatUrlWithPageTitle(url, pageTitle)
    : formatUrlBrowserStyle(url);

  return (
    <div className={`relative w-full flex flex-row items-center space-x-2 ${className}`}>
      {/* <Globe2 className="h-5 w-5 text-gray-700 flex-shrink-0" /> */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-transparent outline-none focus:outline-none ring-0 focus:ring-0 border-0 focus:border-0 p-0 m-0 text-gray-800 ${textClassName} truncate`}
        />
      ) : (
        <div
          onClick={handleDisplayClick}
          className={`cursor-text w-full text-gray-800 ${textClassName} truncate`}
          title={pageTitle ? `${pageTitle} - ${url}` : url}
        >
          {url ? formattedDisplay : <span className="text-gray-400">{placeholder}</span>}
        </div>
      )}
    </div>
  );
};

export default UrlInput;