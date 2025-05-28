import React, { ReactNode, use, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, ChevronDownIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { getProviderIcon, KnownEventPayload, renderMessageContent, ThinkingStepStatus } from '@/app/DeepSearchView';
import Image, { StaticImageData } from 'next/image';

export interface StreamStep {
  id: string;
  eventName: string;
  type: 'info' | 'error';
  title: string;
  message: string;
  provider?: string;
  timestamp: number;
  rawData: KnownEventPayload;
}

interface ThinkingStepsProps {
  steps: StreamStep[];
  thinkingStepStatus?: ThinkingStepStatus | null;
}

export const ThinkingSteps: React.FC<ThinkingStepsProps> = ({
  steps,
  thinkingStepStatus,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const toggle = () => setIsOpen(o => !o);
  const [headerText, setHeaderText] = useState<string>('Thinking');
  const [headerIcon, setHeaderIcon] = useState<StaticImageData | null>(null);
  const [filteredSteps, setFilteredSteps] = useState<StreamStep[]>([]);
  const [loadingState, setLoadingState] = useState<boolean>(true);

  const headerAndChevronDuration = 0.1;
  const contentAnimationDuration = 0.15;

  const isStreamEnded = () => {
    const lastStep = steps[steps.length - 1];
    return (lastStep && lastStep.eventName === 'sse_time' && "duration" in lastStep.rawData)
  };

  useEffect(() => {
    const tmp = steps.filter(
      s => s.eventName !== 'sse_message' && s.eventName !== 'sse_time'
    );
    if (isStreamEnded()) {
      setLoadingState(false);
      tmp.push({
        id: '',
        eventName: 'status',
        type: 'info',
        title: '',
        message: '',
        provider: '',
        timestamp: 0,
        rawData: {} as KnownEventPayload,
      });
      const lastStep = tmp[tmp.length - 2];
      if (lastStep && lastStep.eventName !== "error") {
        setIsOpen(false);
      }
    }
    setFilteredSteps(tmp);
  }, [steps])

  useEffect(() => { }, [filteredSteps])

  useEffect(() => {
    setHeaderText(thinkingStepStatus?.title || 'Thinking');
    setHeaderIcon(thinkingStepStatus?.provider ? getProviderIcon(thinkingStepStatus.provider) : null);
  }, [thinkingStepStatus]);



  return (
    <div className="w-[80%] rounded-lg overflow-x-hidden">
      <motion.div
        layout
        onClick={toggle}
        transition={{ duration: headerAndChevronDuration, ease: 'easeInOut' }}
        className="flex items-center pb-1 cursor-pointer group items-center"
      >
        <div className={`flex items-center space-x-1.5 pr-1 ${loadingState ? 'shimmer-active-task' : ''}`}>
          {headerIcon && <Image className="w-4 h-4" src={headerIcon} alt="provider_logo" />}
          <span className="text-gray-500 group-hover:text-gray-900 transition-colors duration-300">{headerText}</span>
        </div>
        <motion.div
          layout
          transition={{ duration: headerAndChevronDuration, ease: 'easeInOut' }}
          animate={{ rotate: isOpen ? 0 : -90 }}
          className="w-4 h-4 text-gray-500"
        >
          <ChevronDownIcon />
        </motion.div>
      </motion.div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul
            key="body"
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: contentAnimationDuration, ease: 'easeInOut' }}
            className="p-2 space-y-2 no-scrollbar"
          >
            {filteredSteps.map((step, idx) => {
              const isLast = idx === filteredSteps.length - 1;
              const isSuccessfull = filteredSteps[filteredSteps.length - 2].eventName !== 'error';

              return (
                <motion.li
                  key={step.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: contentAnimationDuration, ease: 'easeInOut' }}
                  className={`flex text-xs md:text-sm  ${step.type === 'error' ? 'text-red-600' : 'text-gray-500'}`}
                >
                  <div className="flex flex-col items-center mr-2 w-4 justify-center">
                    {step.eventName != "status" && (
                      <>
                        <div className='flex h-5 items-center'>
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        </div>
                        {!isLast && (<div className="flex-1 w-px bg-gray-300 mt-2" />)}
                      </>
                    )}
                    {step.eventName == "status" && (isSuccessfull ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircleIcon className="w-4 h-4 text-gray-800" />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <XCircleIcon className="w-4 h-4 text-red-800" />
                      </div>
                    ))}
                  </div>

                  <div className="flex-1">
                    {step.eventName !== "status" ? renderMessageContent(step.message) : (isSuccessfull ? (
                      <p>Done</p>
                    ) : (
                      <p className='text-red-600'>Error</p>
                    ))}
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};