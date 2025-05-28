// components/ChatMessage.tsx
import React, { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessageComponentProps } from '@/types/chat';

const markdownComponentsConfig = {
  h1: (props: any) => <h1 className="text-xl font-bold my-4" {...props} />,
  h2: (props: any) => <h2 className="text-lg font-semibold my-3" {...props} />,
  h3: (props: any) => <h3 className="text-md font-semibold my-2" {...props} />,
  ul: (props: any) => <ul className="list-disc list-outside my-2 pl-6 space-y-1" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-outside my-2 pl-6 space-y-1" {...props} />,
  li: (props: any) => <li className="pb-0.5" {...props} />,
  p: (props: any) => <p className="my-1 whitespace-pre-wrap leading-relaxed" {...props} />,
  strong: (props: any) => <strong className="font-semibold" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
  blockquote: (props: any) => <blockquote className="pl-3 italic border-l-2 border-gray-300 my-2 text-gray-600" {...props} />,
  a: (props: any) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  code: (props: any) => <code className="bg-gray-100 text-sm px-1 py-0.5 rounded font-mono" {...props} />,
  pre: (props: any) => <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm my-2" {...props} />,
};

const ChatMessage: FC<ChatMessageComponentProps> = ({ isUser, rawContent }) => {
  const bubbleClasses = isUser
    ? 'bg-red-100 text-red-950 rounded-br-none self-end'
    : 'bg-white text-gray-900 rounded-bl-none self-start border border-gray-200';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[80%] px-3.5 py-2.5 rounded-xl shadow-sm ${bubbleClasses} text-sm`}
      >
        <ReactMarkdown
          components={markdownComponentsConfig}
          remarkPlugins={[remarkGfm]}
        >
          {rawContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;