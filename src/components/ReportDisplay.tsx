import React, { FC, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { ReportDisplayProps } from '@/types/report';

const markdownComponentsConfig = {
  h1: (props: any) => <h1 className="text-2xl font-bold my-5 border-b pb-2" {...props} />,
  h2: (props: any) => <h2 className="text-xl font-semibold my-4 border-b pb-1" {...props} />,
  h3: (props: any) => <h3 className="text-lg font-semibold my-3" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside my-3 pl-6 space-y-1.5" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside my-3 pl-6 space-y-1.5" {...props} />,
  li: (props: any) => <li className="pb-1" {...props} />,
  p: (props: any) => <p className="my-2 leading-relaxed" {...props} />,
  strong: (props: any) => <strong className="font-semibold" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
  blockquote: (props: any) => <blockquote className="pl-4 italic border-l-4 border-gray-300 my-3 text-gray-600" {...props} />,
  a: (props: any) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  code: (props: any) => <code className="bg-gray-100 text-sm px-1.5 py-0.5 rounded font-mono" {...props} />,
  pre: (props: any) => <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm my-3" {...props} />,
};

const ReportDisplay: FC<ReportDisplayProps> = ({
  reportContent,
  title = 'Report',
  defaultCollapsed = false,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className={`bg-white rounded-lg shadow-lg w-full mx-auto overflow-hidden ${className}`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full p-4 md:p-5 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none border-b border-gray-200 transition-colors duration-150 ease-in-out"
        aria-expanded={!isCollapsed}
        aria-controls="report-content-section"
      >
        <span className="text-lg font-semibold text-gray-800">{title}</span>
        {isCollapsed ? (
          <ChevronDown className="w-6 h-6 text-gray-600" />
        ) : (
          <ChevronUp className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {!isCollapsed && (
        <div
          id="report-content-section"
          className="p-6 md:p-8 prose prose-sm sm:prose-base lg:prose-lg prose-blue max-w-none"
        >
          <ReactMarkdown
            components={markdownComponentsConfig}
            remarkPlugins={[remarkGfm]}
          >
            {reportContent}
          </ReactMarkdown>

        </div>
      )}
    </div>
  );
};

export default ReportDisplay;