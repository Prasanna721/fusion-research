'use client';

import React, { useEffect, useRef, FormEvent, useCallback, useState } from 'react';
import { useChat, Message as VercelAIMessage } from '@ai-sdk/react';
import ChatMessage from './ChatMessage';
import { ArrowUp, X, SquarePen } from 'lucide-react';
import { FocusCategory, FocusCategoryType, FocusItem } from '@/types/research';
import { TextSelectionToolbar } from '@/components/TextSelectionToolbar';
import { HiMiniSparkles } from 'react-icons/hi2';

interface ChatInterfaceProps {
  closeChat: () => void;
  focusItems: FocusItem[];
  onFusionResearch: () => void;
  handleAddFocusItem: (text: string, category: FocusCategory, isResearchContext?: boolean) => void;
}

export function ChatInterface({ closeChat, focusItems, handleAddFocusItem, onFusionResearch }: ChatInterfaceProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append, setMessages, setInput } = useChat({
    api: '/api/explore',
    body: {

    },
    onFinish: (message) => {
      inputRef.current?.focus();
    },
    onError: (err) => {
      console.error("Chat error:", err);
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  const [chatSelectionToolbar, setChatSelectionToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
  }>({ visible: false, x: 0, y: 0, text: '' });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSubmit(e);
  };

  const handleResetChat = () => {
    setMessages([]);
    setInput('');
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleChatTextSelection = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-selection-toolbar]')) {
        return;
      }

      if (!chatMessagesContainerRef.current || !chatMessagesContainerRef.current.contains(event.target as Node)) {

        return;
      }

      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 5) {
        setChatSelectionToolbar({
          visible: true,
          x: event.clientX,
          y: event.clientY - 50 < 0 ? event.clientY + 10 : event.clientY - 50,
          text: selectedText,
        });
      } else {

      }
    };

    document.addEventListener('mouseup', handleChatTextSelection);
    return () => {
      document.removeEventListener('mouseup', handleChatTextSelection);
    };
  }, []);


  const addChatSelectionToFocus = useCallback(() => {
    if (chatSelectionToolbar.text) {
      handleAddFocusItem(chatSelectionToolbar.text, FocusCategoryType.DOMAIN_2);
      setChatSelectionToolbar({ visible: false, x: 0, y: 0, text: '' });
    }
  }, [chatSelectionToolbar.text, handleAddFocusItem]);

  const addChatSelectionToContext = useCallback(() => {
    if (chatSelectionToolbar.text) {
      handleAddFocusItem(chatSelectionToolbar.text, FocusCategoryType.RESEARCH_CONTEXT, true);
      setChatSelectionToolbar({ visible: false, x: 0, y: 0, text: '' });
    }
  }, [chatSelectionToolbar.text, handleAddFocusItem]);

  const closeChatSelectionToolbar = useCallback(() => {
    setChatSelectionToolbar({ visible: false, x: 0, y: 0, text: '' });
  }, []);


  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <header className="flex justify-between items-center sticky top-0 z-10 mt-2 pb-1">

        <div className="w-8">
          <button type="button" onClick={handleResetChat} title="New Fusion chat" className="p-2 text-gray-500 rounded-md hover:bg-gray-200/50 hover:text-gray-700 transition-all durations-300">
            <SquarePen size={21} />
          </button>
        </div>
        <div className="flex items-center space-x-2 rounded-md py-1.5 px-3 bg-gray-200/50">
          <span className="text-sm text-gray-400 font-medium">Personalization <span className="font-bold text-gray-500 ">On</span></span>
        </div>
        <div className="w-8 flex justify-end mr-1">
          <button type="button" onClick={closeChat} title="Close fusion chat" className="p-2 text-gray-500 rounded-md hover:bg-gray-200/50 hover:text-gray-700 transition-all durations-300">
            <X size={21} />
          </button>
        </div>
      </header>

      <main ref={chatMessagesContainerRef} className="flex-grow p-4 space-y-3.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 pt-10">
            <p className="mb-2">No messages yet.</p>
            <span className="text-sm"> Type a question below.</span>
          </div>
        )}
        {messages.map((msg: VercelAIMessage) => (
          <ChatMessage
            key={msg.id}
            isUser={msg.role === 'user'}
            rawContent={msg.content}
          />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-3 rounded-xl shadow-sm bg-white text-gray-800 rounded-bl-none self-start border border-gray-200">
              <div className="flex items-center space-x-1.5 py-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.0s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {error && (
        <div className="p-3 border-t border-red-300 bg-red-50 text-center">
          <p className="text-sm text-red-600">Error: {error.message}</p>
        </div>
      )}

      <footer className="p-3 mb-3 mr-2 rounded-3xl shadow-md border bg-white sticky bottom-0">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Research or ask a question..."
            className="flex-grow pl-1.5 pr-3.5 py-1.5 text-sm placeholder-gray-400 border-none text-base rounded-lg focus:ring-0 focus:border-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit(e as any);
              }
            }}
          />
          <button
            type="submit"
            title="Send"
            className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center w-9 h-9" // Fixed size for the button
            disabled={isLoading || (!input.trim())}
          >
            <ArrowUp size={20} />
          </button>
        </form>
      </footer>

      {focusItems.length > 0 && (<button
        onClick={onFusionResearch}
        className="mb-3 mr-2 flex flex-row items-center justify-center rounded-2xl p-3
             bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600
             text-white shadow-md transition-all duration-300
             hover:from-pink-500/60 hover:via-purple-500/60 hover:to-indigo-600/60
             focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
        <HiMiniSparkles className="h-6 w-6" />
        <span className="ml-2 text-base font-medium">Fusion Research</span>
      </button>)}

      {chatSelectionToolbar.visible && (
        <TextSelectionToolbar
          x={chatSelectionToolbar.x}
          y={chatSelectionToolbar.y}
          onAddAsKeyFinding={addChatSelectionToFocus}
          onAddAsNote={addChatSelectionToContext}
          onClose={closeChatSelectionToolbar}
        />
      )}
    </div>
  );
}