import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import axios from 'axios';
import pdf from 'pdf-parse';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const AXIOS_TIMEOUT_PDF_DOWNLOAD = 30000;
const AXIOS_TIMEOUT_HEAD_REQUEST = 10000;
const COMMON_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

async function fetchWithFirecrawl(urlString: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error(
      'FIRECRAWL_API_KEY environment variable is not set. Please provide it to use this function.'
    );
  }

  console.log(`[Firecrawl] Processing: ${urlString}`);
  const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

  try {
    const scrapeResult = (await app.scrapeUrl(urlString, {
      formats: ['markdown'],
    })) as ScrapeResponse;

    if (scrapeResult.success && scrapeResult.markdown) {
      console.log(`[Firecrawl] Success for: ${urlString}`);
      return scrapeResult.markdown.trim();
    } else {
      const errorMsg =
        scrapeResult.error ||
        'Firecrawl failed to extract content or returned an unexpected structure.';
      throw new Error(`Firecrawl API error for ${urlString}: ${errorMsg}`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Firecrawl API error')
    ) {
      throw error;
    }
    throw new Error(
      `[Firecrawl] Network or unexpected error for ${urlString}: ${
        (error as Error).message
      }`
    );
  }
}

export async function getContentFromUrl(urlString: string): Promise<string> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    throw new Error(
      `Invalid URL provided: "${urlString}". ${(error as Error).message}`
    );
  }

  let isPdfContentType = false;
  let headRequestError: Error | null = null;

  // 1. Attempt HEAD request to determine Content-Type
  try {
    console.log(`[HEAD Request] Checking Content-Type for: ${parsedUrl.href}`);
    const headResponse = await axios.head(parsedUrl.href, {
      timeout: AXIOS_TIMEOUT_HEAD_REQUEST,
      headers: { 'User-Agent': COMMON_USER_AGENT },
    });

    const contentTypeHeader = (
      headResponse.headers['content-type'] || ''
    ).toLowerCase();
    console.log(
      `[HEAD Request] URL: ${parsedUrl.href}, Detected Content-Type: ${contentTypeHeader}`
    );

    if (contentTypeHeader.includes('application/pdf')) {
      isPdfContentType = true;
    }
  } catch (error) {
    headRequestError = error as Error;
    console.warn(
      `[HEAD Request] Failed for ${parsedUrl.href}: ${headRequestError.message}. Proceeding with Firecrawl.`
    );
  }

  if (isPdfContentType) {
    try {
      console.log(
        `[PDF Processing] Content-Type is PDF. Downloading and parsing: ${parsedUrl.href}`
      );
      const pdfResponse = await axios.get(parsedUrl.href, {
        responseType: 'arraybuffer',
        timeout: AXIOS_TIMEOUT_PDF_DOWNLOAD,
        headers: { 'User-Agent': COMMON_USER_AGENT },
      });

      if (pdfResponse.status !== 200) {
        throw new Error(
          `Failed to download PDF. Status: ${pdfResponse.status}`
        );
      }

      const pdfData = await pdf(Buffer.from(pdfResponse.data));
      console.log(
        `[PDF Processing] Successfully parsed PDF: ${parsedUrl.href}`
      );
      return pdfData.text.trim();
    } catch (pdfProcessingError) {
      console.error(
        `[PDF Processing] Error for confirmed PDF ${parsedUrl.href}: ${
          (pdfProcessingError as Error).message
        }`
      );

      throw new Error(
        `Failed to process confirmed PDF from ${parsedUrl.href}: ${
          (pdfProcessingError as Error).message
        }`
      );
    }
  } else {
    const reasonForFirecrawl = headRequestError
      ? `HEAD request failed (Error: ${headRequestError.message})`
      : `Content-Type was not PDF`;

    console.log(
      `[Firecrawl Path] Using Firecrawl for ${parsedUrl.href}. Reason: ${reasonForFirecrawl}`
    );

    try {
      return await fetchWithFirecrawl(parsedUrl.href);
    } catch (firecrawlError) {
      let combinedErrorMessage = `Firecrawl processing failed for ${
        parsedUrl.href
      }: ${(firecrawlError as Error).message}.`;
      if (headRequestError) {
        combinedErrorMessage += ` (Initial HEAD request also failed: ${headRequestError.message})`;
      }
      throw new Error(combinedErrorMessage);
    }
  }
}
