import { Command, MemorySaver } from '@langchain/langgraph';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import Mustache from 'mustache';

import { SearchAPI } from '@/app/api/deepsearch/config';
import { graph } from '@/app/api/deepsearch/graph';
import {
  ModelProvider,
  SUPPORTED_MODELS,
} from '@/app/api/deepsearch/chatModelFactory';
import {
  extractContent,
  extractPdfContent,
  firecrawlScrape,
} from '@/app/api/deepsearch/extract';
import {
  EVENT_TEMPLATE_INIT_EXT,
  EVENT_TEMPLATE_START_EXT_FIRECRAWL,
  EVENT_TEMPLATE_START_EXT_MISTRAL,
  getGraphEventDetails,
} from '@/app/api/deepsearch/stream/constants';
import { visualizeGraph } from '@/app/api/deepsearch/utils';

function formatSseEvent(eventName: string, data: any): string {
  const jsonData = JSON.stringify(data);
  return `event: ${eventName}\ndata: ${jsonData}\n\n`;
}

export async function POST(request: Request) {
  const { content, clientThreadId } = await request.json();

  const threadId = clientThreadId || uuidv4();
  const thread = {
    configurable: {
      thread_id: threadId,
      search_api: SearchAPI.TAVILY,
      planner_provider: ModelProvider.OPENAI,
      planner_model: SUPPORTED_MODELS[ModelProvider.OPENAI].gpt4o,
      writer_provider: ModelProvider.OPENAI,
      writer_model: SUPPORTED_MODELS[ModelProvider.OPENAI].gpt4o,
      max_search_depth: 2,
      number_of_queries: 5,
    },
  };
  let startTime: number;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventName: string, data: any) => {
        controller.enqueue(encoder.encode(formatSseEvent(eventName, data)));
      };

      try {
        startTime = Date.now();
        sendEvent('sse_time', {
          startTime: startTime,
          threadId: thread.configurable.thread_id,
        });

        sendEvent('system_message', {
          type: 'info',
          title: 'Getting started',
          message: 'SSE connection established.',
          threadId: thread.configurable.thread_id,
        });

        sendEvent('system_message', {
          type: 'info',
          title: 'Extracting content',
          message: 'Extracting content from the research.',
        });

        const checkpointer = new MemorySaver();
        const runnableGraph = graph.compile({ checkpointer });
        visualizeGraph(runnableGraph, thread);

        sendEvent('system_message', {
          type: 'info',
          title: 'Generating research plan',
          provider: thread.configurable.planner_provider,
          message: 'Understanding the content and generating a research plan',
        });

        for await (const event of await runnableGraph.stream(
          { topic: content },
          { ...thread, streamMode: 'updates' }
        )) {
          const eventDetails = getGraphEventDetails(
            thread,
            Object.keys(event)[0]
          );
          sendEvent('graph_event', { type: 'info', ...eventDetails, ...event });
        }

        const finalState = await runnableGraph.getState(thread);
        const report = finalState.values.final_report;

        if (report) {
          sendEvent('final_report', { report });
        } else {
          const errorMessage =
            'Report generation did not complete or an error occurred.';
          sendEvent('error', {
            message: errorMessage,
            finalState: finalState.values,
          });
        }
      } catch (error: any) {
        console.error('Error during SSE stream:', error);
        sendEvent('error', {
          message: 'An unexpected error occurred during the process.',
          error: error.message,
          stack: error.stack,
        });
      } finally {
        sendEvent('sse_message', {
          type: 'info',
          title: 'Stream closed',
          threadId: thread.configurable.thread_id,
          message: 'Process finished. Closing stream.',
        });
        sendEvent('sse_time', {
          startTime: startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          threadId: thread.configurable.thread_id,
        });
        controller.close();
      }
    },
    cancel() {
      console.log('SSE stream cancelled by client.');
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
