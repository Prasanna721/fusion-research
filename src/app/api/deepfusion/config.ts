import { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

export const RESEARCH_STRUCTURE = `Use this structure to create a report on the user-provided topic:

1. Introduction (no research needed)
   - Brief overview of the topic area

2. Main Body Sections:
   - Each section should focus on a sub-topic of the user-provided topic
   
3. Conclusion
   - Aim for 1 structural element (either a list of table) that distills the main body sections 
   - Provide a concise summary of the report`;

export enum SearchAPI {
  PERPLEXITY = 'perplexity',
  TAVILY = 'tavily',
  EXA = 'exa',
  ARXIV = 'arxiv',
  PUBMED = 'pubmed',
  LINKUP = 'linkup',
  DUCKDUCKGO = 'duckduckgo',
  GOOGLESEARCH = 'googlesearch',
}

export const ConfigurationSchema = z.object({
  report_structure: z.string().default(RESEARCH_STRUCTURE),
  search_api: z.nativeEnum(SearchAPI).default(SearchAPI.TAVILY),
  search_api_config: z.record(z.any()).optional(),
  number_of_queries: z.number().int().min(1).default(2),
  max_search_depth: z.number().int().min(1).default(2),
  planner_provider: z.string().default('anthropic'),
  planner_model: z.string().default('claude-3-5-sonnet-20240620'),
  planner_model_kwargs: z.record(z.any()).optional(),
  writer_provider: z.string().default('anthropic'),
  writer_model: z.string().default('claude-3-5-sonnet-20240620'),
  writer_model_kwargs: z.record(z.any()).optional(),
  supervisor_model: z.string().default('openai:gpt-4o'),
  researcher_model: z.string().default('openai:gpt-4o'),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;

export function getConfiguration(config?: RunnableConfig): Configuration {
  const configurable = config?.configurable ?? {};

  const envConfig: Partial<Configuration> = {
    report_structure: process.env.REPORT_STRUCTURE,
    search_api: process.env.SEARCH_API as SearchAPI,
    // search_api_config would need custom parsing if set via ENV
    number_of_queries: process.env.NUMBER_OF_QUERIES
      ? parseInt(process.env.NUMBER_OF_QUERIES)
      : undefined,
    max_search_depth: process.env.MAX_SEARCH_DEPTH
      ? parseInt(process.env.MAX_SEARCH_DEPTH)
      : undefined,
    planner_provider: process.env.PLANNER_PROVIDER,
    planner_model: process.env.PLANNER_MODEL,
    writer_provider: process.env.WRITER_PROVIDER,
    writer_model: process.env.WRITER_MODEL,
    supervisor_model: process.env.SUPERVISOR_MODEL,
    researcher_model: process.env.RESEARCHER_MODEL,
  };

  const mergedConfig: Record<string, any> = {};
  for (const key of Object.keys(ConfigurationSchema.shape)) {
    mergedConfig[key] =
      configurable[key] ?? envConfig[key as keyof Configuration];
  }

  return ConfigurationSchema.parse(mergedConfig);
}
