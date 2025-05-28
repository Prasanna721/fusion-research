export const FORMAT_SPAN = (text: string): string => {
  return `<span class="rounded-md" style="background-color: #e9e9e9;padding: 2px 5px;">${text}</span>`;
};
export const EVENT_TEMPLATE_INIT_EXT = `Extracting content from (${FORMAT_SPAN(
  '{{{url}}}'
)})`;

export const EVENT_TEMPLATE_START_EXT_FIRECRAWL = `The url appears to a webpage, extracting webpage content using ${FORMAT_SPAN(
  'Firecrawl'
)}`;
export const EVENT_TEMPLATE_START_EXT_MISTRAL = `The url appears to a document, extracting document content using ${FORMAT_SPAN(
  'Mistral OCR'
)}`;

export const getGraphEventDetails = (
  thread: any,
  nodeName: string
): { title?: string; provider?: string; message?: string } => {
  if (nodeName === 'generate_report_plan') {
    return {
      title: 'Generating research plan',
      provider: thread.configurable.planner_provider,
      message: 'Understanding the content and generating a research plan',
    };
  } else if (nodeName === 'human_feedback') {
    return {
      title: 'Reviewing feedbacks',
      message: 'Reviewing feedbacks on research plan',
    };
  } else if (nodeName === 'build_section_with_web_research') {
    return {
      title: 'Web research',
      provider: thread.configurable.search_api,
      message: 'Researching the web for relevant information',
    };
  } else if (nodeName === 'gather_completed_sections') {
    return {
      title: 'Aggregating results',
      message: 'Aggregating research from research papers, web and articles',
    };
  } else if (nodeName === 'write_final_sections') {
    return {
      title: 'Analyzing results',
      provider: thread.configurable.writer_provider,
      message: 'Analyzing results and writing the final report',
    };
  } else if (nodeName === 'compile_final_report') {
    return {
      title: 'Gathering informations',
      message: 'Putting together all the information and generating the report',
    };
  } else {
    return {};
  }
};
