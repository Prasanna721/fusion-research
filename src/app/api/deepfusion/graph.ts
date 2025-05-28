import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  Command,
  END,
  interrupt,
  Send,
  START,
  StateGraph,
} from '@langchain/langgraph';

import { getConfiguration } from './config';
import * as Prompts from './prompts';
import {
  getSearchConfigValue,
  getSearchToolParams,
  selectAndExecuteSearch,
} from '../deepsearch/searchUtils';
import {
  type ReportState,
  type SectionState,
  FeedbackSchema,
  QueriesSchema,
  ReportStateAnnotation,
  ReportStateInputAnnotation,
  ReportStateOutputAnnotation,
  SectionOutputStateAnnotation,
  SectionsSchema,
  SectionStateAnnotation,
} from './state';
import { formatSections as formatSectionsUtil } from './utils'; // Renamed to avoid conflict with Sections type
import { initChatModel } from '@/app/api/deepsearch/chatModelFactory';

// Helper to get config value or throw if undefined
function getConfigValueOrThrow<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`${name} is undefined in configuration.`);
  }
  return value;
}

async function generateReportPlan(
  state: ReportState,
  config?: RunnableConfig
): Promise<Partial<ReportState>> {
  const topic = state.topic;
  const feedbackOnReportPlan = state.feedback_on_report_plan;

  const configurable = getConfiguration(config);
  const reportStructure = configurable.report_structure;
  const numberOfQueries = configurable.number_of_queries;
  const searchApi = getSearchConfigValue(configurable.search_api);
  const searchApiConfig = configurable.search_api_config ?? {};
  const paramsToPass = getSearchToolParams(searchApi, searchApiConfig);

  const writerProvider = getConfigValueOrThrow(
    configurable.writer_provider,
    'writer_provider'
  );
  const writerModelName = getConfigValueOrThrow(
    configurable.writer_model,
    'writer_model'
  );
  const writerModelKwargs = configurable.writer_model_kwargs ?? {};
  const writerModel = initChatModel(
    `${writerProvider}:${writerModelName}`,
    writerModelKwargs
  );
  const structuredQueryLlm = writerModel.withStructuredOutput(QueriesSchema);

  const systemInstructionsQuery = Prompts.reportPlannerQueryWriterInstructions(
    topic,
    reportStructure,
    numberOfQueries
  );
  const queryResults = await structuredQueryLlm.invoke([
    new SystemMessage(systemInstructionsQuery),
    new HumanMessage(
      'Generate search queries that will help with planning the sections of the report.'
    ),
  ]);

  const queryList = queryResults.queries.map((q) => q.search_query);
  const sourceStr = await selectAndExecuteSearch(
    searchApi,
    queryList,
    paramsToPass
  );

  const plannerProvider = getConfigValueOrThrow(
    configurable.planner_provider,
    'planner_provider'
  );
  const plannerModelName = getConfigValueOrThrow(
    configurable.planner_model,
    'planner_model'
  );
  const plannerModelKwargs = configurable.planner_model_kwargs ?? {};

  let plannerLlm;
  // handling for Claude 3.7 Sonnet "thinking" tokens
  if (plannerModelName === 'claude-3-5-sonnet-20240620') {
    plannerLlm = initChatModel(`${plannerProvider}:${plannerModelName}`, {
      maxTokens: 20000,
      // thinking: { type: "enabled", budget_tokens: 16000 }
      ...(plannerModelKwargs.max_tokens ? {} : { max_tokens: 20000 }),
      ...plannerModelKwargs,
    });
  } else {
    plannerLlm = initChatModel(
      `${plannerProvider}:${plannerModelName}`,
      plannerModelKwargs
    );
  }

  const structuredSectionsLlm = plannerLlm.withStructuredOutput(SectionsSchema);
  const systemInstructionsSections = Prompts.reportPlannerInstructions(
    topic,
    reportStructure,
    sourceStr,
    feedbackOnReportPlan
  );
  const plannerMessage = `Generate the sections of the report. Your response must include a 'sections' field containing a list of sections. 
                        Each section must have: name, description, plan, research, and content fields.`;

  const reportSections = await structuredSectionsLlm.invoke([
    new SystemMessage(systemInstructionsSections),
    new HumanMessage(plannerMessage),
  ]);

  return { title: reportSections.title, sections: reportSections.sections };
}

// function humanFeedbackNode(
//   state: ReportState,
//   _config?: RunnableConfig
// ): Command {
//   const topic = state.topic;
//   const sections = state.sections;
//   const sectionsStr = sections
//     .map(
//       (section) =>
//         `Section: ${section.name}\nDescription: ${
//           section.description
//         }\nResearch needed: ${section.research ? 'Yes' : 'No'}`
//     )
//     .join('\n\n');

//   const interruptMessage = `Please provide feedback on the following report plan.
//                         \n\n${sectionsStr}\n
//                         \nDoes the report plan meet your needs?
//                         \nPass true to approve the report plan.
//                         \nOr, provide feedback (string) to regenerate the report plan:`;

//   const feedback = interrupt<string, boolean | string>(interruptMessage);

//   if (typeof feedback === 'boolean' && feedback === true) {
//     const researchSections = sections.filter((s) => s.research);
//     const sends = researchSections.map(
//       (s) =>
//         new Send('build_section_with_web_research', {
//           topic,
//           section: s,
//           search_iterations: 0,
//         })
//     );
//     return new Command({
//       goto: sends.length > 0 ? sends : ['gather_completed_sections'],
//     }); // If no research sections, go directly to gather.
//   } else if (typeof feedback === 'string') {
//     return new Command({
//       goto: 'generate_report_plan',
//       update: { feedback_on_report_plan: feedback },
//     });
//   } else {
//     throw new TypeError(
//       `Interrupt value of type ${typeof feedback} is not supported.`
//     );
//   }
// }

function buildSections(state: ReportState, _config?: RunnableConfig): Command {
  const topic = state.topic;
  const sections = state.sections;
  const researchSections = sections.filter((s) => s.research);
  const sends = researchSections.map(
    (s) =>
      new Send('build_section_with_web_research', {
        topic,
        section: s,
        search_iterations: 0,
      })
  );
  return new Command({
    goto: sends.length > 0 ? sends : ['gather_completed_sections'],
  });
}

async function generateQueriesNode(
  state: SectionState,
  config?: RunnableConfig
): Promise<Partial<SectionState>> {
  const topic = state.topic;
  const section = state.section;

  const configurable = getConfiguration(config);
  const numberOfQueries = configurable.number_of_queries;

  const writerProvider = getConfigValueOrThrow(
    configurable.writer_provider,
    'writer_provider'
  );
  const writerModelName = getConfigValueOrThrow(
    configurable.writer_model,
    'writer_model'
  );
  const writerModelKwargs = configurable.writer_model_kwargs ?? {};
  const writerModel = initChatModel(
    `${writerProvider}:${writerModelName}`,
    writerModelKwargs
  );
  const structuredLlm = writerModel.withStructuredOutput(QueriesSchema);

  const systemInstructions = Prompts.queryWriterInstructions(
    topic,
    section.description,
    numberOfQueries
  );
  const queries = await structuredLlm.invoke([
    new SystemMessage(systemInstructions),
    new HumanMessage('Generate search queries on the provided topic.'),
  ]);

  return { search_queries: queries.queries };
}

async function searchWebNode(
  state: SectionState,
  config?: RunnableConfig
): Promise<Partial<SectionState>> {
  const searchQueries = state.search_queries;

  const configurable = getConfiguration(config);
  const searchApi = getSearchConfigValue(configurable.search_api);
  const searchApiConfig = configurable.search_api_config ?? {};
  const paramsToPass = getSearchToolParams(searchApi, searchApiConfig);

  const queryList = searchQueries.map((q) => q.search_query);
  const sourceStr = await selectAndExecuteSearch(
    searchApi,
    queryList,
    paramsToPass
  );

  return {
    source_str: sourceStr,
    search_iterations: (state.search_iterations ?? 0) + 1,
  };
}

async function writeSectionNode(
  state: SectionState,
  config?: RunnableConfig
): Promise<Command> {
  const topic = state.topic;
  const section = { ...state.section };
  const sourceStr = state.source_str;

  const configurable = getConfiguration(config);

  const sectionWriterInputsFormatted = Prompts.sectionWriterInputs(
    topic,
    section.name,
    section.description,
    sourceStr ?? 'No context from web search.',
    section.content
  );

  const writerProvider = getConfigValueOrThrow(
    configurable.writer_provider,
    'writer_provider'
  );
  const writerModelName = getConfigValueOrThrow(
    configurable.writer_model,
    'writer_model'
  );
  const writerModelKwargs = configurable.writer_model_kwargs ?? {};
  const writerModel = initChatModel(
    `${writerProvider}:${writerModelName}`,
    writerModelKwargs
  );

  const sectionContentMsg = await writerModel.invoke([
    new SystemMessage(Prompts.sectionWriterInstructions),
    new HumanMessage(sectionWriterInputsFormatted),
  ]);
  section.content = sectionContentMsg.content as string;

  const sectionGraderMessage = `Grade the report and consider follow-up questions for missing information. 
                              If the grade is 'pass', return empty strings for all follow-up queries. 
                              If the grade is 'fail', provide specific search queries to gather missing information.`;
  const sectionGraderInstructionsFormatted = Prompts.sectionGraderInstructions(
    topic,
    section.description,
    section.content,
    configurable.number_of_queries
  );

  const plannerProvider = getConfigValueOrThrow(
    configurable.planner_provider,
    'planner_provider'
  );
  const plannerModelName = getConfigValueOrThrow(
    configurable.planner_model,
    'planner_model'
  );
  const plannerModelKwargs = configurable.planner_model_kwargs ?? {};

  let reflectionModel;
  if (plannerModelName === 'claude-3-5-sonnet-20240620') {
    reflectionModel = initChatModel(`${plannerProvider}:${plannerModelName}`, {
      maxTokens: 20000,
      ...plannerModelKwargs,
    }).withStructuredOutput(FeedbackSchema);
  } else {
    reflectionModel = initChatModel(
      `${plannerProvider}:${plannerModelName}`,
      plannerModelKwargs
    ).withStructuredOutput(FeedbackSchema);
  }

  const feedback = await reflectionModel.invoke([
    new SystemMessage(sectionGraderInstructionsFormatted),
    new HumanMessage(sectionGraderMessage),
  ]);

  if (
    feedback.grade === 'pass' ||
    (state.search_iterations ?? 0) >= configurable.max_search_depth
  ) {
    return new Command({
      update: { completed_sections: [section] },
      goto: END,
    });
  } else {
    return new Command({
      update: { search_queries: feedback.follow_up_queries, section },
      goto: 'search_web',
    });
  }
}

async function writeFinalSectionsNode(
  state: SectionState,
  config?: RunnableConfig
): Promise<Partial<ReportState>> {
  const configurable = getConfiguration(config);
  const topic = state.topic;
  const section = { ...state.section }; // Clone to modify
  const completedReportSections = state.report_sections_from_research;

  const systemInstructions = Prompts.finalSectionWriterInstructions(
    topic,
    section.name,
    section.description,
    completedReportSections ?? 'No prior researched sections provided.'
  );

  const writerProvider = getConfigValueOrThrow(
    configurable.writer_provider,
    'writer_provider'
  );
  const writerModelName = getConfigValueOrThrow(
    configurable.writer_model,
    'writer_model'
  );
  const writerModelKwargs = configurable.writer_model_kwargs ?? {};
  const writerModel = initChatModel(
    `${writerProvider}:${writerModelName}`,
    writerModelKwargs
  );

  const sectionContentMsg = await writerModel.invoke([
    new SystemMessage(systemInstructions),
    new HumanMessage(
      'Generate a report section based on the provided sources.'
    ),
  ]);
  section.content = sectionContentMsg.content as string;

  return { completed_sections: [section] };
}

function gatherCompletedSectionsNode(state: ReportState): Partial<ReportState> {
  const completedSections = state.completed_sections;
  const completedReportSectionsStr = formatSectionsUtil(completedSections); // Use imported util
  return { report_sections_from_research: completedReportSectionsStr };
}

function compileFinalReportNode(state: ReportState): Partial<ReportState> {
  const sections = state.sections; // Original plan
  const completedContentMap = new Map(
    state.completed_sections.map((s) => [s.name, s.content])
  );

  // Update original sections with completed content, maintaining order
  const finalSections = sections.map((s) => ({
    ...s,
    content: completedContentMap.get(s.name) || s.content, // Fallback to original (likely blank) if not found
  }));

  const allSectionsContent = finalSections.map((s) => s.content).join('\n\n');
  return { final_report: allSectionsContent, sections: finalSections }; // also update sections to have the final content
}

function initiateFinalSectionWritingEdge(state: ReportState): Send[] | string {
  const nonResearchSections = state.sections.filter((s) => !s.research);
  if (nonResearchSections.length === 0) {
    return 'compile_final_report'; // Skip if no final sections to write
  }
  return nonResearchSections.map(
    (s) =>
      new Send('write_final_sections', {
        topic: state.topic,
        section: s,
        report_sections_from_research: state.report_sections_from_research,
      })
  );
}

// Section writing sub-graph
const sectionBuilder = new StateGraph({
  stateSchema: SectionStateAnnotation,
  output: SectionOutputStateAnnotation,
})
  .addNode('generate_queries', generateQueriesNode)
  .addNode('search_web', searchWebNode)
  .addNode('write_section', writeSectionNode, { ends: [END, 'search_web'] });

sectionBuilder
  .addEdge(START, 'generate_queries')
  .addEdge('generate_queries', 'search_web')
  .addEdge('search_web', 'write_section');

const compiledSectionGraph = sectionBuilder.compile();

// Main graph
export const reportGraphBuilder = new StateGraph({
  stateSchema: ReportStateAnnotation,
  input: ReportStateInputAnnotation,
  output: ReportStateOutputAnnotation,
})
  .addNode('generate_report_plan', generateReportPlan)
  .addNode('build_sections', buildSections, {
    ends: [
      'generate_report_plan',
      'build_section_with_web_research',
      'gather_completed_sections',
    ],
  })
  .addNode('build_section_with_web_research', compiledSectionGraph)
  .addNode('gather_completed_sections', gatherCompletedSectionsNode)
  .addNode('write_final_sections', writeFinalSectionsNode)
  .addNode('compile_final_report', compileFinalReportNode);

reportGraphBuilder
  .addEdge(START, 'generate_report_plan')
  .addEdge('generate_report_plan', 'build_sections')
  .addEdge('build_section_with_web_research', 'gather_completed_sections')
  .addConditionalEdges(
    'gather_completed_sections',
    initiateFinalSectionWritingEdge,
    ['write_final_sections', 'compile_final_report']
  )
  .addEdge('write_final_sections', 'compile_final_report')
  .addEdge('compile_final_report', END);

export const graph = reportGraphBuilder;
