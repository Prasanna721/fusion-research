import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { Mistral } from '@mistralai/mistralai';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const AXIOS_TIMEOUT_PDF_DOWNLOAD = 30000;
const AXIOS_TIMEOUT_HEAD_REQUEST = 10000;
const COMMON_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export const firecrawlScrape = async (url: string): Promise<string> => {
  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  if (!FIRECRAWL_API_KEY) {
    throw new Error('FIRECRAWL_API_KEY not set. Skipping Firecrawl.');
  }

  const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
  const scrapeResult = (await app.scrapeUrl(url, {
    formats: ['markdown'],
  })) as ScrapeResponse;

  if (scrapeResult.success && scrapeResult.markdown) {
    console.log(`[Firecrawl] scraped: ${url}`);
    return scrapeResult.markdown.trim();
  }

  return `[Error] Skipping Firecrawl for ${url}.`;
};

export const extractPdfContent = async (url: string): Promise<string> => {
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY not set. Skipping pdf extraction.');
  }
  const client = new Mistral({ apiKey: MISTRAL_API_KEY });
  const ocrResponse = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: {
      type: 'document_url',
      documentUrl: url,
    },
    includeImageBase64: true,
  });
  const markdown = ocrResponse.pages.map((page) => page.markdown).join('\n\n');
  const imageBase64 = ocrResponse.pages.map((page) =>
    page.images.map((image) => image.imageBase64)
  );
  const flattenedImageBase64 = imageBase64.flatMap((x) => x);

  return markdown;
};

export interface ExtractContentResponse {
  isDocumentUrl: boolean;
  url: string;
  success: boolean;
}

export const extractContent = async (
  url: string
): Promise<ExtractContentResponse> => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return {
      success: false,
      isDocumentUrl: false,
      url: url,
    };
  }

  let isPdfContentType = false;
  let success = false;

  try {
    const headResponse = await axios.head(parsedUrl.href, {
      timeout: AXIOS_TIMEOUT_HEAD_REQUEST,
      headers: { 'User-Agent': COMMON_USER_AGENT },
    });

    const contentTypeHeader = (
      headResponse.headers['content-type'] || ''
    ).toLowerCase();

    if (contentTypeHeader.includes('application/pdf')) {
      isPdfContentType = true;
    }
    success = true;
  } catch (error) {}

  return {
    success: success,
    isDocumentUrl: isPdfContentType,
    url: parsedUrl.href,
  };
};
