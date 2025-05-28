import { Command, MemorySaver } from '@langchain/langgraph';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'url parameter is required' },
      { status: 400 }
    );
  }

  const thread = {
    configurable: {
      thread_id: uuidv4(),
      search_api: SearchAPI.TAVILY,
      planner_provider: ModelProvider.OPENAI,
      planner_model: SUPPORTED_MODELS[ModelProvider.OPENAI].gpt4o,
      writer_provider: ModelProvider.OPENAI,
      writer_model: SUPPORTED_MODELS[ModelProvider.OPENAI].gpt4o,
      max_search_depth: 2,
      number_of_queries: 5,
    },
  };

  let content: string;
  const contentType = await extractContent(url);
  if (contentType.success && contentType.isDocumentUrl) {
    content = await extractPdfContent(contentType.url);
  } else if (contentType.success && !contentType.isDocumentUrl) {
    content = await firecrawlScrape(contentType.url);
  } else {
    return;
  }

  console.log(`\n--- Starting research for topic: "${url}" ---`);

  const checkpointer = new MemorySaver();
  const runnableGraph = graph.compile({ checkpointer });

  let interrupted = false;
  for await (const event of await runnableGraph.stream(
    { topic: content },
    { ...thread, streamMode: 'updates' }
  )) {
    console.log('Event:', JSON.stringify(event, null, 2));
    if (event['__interrupt__']) {
      const interruptValue = (event['__interrupt__'] as any[])[0].value;
      console.log('\n--- INTERRUPT ---');
      console.log(interruptValue);
      interrupted = true;
      break;
    }
  }

  if (!interrupted) {
    console.error('Graph did not interrupt as expected for feedback.');
    return;
  }

  console.log('\n--- Submitting feedback on report plan ---');
  const feedbackCommand = new Command({
    resume: 'Looks great! Just do one more section related.',
  });

  interrupted = false;
  for await (const event of await runnableGraph.stream(feedbackCommand, {
    ...thread,
    streamMode: 'updates',
  })) {
    console.log('Event:', JSON.stringify(event, null, 2));
    if (event['__interrupt__']) {
      const interruptValue = (event['__interrupt__'] as any[])[0].value;
      console.log(
        '\n--- INTERRUPT (should not happen here if feedback leads to research) ---'
      );
      console.log(interruptValue);
      interrupted = true;
      break;
    }
  }

  if (interrupted) {
    console.log(
      '\n--- Graph interrupted after providing string feedback, this is unexpected. Assuming it means plan regeneration. Approving again with `true` ---'
    );
    const approveCommand = new Command({ resume: true });
    for await (const event of await runnableGraph.stream(approveCommand, {
      ...thread,
      streamMode: 'updates',
    })) {
      console.log('Event:', JSON.stringify(event, null, 2));
    }
  }

  const finalState = await runnableGraph.getState(thread);
  const report = finalState.values.final_report;
  console.log('\n\n--- FINAL REPORT ---');
  if (report) {
    console.log(report);
  } else {
    console.log('Report generation did not complete or an error occurred.');
    console.log('Final state:', JSON.stringify(finalState.values, null, 2));
  }

  return NextResponse.json({ hello: 'Next.js' });
}
