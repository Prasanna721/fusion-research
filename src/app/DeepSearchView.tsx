'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import { HiMiniSparkles } from "react-icons/hi2";
import { ThinkingSteps } from '@/app/StreamStepsView';
import PageHeader from '@/components/PageHeader';

import openAILogo from '~/images/openai-logo.png';
import perplexityLogo from '~/images/perplexity-logo.png';
import webLogo from '~/images/web-logo.png';
import { StaticImageData } from 'next/image';
import { formatDuration } from '@/lib/formatter';
import { ChatInterface } from '@/components/ChatUI';
import { mockFinalReport, mockThinkingSteps } from '@/constant/config';
import { FocusCategory, FocusCategoryType, FocusItem } from '@/types/research';
import { ResearchFocusPanel } from '@/components/ResearchFoucusPanel';
import { TextSelectionToolbar } from '@/components/TextSelectionToolbar';
import { nanoid } from 'nanoid';
import ReportDisplay from '@/components/ReportDisplay';

interface SSEEventDataBase {
  type: 'info' | 'error';
  title: string;
  message: string;
  provider?: string;
  threadId?: string;
  topic?: string;
}

interface GenerateReportPlanData extends SSEEventDataBase {
  generate_report_plan?: {
    title: string;
    sections: Array<{ name: string; description: string; research: boolean; content: string }>;
  };
}

interface InterruptPayloadData {
  stage?: string;
  title?: string;
  provider?: string;
  message?: string;
  data?: string | any;
  ns?: string[];
}

interface InterruptGraphEventData extends SSEEventDataBase {
  __interrupt__?: Array<{
    value: string;
    when: string;
    resumable: boolean;
    ns: string[];
  }>;
  stage?: string;
}

interface FinalReportData {
  report: string;
}

interface CompileReportData extends SSEEventDataBase {
  compile_final_report?: {
    final_report: string;
    sections: Array<any>;
  };
}

export type KnownEventPayload =
  | SSEEventDataBase
  | GenerateReportPlanData
  | InterruptPayloadData
  | InterruptGraphEventData
  | FinalReportData
  | CompileReportData
  | { startTime?: number; endTime?: number; duration?: number; threadId?: string }
  | { report?: string; sections?: Array<any> }
  | Record<string, any>;


interface StreamStep extends SSEEventDataBase {
  id: string;
  eventName: string;
  timestamp: number;
  rawData: KnownEventPayload;
}

export interface ThinkingStepStatus {
  title: string;
  provider?: string;
}

interface DeepSearchViewProps {
  url: string;
  resetResearchUrl: () => void;
  retryResearch: () => void;
  populateMockData?: boolean;
}

const providerIcons: Record<string, StaticImageData> = {
  openai: openAILogo,
  perplexity: perplexityLogo,
  tavily: webLogo,
  firecrawl: webLogo,
  default: webLogo,
};

export const getProviderIcon = (provider: string): StaticImageData => {
  if (provider && providerIcons[provider.toLowerCase()]) {
    return providerIcons[provider.toLowerCase()];
  }
  return providerIcons.default;
};

const KNOWN_SSE_EVENT_NAMES = [
  'system_time',
  'system_message',
  'graph_event',
  'interrupt',
  'final_report',
  'sse_time',
  'sse_message',
  'error',
];

export const renderMessageContent = (message: string) => {
  if (message.match(/<[^>]+>/) && !message.includes("```")) {
    return <div dangerouslySetInnerHTML={{ __html: message }} />;
  }
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>;
};

export const DeepSearchView: React.FC<DeepSearchViewProps> = ({ url, retryResearch, resetResearchUrl, populateMockData }) => {
  const [pageTitle, setPageTitle] = useState<string>('');
  const [thinkingStepStatus, setThinkingStepStatus] = useState<ThinkingStepStatus | null>(null);
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [addContextToResearch, setAddContextToResearch] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const errorRef = useRef<string | null>(null);

  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
  }>({ visible: false, x: 0, y: 0, text: '' });

  const finalReportRef = useRef<HTMLDivElement>(null);

  const [fusionThinkingStepStatus, setFusionThinkingStepStatus] = useState<ThinkingStepStatus | null>(null);
  const [fusionSteps, setFusionSteps] = useState<StreamStep[]>([]);
  const [fusionFinalReport, setFusionFinalReport] = useState<string | null>(null);
  const fusionFinalReportRef = useRef<string | null>(null);
  const [isFusionLoading, setIsFusionLoading] = useState<boolean>(false);
  const isFusionLoadingRef = useRef<boolean>(false);
  const [fusionError, setFusionError] = useState<string | null>(null);
  const fusionErrorRef = useRef<string | null>(null);

  useEffect(() => { fusionFinalReportRef.current = fusionFinalReport; }, [fusionFinalReport]);
  useEffect(() => { fusionErrorRef.current = fusionError; }, [fusionError]);
  useEffect(() => { isFusionLoadingRef.current = isFusionLoading; }, [isFusionLoading]);

  const handleAddFocusItem = (text: string, category: FocusCategory, isResearchContext: boolean = false) => {
    if (isResearchContext && category === FocusCategoryType.RESEARCH_CONTEXT) {
      setAddContextToResearch(text);
    }
    else if (addContextToResearch && category === FocusCategoryType.RESEARCH_CONTEXT && !isResearchContext) {
      const formattedText = `research-"""${addContextToResearch}""",additional_user_context-["${text}"]`;
      setFocusItems(prev => [...prev, { id: nanoid(), text: formattedText, category, isEnabled: true }]);
      setAddContextToResearch(null);
    }
    else {
      setFocusItems(prev => [...prev, { id: nanoid(), text, category, isEnabled: true }]);
    }
    setSelectionToolbar({ visible: false, x: 0, y: 0, text: '' });
  };

  const handleRemoveFocusItem = (id: string) => {
    setFocusItems(prev => prev.filter(item => item.id !== id));
  };

  useEffect(() => {
    const handleTextSelection = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-selection-toolbar]') || (event.target as HTMLElement).closest('[data-chat-interface]')) {
        return;
      }

      let selectionSourceRef = null;
      if (finalReportRef.current?.contains(event.target as Node)) {
        selectionSourceRef = finalReportRef;
      }

      if (!selectionSourceRef) {
        if (selectionToolbar.visible) {
          // setSelectionToolbar(prev => ({ ...prev, visible: false }));
        }
        return;
      }

      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 5) {
        setSelectionToolbar({
          visible: true,
          x: event.clientX,
          y: event.clientY - 50 < 0 ? event.clientY + 10 : event.clientY - 50,
          text: selectedText,
        });
      } else {
        if (selectionToolbar.visible) {
          setSelectionToolbar(prev => ({ ...prev, visible: false }));
        }
      }
    };

    document.addEventListener('mouseup', handleTextSelection);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [selectionToolbar.visible]);

  const handleToggleItemEnabled = (id: string) => {
    setFocusItems(prev => prev.map(item => item.id === id ? { ...item, isEnabled: !item.isEnabled } : item));
  };

  const handleSseEvent = (event: MessageEvent) => {
    try {
      const eventName = event.type;
      const rawDataString = event.data;
      const parsedPayload = JSON.parse(rawDataString) as KnownEventPayload;

      let stepType: 'info' | 'error' = 'info';
      let stepTitle: string = eventName;
      let stepMessage: string = rawDataString;
      let stepProvider: string | undefined = undefined;

      if ('type' in parsedPayload && (parsedPayload.type === 'info' || parsedPayload.type === 'error')) {
        stepType = parsedPayload.type;
      }
      if ('title' in parsedPayload) stepTitle = parsedPayload.title;
      if ('message' in parsedPayload) stepMessage = parsedPayload.message;
      if ('provider' in parsedPayload) stepProvider = parsedPayload.provider;


      if (eventName === 'final_report') {
        stepTitle = (parsedPayload as { title?: string }).title || "Final Report Generated";
        stepMessage = (parsedPayload as { message?: string }).message || "The final report is now available below.";
        if ('report' in parsedPayload && typeof parsedPayload.report === 'string') {
          setFinalReport(parsedPayload.report);
        }
        setIsLoading(false);
      } else if (eventName === 'sse_time') {
        stepTitle = "System Time";
        if ('duration' in parsedPayload) {
          setIsLoading(false);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
          }
        }
      }

      if (eventName === 'system_message' || eventName === 'sse_time' || eventName === 'error') {
        const isErrorEvent = eventName === 'error';
        const thinkingStatusUpdate: ThinkingStepStatus = { title: stepTitle };
        if (stepProvider) thinkingStatusUpdate.provider = stepProvider;

        if (eventName === 'sse_time' && "duration" in parsedPayload) {
          const duration = formatDuration(parsedPayload.duration);
          thinkingStatusUpdate.title = `${errorRef.current ? 'Error' : 'Thought for'} ${duration}`;
        }
        setThinkingStepStatus(thinkingStatusUpdate);

        if (isErrorEvent) {
          const newErr = stepMessage || 'Error';
          errorRef.current = newErr;
          setError(newErr);
        }
      }

      if ("generate_report_plan" in parsedPayload) {
        const plan = (parsedPayload as GenerateReportPlanData).generate_report_plan;
        if (plan && plan.title) setPageTitle(plan.title);
      }

      const newStep: StreamStep = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        eventName: eventName, type: stepType, title: stepTitle, message: stepMessage,
        provider: stepProvider, timestamp: Date.now(), rawData: parsedPayload,
      };
      setSteps((prevSteps) => [...prevSteps, newStep]);

    } catch (e) {
      console.error(`Error processing SSE event "${event.type}":`, e, "Raw data:", event.data);
      if (!errorRef.current) {
        errorRef.current = 'Error';
        setError('Error');
      }
      setIsLoading(false);
    }
  };

  const handleFusionSseEvent = (event: MessageEvent) => {
    try {
      const eventName = event.type;
      const rawDataString = event.data;
      const parsedPayload = JSON.parse(rawDataString) as KnownEventPayload;

      let stepType: 'info' | 'error' = 'info';
      let stepTitle: string = eventName;
      let stepMessage: string = rawDataString;
      let stepProvider: string | undefined = undefined;

      if ('type' in parsedPayload && (parsedPayload.type === 'info' || parsedPayload.type === 'error')) {
        stepType = parsedPayload.type;
      }
      if ('title' in parsedPayload) stepTitle = parsedPayload.title;
      if ('message' in parsedPayload) stepMessage = parsedPayload.message;
      if ('provider' in parsedPayload) stepProvider = parsedPayload.provider;

      if (eventName === 'final_report') {
        stepTitle = (parsedPayload as { title?: string }).title || "Fusion Report Generated";
        stepMessage = (parsedPayload as { message?: string }).message || "The fusion report is now available below.";
        if ('report' in parsedPayload && typeof parsedPayload.report === 'string') {
          setFusionFinalReport(parsedPayload.report);
        }
        setIsFusionLoading(false);
      } else if (eventName === 'sse_time') {
        stepTitle = "System Time";
        if ('duration' in parsedPayload) {
          setIsFusionLoading(false);
        }
      }

      if (eventName === 'system_message' || eventName === 'sse_time' || eventName === 'error') {
        const isErrorEvent = eventName === 'error';
        const thinkingStatusUpdate: ThinkingStepStatus = { title: stepTitle };
        if (stepProvider) thinkingStatusUpdate.provider = stepProvider;

        if (eventName === 'sse_time' && "duration" in parsedPayload) {
          const duration = formatDuration(parsedPayload.duration);
          thinkingStatusUpdate.title = `${fusionErrorRef.current ? 'Error in Fusion' : 'Fused for'} ${duration}`;
        }
        setFusionThinkingStepStatus(thinkingStatusUpdate);

        if (isErrorEvent) {
          const newErr = stepMessage || 'Fusion Error';
          fusionErrorRef.current = newErr;
          setFusionError(newErr);
        }
      }

      const newStep: StreamStep = {
        id: `${Date.now()}-fusion-${Math.random().toString(36).substring(2, 9)}`,
        eventName: eventName, type: stepType, title: stepTitle, message: stepMessage,
        provider: stepProvider, timestamp: Date.now(), rawData: parsedPayload,
      };
      setFusionSteps((prevSteps) => [...prevSteps, newStep]);

    } catch (e) {
      console.error(`Error processing Fusion SSE event "${event.type}":`, e, "Raw data:", event.data);
      if (!fusionErrorRef.current) {
        const errorMsg = 'Error in Fusion Processing';
        fusionErrorRef.current = errorMsg;
        setFusionError(errorMsg);
        setFusionThinkingStepStatus({ title: errorMsg });
      }
      setIsFusionLoading(false);
    }
  };

  const handleTriggerFusionResearch = async () => {
    const enabledItems = focusItems.filter(item => item.isEnabled);
    const itemsByCategory = enabledItems.reduce<Record<FocusCategory, FocusItem[]>>(
      (map, item) => {
        if (!map[item.category]) {
          map[item.category] = [];
        }
        map[item.category].push(item);
        return map;
      },
      {} as Record<FocusCategory, FocusItem[]>
    );

    return JSON.stringify(itemsByCategory);
  };

  const handleFusionResearch = async () => {
    const focusContent = await handleTriggerFusionResearch();
    setIsFusionLoading(true);
    setFusionError(null);
    fusionErrorRef.current = null;
    setFusionSteps([]);
    setFusionFinalReport(null);
    fusionFinalReportRef.current = null;
    setFusionThinkingStepStatus({ title: "Initializing Fusion Research..." });

    try {
      const response = await fetch('/api/deepfusion/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: focusContent }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText || 'Unknown server error'}`);
      }
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamEndedByServerSignal = false;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (isFusionLoadingRef.current) {
            setIsFusionLoading(false);
            if (!fusionFinalReportRef.current && !fusionErrorRef.current) {
              setFusionThinkingStepStatus({ title: "Fusion process complete." });
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let eventBoundaryIndex;
        while ((eventBoundaryIndex = buffer.indexOf('\n\n')) >= 0) {
          const eventBlock = buffer.substring(0, eventBoundaryIndex);
          buffer = buffer.substring(eventBoundaryIndex + 2);

          const lines = eventBlock.split('\n');
          let eventName = 'message';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.substring('event:'.length).trim();
            } else if (line.startsWith('data:')) {
              eventData += (eventData ? '\n' : '') + line.substring('data:'.length).trimStart();
            }
          }

          if (eventData) {
            const mockEvent = { type: eventName, data: eventData } as unknown as MessageEvent;
            handleFusionSseEvent(mockEvent);
            if (eventName === 'final_report' || (eventName === 'sse_time' && JSON.parse(eventData).duration)) {
              streamEndedByServerSignal = true;
            }
          }
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Fusion research failed';
      fusionErrorRef.current = errorMsg;
      setFusionError(errorMsg);
      setFusionThinkingStepStatus({ title: `Error: ${errorMsg.substring(0, 100)}...` });
      setIsFusionLoading(false);
    }
  };

  const closeChat = () => setIsChatOpen(false);

  const mockData = () => {
    setPageTitle('In Situ Analysis of Zn Dendrite Formation in Zinc-Ion Batteries');
    setThinkingStepStatus({ title: "Thought for 1 min 55 sec" });
    setSteps(mockThinkingSteps);
    setFinalReport(mockFinalReport);
    setIsLoading(false);
  }

  useEffect(() => {
    if (populateMockData) {
      mockData();
      return;
    }
    if (!url) {
      setIsLoading(false);
      return;
    }

    const sseUrl = `/api/deepsearch/stream?url=${encodeURIComponent(url)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    setIsLoading(true);
    setError(null); errorRef.current = null;
    setSteps([]);
    setFinalReport(null);
    setPageTitle('');
    setThinkingStepStatus({ title: "Initializing Research..." });


    es.onopen = () => setError(null);
    es.onmessage = (event) => handleSseEvent(event);
    KNOWN_SSE_EVENT_NAMES.forEach(eventName => es.addEventListener(eventName, handleSseEvent));
    es.onerror = (errEvent) => {
      console.error('SSE Error Event:', errEvent);
      setError("Connection to research stream failed.");
      errorRef.current = "Connection to research stream failed.";
      setThinkingStepStatus({ title: "Error connecting to stream" });
      setIsLoading(false);
      es.close();
    };

    return () => {
      if (eventSourceRef.current) {
        KNOWN_SSE_EVENT_NAMES.forEach(eventName => eventSourceRef.current?.removeEventListener(eventName, handleSseEvent));
        eventSourceRef.current.onmessage = null;
        eventSourceRef.current.onerror = null;
        eventSourceRef.current.onopen = null;
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [url, populateMockData]);

  return (
    <div className={`w-full min-h-[100dvh] text-offblack ${isChatOpen ? "grid grid-cols-[1fr_450px] bg-[#fafafa]" : "bg-white"}`}>
      <main className={`h-[100dvh] overflow-y-auto no-scrollbar bg-white ${isChatOpen ? "m-2 rounded-md border border-gray-200 shadow-md" : ""}`}>
        <div className="w-full flex flex-col items-center">
          <div className="sticky top-0 z-20 w-full bg-white/80 backdrop-blur-sm">
            <PageHeader url={url} pageTitle={pageTitle} resetResearchUrl={resetResearchUrl} />
          </div>

          <div className={`${isChatOpen ? "w-full" : "w-full md:max-w-3xl lg:max-w-4xl"} px-4 flex-grow pb-12 mx-auto`}>
            <div className='relative w-full'>
              <ThinkingSteps thinkingStepStatus={thinkingStepStatus} steps={steps} />
              {!isChatOpen && !populateMockData && (<button
                onClick={() => setIsChatOpen(true)}
                className="absolute top-0 right-0 z-10 flex flex-row rounded-lg items-center p-2 
                    bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 
                    text-offblack shadow-md transition-all duration-300
                    hover:from-amber-400/50 hover:via-yellow-400/80 hover:to-amber-500/80
                    focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                <HiMiniSparkles className="h-5 w-5" />
                <span className="text-sm font-medium ml-2">Fusion Chat</span>
              </button>)}
            </div>

            {isLoading && steps.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center text-center py-10 mt-6">
                <Loader2 className="h-10 w-10 text-sky-500 animate-spin mb-3" />
                <p className="text-gray-500">Initializing research process...</p>
                {url && <p className="text-xs text-gray-400">Fetching live updates for: <span className="font-medium break-all">{url}</span></p>}
              </div>
            )}

            {error && (
              <div className="w-full">
                <div className="max-w-[350px] mt-6">
                  <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
                    <p className="text-base leading-relaxed font-medium text-red-600 mb-6">{error}</p>
                    {!populateMockData &&
                      <button onClick={retryResearch}
                        className="block w-full rounded-xl bg-red-500 py-4 text-base font-semibold text-white hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition">
                        Retry
                      </button>}
                  </div>
                </div>
              </div>
            )}

            {finalReport && !error && (
              <div ref={finalReportRef} className="my-6">
                <ReportDisplay defaultCollapsed={false} title={'Research Analysis'} reportContent={finalReport} />
              </div>
            )}

            <ResearchFocusPanel
              items={focusItems}
              addContextToResearch={addContextToResearch}
              onAddItem={handleAddFocusItem}
              handleClearContext={() => setAddContextToResearch(null)}
              onToggleItemEnabled={handleToggleItemEnabled}
              onRemoveItem={handleRemoveFocusItem}
            />

            {(isFusionLoading || fusionSteps.length > 0 || fusionFinalReport || fusionError) && (
              <div className="mt-8 pt-6 border-t border-gray-300">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Fusion Analysis</h2>
                <div className='relative w-full'>
                  <ThinkingSteps thinkingStepStatus={fusionThinkingStepStatus} steps={fusionSteps} />
                </div>

                {isFusionLoading && fusionSteps.length === 0 && !fusionError && (
                  <div className="flex flex-col items-center justify-center text-center py-10 mt-6">
                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-3" />
                    <p className="text-gray-500">Initializing fusion research process...</p>
                  </div>
                )}

                {fusionError && (
                  <div className="w-full mt-6">
                    <div className="max-w-[450px]">
                      <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
                        <p className="text-base font-medium text-red-700 mb-1">Fusion Research Error:</p>
                        <p className="text-sm leading-relaxed text-red-600">{fusionError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {fusionFinalReport && !fusionError && (
                  <div className="my-6">
                    <ReportDisplay
                      defaultCollapsed={false}
                      title={'Fusion Research Analysis'}
                      reportContent={fusionFinalReport}
                    />
                  </div>
                )}
              </div>
            )}

            {selectionToolbar.visible && (finalReport || fusionFinalReport) && (
              <TextSelectionToolbar
                x={selectionToolbar.x}
                y={selectionToolbar.y}
                onAddAsKeyFinding={() => handleAddFocusItem(selectionToolbar.text, FocusCategoryType.DOMAIN_1)}
                onAddAsNote={() => handleAddFocusItem(selectionToolbar.text, FocusCategoryType.RESEARCH_CONTEXT, true)}
                onClose={() => setSelectionToolbar({ ...selectionToolbar, visible: false })}
              />
            )}
          </div>
        </div>
      </main>
      {isChatOpen && (<aside className="sticky top-0 h-[100dvh]" data-chat-interface>
        <ChatInterface
          closeChat={closeChat}
          focusItems={focusItems}
          handleAddFocusItem={handleAddFocusItem}
          onFusionResearch={handleFusionResearch}
        />
      </aside>)}
    </div>
  );
};