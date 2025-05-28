import { DuckDuckGoSearch } from '@langchain/community/tools/duckduckgo_search';
import { ArxivRetriever } from '@langchain/community/retrievers/arxiv';
import axios from 'axios';
import { traceable } from 'langsmith/traceable';
import { SearchAPI } from './config';
import type { Document } from '@langchain/core/documents';
import TurndownService from 'turndown';

export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
  raw_content?: string | null;
}

export interface SearchResponse {
  query: string;
  follow_up_questions?: string[] | null;
  answer?: string | null;
  images?: string[];
  results: SearchResultItem[];
  error?: string;
}

export function getSearchConfigValue(
  value: string | SearchAPI | undefined
): SearchAPI {
  if (
    typeof value === 'string' &&
    Object.values(SearchAPI).includes(value as SearchAPI)
  ) {
    return value as SearchAPI;
  }
  if (value && Object.values(SearchAPI).includes(value as SearchAPI)) {
    return value as SearchAPI;
  }
  console.warn(`Invalid search_api value: ${value}. Defaulting to PERPLEXITY.`);
  return SearchAPI.PERPLEXITY;
}

export function getSearchToolParams(
  searchApi: SearchAPI,
  searchApiConfig?: Record<string, any>
): Record<string, any> {
  const SEARCH_API_PARAMS: Record<SearchAPI, string[]> = {
    [SearchAPI.TAVILY]: [
      'maxResults',
      'searchDepth',
      'includeDomains',
      'excludeDomains',
      'includeRawContent',
      'includeImages',
      'includeAnswer',
    ],
    [SearchAPI.DUCKDUCKGO]: [
      'maxResults',
      'region',
      'safeSearch',
      'time',
      'output',
    ],
    [SearchAPI.PERPLEXITY]: ['model', 'temperature', 'max_tokens'],
    [SearchAPI.EXA]: [
      'numResults',
      'includeDomains',
      'excludeDomains',
      'startCrawlDate',
      'endCrawlDate',
      'startPublishedDate',
      'endPublishedDate',
      'useAutoprompt',
      'type',
      'category',
    ],
    [SearchAPI.ARXIV]: ['maxResults', 'sortBy', 'sortOrder'],
    [SearchAPI.PUBMED]: ['maxResults', 'apiKey', 'email'],
    [SearchAPI.LINKUP]: ['depth'],
    [SearchAPI.GOOGLESEARCH]: ['num', 'start', 'lr', 'safe'],
  };

  const acceptedParams = SEARCH_API_PARAMS[searchApi] || [];
  if (!searchApiConfig) return {};
  return Object.fromEntries(
    Object.entries(searchApiConfig).filter(([key]) =>
      acceptedParams.includes(key)
    )
  );
}

export function deduplicateAndFormatSources(
  searchResponses: SearchResponse[],
  max_tokens_per_source = 5000,
  include_raw_content = true
): string {
  const sourcesList: SearchResultItem[] = [];
  for (const response of searchResponses) {
    if (response && response.results) {
      sourcesList.push(...response.results);
    }
  }

  const uniqueSources: Record<string, SearchResultItem> = {};
  for (const source of sourcesList) {
    if (source && source.url && !uniqueSources[source.url]) {
      uniqueSources[source.url] = source;
    }
  }

  let formattedText = 'Content from sources:\n';
  Object.values(uniqueSources).forEach((source, i) => {
    formattedText += `${'='.repeat(80)}\n`;
    formattedText += `Source ${i + 1}: ${source.title || 'N/A'}\n`;
    formattedText += `${'-'.repeat(80)}\n`;
    formattedText += `URL: ${source.url}\n===\n`;
    formattedText += `Most relevant content from source: ${source.content}\n===\n`;
    if (
      include_raw_content &&
      source.raw_content !== null &&
      source.raw_content !== undefined
    ) {
      const charLimit = max_tokens_per_source * 4;
      let rawContent = source.raw_content;
      if (rawContent.length > charLimit) {
        rawContent = rawContent.substring(0, charLimit) + '... [truncated]';
      }
      formattedText += `Full source content limited to ${max_tokens_per_source} tokens: ${rawContent}\n\n`;
    } else if (include_raw_content) {
      formattedText += `Full source content: [Not available or empty]\n\n`;
    }
    formattedText += `${'='.repeat(80)}\n\n`;
  });
  return formattedText.trim();
}

const tavilySearch = traceable(
  async (
    queries: string[],
    params: Record<string, any>
  ): Promise<SearchResponse[]> => {
    if (!process.env.TAVILY_API_KEY) {
      return queries.map((q) => ({
        query: q,
        results: [],
        error: 'TAVILY_API_KEY not set',
      }));
    }
    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const response = await axios.post('https://api.tavily.com/search', {
            api_key: process.env.TAVILY_API_KEY,
            query: query,
            search_depth: params.searchDepth || 'basic',
            include_answer: params.includeAnswer || false,
            max_results: params.maxResults || 5,
            include_raw_content: params.includeRawContent || false,
            include_images: params.includeImages || false,
          });
          const mappedResults: SearchResultItem[] = response.data.results.map(
            (item: any) => ({
              title: item.title,
              url: item.url,
              content: item.content,
              raw_content: item.raw_content,
              score: item.score,
            })
          );
          return {
            query,
            results: mappedResults,
            answer: response.data.answer,
          };
        } catch (e: any) {
          console.error(
            `Tavily direct search failed for query "${query}":`,
            e.message
          );
          return { query, results: [], error: e.message };
        }
      })
    );
    return results;
  },
  { name: 'tavily_search' }
);

const duckDuckGoSearch = traceable(
  async (
    queries: string[],
    params: Record<string, any>
  ): Promise<SearchResponse[]> => {
    const ddgTool = new DuckDuckGoSearch({
      maxResults: params.maxResults || 5,
      ...params,
    });
    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const searchResString = await ddgTool.invoke(query);
          const items = searchResString
            .split('\n')
            .filter((line: string) => line.trim() !== '')
            .map((line: string, idx: number) => ({
              title: `DDG Result ${idx + 1} for ${query}`,
              url: `https://duckduckgo.com/?q=${encodeURIComponent(
                query
              )}#res${idx}`, // Placeholder URL
              content: line,
              raw_content: line,
            }));
          return { query, results: items.slice(0, params.maxResults || 5) };
        } catch (e: any) {
          console.error(
            `DuckDuckGo search failed for query "${query}":`,
            e.message
          );
          return { query, results: [], error: e.message };
        }
      })
    );
    return results;
  },
  { name: 'duckduckgo_search' }
);

const exaSearch = traceable(
  async (
    queries: string[],
    params: Record<string, any>
  ): Promise<SearchResponse[]> => {
    console.warn(
      `Using placeholder search for Exa with params ${JSON.stringify(
        params
      )}. Implement actual API call.`
    );

    return queries.map((query) => ({
      query,
      results: [
        {
          title: `Exa AI Placeholder: ${query}`,
          url: 'https://exa.ai/api',
          content: 'Exa API call needed.',
          raw_content: 'Exa API call needed.',
        },
      ],
    }));

    // if (!process.env.EXA_API_KEY) {
    //   console.warn('EXA_API_KEY not set. Skipping Exa search.');
    //   return queries.map((query) => ({
    //     query,
    //     results: [],
    //     error: 'EXA_API_KEY not configured',
    //   }));
    // }
    // const exa = new Exa(process.env.EXA_API_KEY);
    // const results = await Promise.all(
    //   queries.map(async (query) => {
    //     try {
    //       const response = await exa.searchAndContents(query, {
    //         numResults: params.numResults || 5,
    //         highlights: true,
    //         text: params.text !== undefined ? params.text : true,
    //         ...params,
    //       });
    //       const mappedResults: SearchResultItem[] = response.results.map(
    //         (item) => ({
    //           title: item.title || `Exa: ${item.url}`,
    //           url: item.url,
    //           content: item.text || item.highlights?.join('\n') || '',
    //           raw_content: item.text,
    //           score: item.score,
    //         })
    //       );
    //       return { query, results: mappedResults };
    //     } catch (e: any) {
    //       console.error(`Exa search failed for query "${query}":`, e.message);
    //       return { query, results: [], error: e.message };
    //     }
    //   })
    // );
    // return results;
  },
  { name: 'exa_search' }
);

const arxivSearch = traceable(
  async (
    queries: string[],
    params: Record<string, any>
  ): Promise<SearchResponse[]> => {
    const retriever = new ArxivRetriever({
      ...params,
    });
    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const docs: Document[] = await retriever.getRelevantDocuments(query);
          const mappedResults: SearchResultItem[] = docs.map((doc) => ({
            title: doc.metadata.Title || `Arxiv: ${doc.metadata.entry_id}`,
            url: doc.metadata.entry_id,
            content: doc.pageContent,
            raw_content: doc.pageContent,
            score: doc.metadata.relevancy_score || undefined,
          }));
          return { query, results: mappedResults };
        } catch (e: any) {
          console.error(`ArXiv search failed for query "${query}":`, e.message);
          return { query, results: [], error: e.message };
        }
      })
    );
    return results;
  },
  { name: 'arxiv_search' }
);

const pubmedSearch = traceable(
  async (
    queries: string[],
    params: Record<string, any>
  ): Promise<SearchResponse[]> => {
    console.warn(
      `Using placeholder search for pubmed with params ${JSON.stringify(
        params
      )}. Implement actual API call.`
    );

    return queries.map((query) => ({
      query,
      results: [
        {
          title: `Pubmed Placeholder: ${query}`,
          url: 'https://pubmed.com',
          content: 'Pubmed API call needed.',
          raw_content: 'LinkPubmedup API call needed.',
        },
      ],
    }));
  },
  { name: 'pubmed_search' }
);

const googleCustomSearch = traceable(
  async (
    queries: string[],
    params: Record<string, any>
  ): Promise<SearchResponse[]> => {
    const apiKey = process.env.GOOGLE_API_KEY;
    const cx = process.env.GOOGLE_CX;

    if (!apiKey || !cx) {
      console.warn(
        'GOOGLE_API_KEY or GOOGLE_CX not set. Skipping Google Custom Search.'
      );
      return queries.map((query) => ({
        query,
        results: [],
        error: 'Google API/CX not configured',
      }));
    }

    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const response = await axios.get(
            'https://www.googleapis.com/customsearch/v1',
            {
              params: {
                key: apiKey,
                cx: cx,
                q: query,
                num: params.num || 5,
                ...params,
              },
            }
          );
          const mappedResults: SearchResultItem[] = (
            response.data.items || []
          ).map((item: any) => ({
            title: item.title,
            url: item.link,
            content: item.snippet,
            raw_content: item.snippet,
          }));
          return { query, results: mappedResults };
        } catch (e: any) {
          console.error(
            `Google Custom Search failed for query "${query}":`,
            e.response?.data?.error?.message || e.message
          );
          return {
            query,
            results: [],
            error: e.response?.data?.error?.message || e.message,
          };
        }
      })
    );
    return results;
  },
  { name: 'google_search' }
);

async function perplexitySearchStub(
  queries: string[],
  params: Record<string, any>
): Promise<SearchResponse[]> {
  console.warn(
    `Using placeholder search for Perplexity with params ${JSON.stringify(
      params
    )}. Implement actual API call.`
  );
  // Perplexity API typically involves sending messages to a chat model.
  // Example structure:
  // const headers = { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, ... };
  // const payload = { model: params.model || "llama-3-sonar-large-32k-online", messages: [{ role: "user", content: query }] };
  // const response = await axios.post("https://api.perplexity.ai/chat/completions", payload, { headers });
  // Then parse response.data.choices[0].message.content and potential citations.
  return queries.map((query) => ({
    query,
    results: [
      {
        title: `Perplexity Placeholder: ${query}`,
        url: 'https://perplexity.ai',
        content: 'Perplexity API call needed.',
        raw_content: 'Perplexity API call needed.',
      },
    ],
  }));
}

async function linkupSearchStub(
  queries: string[],
  params: Record<string, any>
): Promise<SearchResponse[]> {
  console.warn(
    `Using placeholder search for Linkup with params ${JSON.stringify(
      params
    )}. Implement actual API call.`
  );

  return queries.map((query) => ({
    query,
    results: [
      {
        title: `Linkup Placeholder: ${query}`,
        url: 'https://linkup.com',
        content: 'Linkup API call needed.',
        raw_content: 'Linkup API call needed.',
      },
    ],
  }));
}

export async function selectAndExecuteSearch(
  searchApiType: SearchAPI,
  queryList: string[],
  paramsToPass: Record<string, any>
): Promise<string> {
  let searchResults: SearchResponse[];

  switch (searchApiType) {
    case SearchAPI.TAVILY:
      searchResults = await tavilySearch(queryList, paramsToPass);
      break;
    case SearchAPI.DUCKDUCKGO:
      searchResults = await duckDuckGoSearch(queryList, paramsToPass);
      break;
    case SearchAPI.EXA:
      searchResults = await exaSearch(queryList, paramsToPass);
      break;
    case SearchAPI.ARXIV:
      searchResults = await arxivSearch(queryList, paramsToPass);
      break;
    case SearchAPI.PUBMED:
      searchResults = await pubmedSearch(queryList, paramsToPass);
      break;
    case SearchAPI.GOOGLESEARCH:
      searchResults = await googleCustomSearch(queryList, paramsToPass);
      break;
    case SearchAPI.PERPLEXITY:
      searchResults = await perplexitySearchStub(queryList, paramsToPass);
      break;
    case SearchAPI.LINKUP:
      searchResults = await linkupSearchStub(queryList, paramsToPass);
      break;
    default:
      const _exhaustiveCheck: never = searchApiType;
      throw new Error(`Unsupported search API: ${_exhaustiveCheck}`);
  }
  return deduplicateAndFormatSources(
    searchResults,
    paramsToPass.max_tokens_per_source,
    paramsToPass.include_raw_content
  );
}

const turndownService = new TurndownService();
async function fetchAndMarkdownify(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });
    if (
      response.headers['content-type'] &&
      response.headers['content-type'].includes('text/html')
    ) {
      const html = response.data;
      const md = turndownService.turndown(html);
      return md;
    }
    return `Non-HTML content type: ${response.headers['content-type']}`;
  } catch (error: any) {
    console.error(`Error fetching or markdownifying ${url}: ${error.message}`);
    return `Error fetching ${url}: ${error.message}`;
  }
}

export const scrapeUrlsIfNecessary = traceable(
  async (items: SearchResultItem[]): Promise<SearchResultItem[]> => {
    return Promise.all(
      items.map(async (item) => {
        if (!item.raw_content && item.url) {
          const scrapedContent = await fetchAndMarkdownify(item.url);
          return {
            ...item,
            raw_content: scrapedContent || '[Scraping failed or no content]',
          };
        }
        return item;
      })
    );
  },
  { name: 'scrape_urls' }
);
