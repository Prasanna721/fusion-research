// app/api/explore/route.ts
import { NextRequest } from 'next/server';
import { streamText, APICallError } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const runtime = 'edge';

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY ?? '',
  baseURL: 'https://api.perplexity.ai',
});

export async function POST(req: NextRequest) {
  try {
    const { messages, data } = (await req.json()) as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      data?: { contextTitles?: string };
    };

    console.log('[EXPLORE_ROUTE]', { messages, data });

    let systemContent =
      `You are a helpful assistant. Use Markdown (headings, lists, bold, italics) where helpful.\n` +
      `If the user references contextual documents, centre the answer on them.`;
    if (data?.contextTitles) {
      systemContent += `\n\nContext provided: ${data.contextTitles}.`;
    }

    const result = await streamText({
      model: perplexity('sonar-pro'),
      messages: [
        { role: 'system', content: systemContent },
        ...messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
      ],
    });

    return result.toDataStreamResponse({
      getErrorMessage(error) {
        if (APICallError.isInstance(error)) {
          return `Perplexity ${error.statusCode}: ${error.message}`;
        }
        if (error instanceof Error) return error.message;
        return String(error ?? 'unknown error');
      },
      sendReasoning: true,
    });
  } catch (err) {
    let msg = 'Unexpected server error.';
    if (APICallError.isInstance(err)) {
      msg = `Perplexity API ${err.statusCode}: ${err.message}`;
    } else if (err instanceof Error) {
      msg = err.message;
    }
    console.error('[EXPLORE_ROUTE_ERROR]', err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
