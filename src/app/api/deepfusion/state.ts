// src/state.ts
import { Annotation } from '@langchain/langgraph';
import { z } from 'zod';

// Zod schemas for structured outputs (no change here)
export const SectionSchema = z.object({
  name: z.string().describe('Name for this section of the report.'),
  description: z
    .string()
    .describe(
      'Brief overview of the main topics and concepts to be covered in this section.'
    ),
  research: z
    .boolean()
    .describe(
      'Whether to perform web research for this section of the report.'
    ),
  content: z.string().describe('The content of the section.'),
});
export type Section = z.infer<typeof SectionSchema>;

export const SectionsSchema = z.object({
  title: z.string().describe('Short Title of the report.'),
  sections: z.array(SectionSchema).describe('Sections of the report.'),
});
export type Sections = z.infer<typeof SectionsSchema>;

export const SearchQuerySchema = z.object({
  search_query: z.string().describe('Query for web search.'),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const QueriesSchema = z.object({
  queries: z.array(SearchQuerySchema).describe('List of search queries.'),
});
export type Queries = z.infer<typeof QueriesSchema>;

export const FeedbackSchema = z.object({
  grade: z
    .enum(['pass', 'fail'])
    .describe(
      "Evaluation result indicating whether the response meets requirements ('pass') or needs revision ('fail')."
    ),
  follow_up_queries: z
    .array(SearchQuerySchema)
    .describe('List of follow-up search queries.'),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

// LangGraph State Annotations
export const ReportStateInputAnnotation = Annotation.Root({
  topic: Annotation<string>(),
});
export type ReportStateInput = typeof ReportStateInputAnnotation.State;

export const ReportStateOutputAnnotation = Annotation.Root({
  final_report: Annotation<string | null>(), // Report can be null if not generated
});
export type ReportStateOutput = typeof ReportStateOutputAnnotation.State;

export const ReportStateAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  title: Annotation<string>(),
  description: Annotation<string>(),
  feedback_on_report_plan: Annotation<string | null>(),
  sections: Annotation<Section[]>(),
  completed_sections: Annotation<Section[]>({
    reducer: (current: Section[], update?: Section[] | Section) => {
      if (!update) return current;
      if (Array.isArray(update)) {
        return current.concat(update);
      }
      return current.concat([update]);
    },
    default: () => [],
  }),
  report_sections_from_research: Annotation<string | null>(), // LastValue with default
  final_report: Annotation<string | null>(), // LastValue with default
});
export type ReportState = typeof ReportStateAnnotation.State;

export const SectionStateAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  section: Annotation<Section>(),
  search_iterations: Annotation<number>(),
  search_queries: Annotation<SearchQuery[]>(),
  source_str: Annotation<string | null>(),
  report_sections_from_research: Annotation<string | null>(),
  completed_sections: Annotation<Section[]>({
    reducer: (current: Section[], update?: Section[] | Section) => {
      if (!update) return current;
      if (Array.isArray(update)) {
        return current.concat(update);
      }
      return current.concat([update]);
    },
    default: () => [],
  }),
});
export type SectionState = typeof SectionStateAnnotation.State;

export const SectionOutputStateAnnotation = Annotation.Root({
  completed_sections: Annotation<Section[]>(), // Making sure even output schema fields have defaults if they are not reducers
});
export type SectionOutputState = typeof SectionOutputStateAnnotation.State;
