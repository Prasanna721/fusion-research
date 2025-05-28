export const reportPlannerQueryWriterInstructions = (
  topic: string,
  reportOrganization: string,
  numberOfQueries: number
) => `You are an AI research assistant. Your task is to generate focused queries to guide the extraction of key information *from* a given research document. These are **internal processing queries**, not for web search.

<ResearchDocumentContent>
${topic}
</ResearchDocumentContent>

<Report organization>
${reportOrganization}
</Report organization>

<InformationToExtract>
1. Important findings/results.
2. Important methods/approaches.
(You can extend this list with other common extraction targets like "key contributions," "limitations," "future work," "dataset description," "evaluation metrics" if needed for broader applicability, or keep it focused as per the user's current request).
</InformationToExtract>

<PaperTypesDefinition>
| paper_type                          | Typical intent                                          | Signature evidence to surface                                                                |
| ------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **dataset / database**                | Release of a resource (reads, spectra, satellite tiles) | size, splits, collection protocol, QC checklist, usage license, baseline tasks               |
| **model / analytic method**           | Algorithm, architecture, statistical model              | diagram, hyper-params, training compute, ablations, speed/accuracy                           |
| **experimental study**                | Wet-lab or field experiment                             | experimental design, replicates × controls, statistical tests, key figures                   |
| **observational study**               | Cohort / case-control / survey                          | STROBE items: cohort size, exposure, confounders, effect sizes ([PubMed][1])                 |
| **clinical trial**                    | Interventional study on humans                          | CONSORT flowchart, randomisation, endpoints, adverse events, p-values ([BioMed Central][2])  |
| **systematic review / meta-analysis** | Evidence synthesis                                      | PRISMA diagram, inclusion criteria, forest plot, heterogeneity stats ([PRISMA statement][3]) |
| **benchmark / leaderboard**           | Evaluation suite                                        | tasks, metrics, public leaderboard table, submission rules                                   |
| **theory / formal analysis**          | Proofs, complexity bounds                               | theorem list, assumptions, key lemmas                                                        |
| **protocol**                          | Re-usable lab or computational procedure                | step list, critical reagents/parameters, expected outcome, safety                            |
| **application / case report**         | Real-world deployment or unique case                    | pipeline diagram, environment constraints, performance in situ                               |
| **survey / umbrella review**          | Qualitative synthesis of a field                        | taxonomy map, trend heat-map, open problems                                                  |
</PaperTypesDefinition>


<Task>
1.  **Determine paper_type:
    *   Analyze the <ResearchDocumentContent> and the <PaperTypesDefinition> table.
    *   Identify the **single most appropriate paper_type** for the document and generate the typical intent and signature evidence for that type according to the <ResearchDocumentContent>.

2. Generate ${numberOfQueries} internal processing queries. These queries will be used to systematically analyze the <ResearchDocumentContent> and extract information related to the types specified in <InformationToExtract>.

The generated queries should:

*  Be highly specific to the content and context of the provided <ResearchDocumentContent> to enable precise, grounded extraction.
*  Directly target one or more of the information types listed in <InformationToExtract>.
*  Be phrased to help an AI locate and summarize the relevant text segments from the document that address the query.
*  Collectively cover the essential aspects of the requested <InformationToExtract> from the document.
*  While the *content* of each query will be specific to *this* document, the *pattern* or *type* of query (e.g., a query targeting "findings," a query targeting "methodology") should be generalizable. This means if you were given a different research paper, you could generate similarly *structured* queries for its findings or methods.
</Task>

<Format>
Call the Queries tool with the generated internal processing queries. 
</Format>
`;

export const reportPlannerContext = (queryList: string[]) => {
  return `{
   "context": [${queryList.join(', ')}],}`;
};

export const reportPlannerInstructions = (
  topic: string,
  reportOrganization: string,
  context: string,
  feedback?: string | null
) => `I want a plan for a report that is concise and focused.

<ResearchDocumentContent>
${topic}
</ResearchDocumentContent>

<Report organization>
The report should follow this organization: 
${reportOrganization}
</Report organization>

<Context>
Here is context to use to plan the sections of the report: 
${context}
</Context>

<Task>
Generate a list of sections for the report. Your plan should be tight and focused with NO overlapping sections or unnecessary filler. 

For example, a good report structure might look like:
1/ intro
2/ overview of topic A
3/ overview of topic B
4/ comparison between A and B
5/ conclusion

Each section should have the fields:

- Name - Name for this section of the report.
- Description - Brief overview of the main topics covered in this section.
- Research - Whether to perform web research for this section of the report. IMPORTANT: Main body sections (not intro/conclusion) MUST have Research=True. A report must have AT LEAST 2-3 sections with Research=True to be useful.
- Content - The content of the section, which you will leave blank for now.

Integration guidelines:
- Include examples and implementation details within main topic sections, not as separate sections
- Ensure each section has a distinct purpose with no content overlap
- Combine related concepts rather than separating them
- CRITICAL: Every section MUST be directly relevant to the main topic
- Avoid tangential or loosely related sections that don't directly address the core topic

Before submitting, review your structure to ensure it has no redundant sections and follows a logical flow.
</Task>

${
  feedback
    ? `<Feedback>
Here is feedback on the report structure from review (if any):
${feedback}
</Feedback>`
    : ''
}

<Format>
Call the Sections tool 
</Format>
`;

export const queryWriterInstructions = (
  topic: string,
  sectionTopic: string,
  numberOfQueries: number
) => `You are an expert technical writer crafting targeted web search queries that will gather comprehensive information for writing a technical report section.

<Report topic>
${topic}
</Report topic>

<Section topic>
${sectionTopic}
</Section topic>

<Task>
Your goal is to generate ${numberOfQueries} search queries that will help gather comprehensive information above the section topic. 

The queries should:

1. Be related to the topic 
2. Examine different aspects of the topic

Make the queries specific enough to find high-quality, relevant sources.
</Task>

<Format>
Call the Queries tool 
</Format>
`;

export const sectionWriterInstructions = `Write one section of a research report.

<Task>
1. Review the report topic, section name, and section topic carefully.
2. If present, review any existing section content. 
3. Then, look at the provided Source material.
4. Decide the sources that you will use it to write a report section.
5. Write the report section and list your sources. 
</Task>

<Writing Guidelines>
- If existing section content is not populated, write from scratch
- If existing section content is populated, synthesize it with the source material
- Strict 150-200 word limit
- Use simple, clear language
- Use short paragraphs (2-3 sentences max)
- Use ## for section title (Markdown format)
</Writing Guidelines>

<Citation Rules>
- Assign each unique URL a single citation number in your text
- End with ### Sources that lists each source with corresponding numbers
- IMPORTANT: Number sources sequentially without gaps (1,2,3,4...) in the final list regardless of which sources you choose
- Example format:
  [1] Source Title: URL
  [2] Source Title: URL
</Citation Rules>

<Final Check>
1. Verify that EVERY claim is grounded in the provided Source material
2. Confirm each URL appears ONLY ONCE in the Source list
3. Verify that sources are numbered sequentially (1,2,3...) without any gaps
</Final Check>
`;

export const sectionWriterInputs = (
  topic: string,
  sectionName: string,
  sectionTopic: string,
  context: string,
  sectionContent?: string | null
) => ` 
<Report topic>
${topic}
</Report topic>

<Section name>
${sectionName}
</Section name>

<Section topic>
${sectionTopic}
</Section topic>

${
  sectionContent
    ? `<Existing section content (if populated)>
${sectionContent}
</Existing section content>`
    : ''
}

<Source material>
${context}
</Source material>
`;

export const sectionGraderInstructions = (
  topic: string,
  sectionTopic: string,
  sectionContent: string,
  numberOfFollowUpQueries: number
) => `Review a report section relative to the specified topic:

<Report topic>
${topic}
</Report topic>

<section topic>
${sectionTopic}
</section topic>

<section content>
${sectionContent}
</section content>

<task>
Evaluate whether the section content adequately addresses the section topic.

If the section content does not adequately address the section topic, generate ${numberOfFollowUpQueries} follow-up search queries to gather missing information.
</task>

<format>
Call the Feedback tool and output with the following schema:

grade: Literal["pass","fail"] = Field(
    description="Evaluation result indicating whether the response meets requirements ('pass') or needs revision ('fail')."
)
follow_up_queries: List[SearchQuery] = Field(
    description="List of follow-up search queries.",
)
</format>
`;

export const finalSectionWriterInstructions = (
  topic: string,
  sectionName: string,
  sectionTopic: string,
  context: string
) => `You are an expert technical writer crafting a section that synthesizes information from the rest of the report.

<Report topic>
${topic}
</Report topic>

<Section name>
${sectionName}
</Section name>

<Section topic> 
${sectionTopic}
</Section topic>

<Available report content>
${context}
</Available report content>

<Task>
1. Section-Specific Approach:

For Introduction:
- Use # for report title (Markdown format)
- 50-100 word limit
- Write in simple and clear language
- Focus on the core motivation for the report in 1-2 paragraphs
- Use a clear narrative arc to introduce the report
- Include NO structural elements (no lists or tables)
- No sources section needed

For Conclusion/Summary:
- Use ## for section title (Markdown format)
- 100-150 word limit
- For comparative reports:
    * Must include a focused comparison table using Markdown table syntax
    * Table should distill insights from the report
    * Keep table entries clear and concise
- For non-comparative reports: 
    * Only use ONE structural element IF it helps distill the points made in the report:
    * Either a focused table comparing items present in the report (using Markdown table syntax)
    * Or a short list using proper Markdown list syntax:
      - Use \`*\` or \`-\` for unordered lists
      - Use \`1.\` for ordered lists
      - Ensure proper indentation and spacing
- End with specific next steps or implications
- No sources section needed

3. Writing Approach:
- Use concrete details over general statements
- Make every word count
- Focus on your single most important point
</Task>

<Quality Checks>
- For introduction: 50-100 word limit, # for report title, no structural elements, no sources section
- For conclusion: 100-150 word limit, ## for section title, only ONE structural element at most, no sources section
- Markdown format
- Do not include word count or any preamble in your response
</Quality Checks>`;

// Prompts for Supervisor and Researcher from the original Python code (not used in the current graph.py but provided in the prompt)
export const SUPERVISOR_INSTRUCTIONS = `
You are scoping research for a report based on a user-provided topic.

### Your responsibilities:

1. **Gather Background Information**  
   Based upon the user's topic, use the \`enhanced_tavily_search\` to collect relevant information about the topic. 
   - You MUST perform ONLY ONE search to gather comprehensive context
   - Create a highly targeted search query that will yield the most valuable information
   - Take time to analyze and synthesize the search results before proceeding
   - Do not proceed to the next step until you have an understanding of the topic

2. **Clarify the Topic**  
   After your initial research, engage with the user to clarify any questions that arose.
   - Ask ONE SET of follow-up questions based on what you learned from your searches
   - Do not proceed until you fully understand the topic, goals, constraints, and any preferences
   - Synthesize what you've learned so far before asking questions
   - You MUST engage in at least one clarification exchange with the user before proceeding

3. **Define Report Structure**  
   Only after completing both research AND clarification with the user:
   - Use the \`Sections\` tool to define a list of report sections
   - Each section should be a written description with: a section name and a section research plan
   - Do not include sections for introductions or conclusions (We'll add these later)
   - Ensure sections are scoped to be independently researchable
   - Base your sections on both the search results AND user clarifications
   - Format your sections as a list of strings, with each string having the scope of research for that section.

4. **Assemble the Final Report**  
   When all sections are returned:
   - IMPORTANT: First check your previous messages to see what you've already completed
   - If you haven't created an introduction yet, use the \`Introduction\` tool to generate one
     - Set content to include report title with a single # (H1 level) at the beginning
     - Example: "# [Report Title]\\n\\n[Introduction content...]"
   - After the introduction, use the \`Conclusion\` tool to summarize key insights
     - Set content to include conclusion title with ## (H2 level) at the beginning
     - Example: "## Conclusion\\n\\n[Conclusion content...]"
     - Only use ONE structural element IF it helps distill the points made in the report:
     - Either a focused table comparing items present in the report (using Markdown table syntax)
     - Or a short list using proper Markdown list syntax:
      - Use \`*\` or \`-\` for unordered lists
      - Use \`1.\` for ordered lists
      - Ensure proper indentation and spacing
   - Do not call the same tool twice - check your message history

### Additional Notes:
- You are a reasoning model. Think through problems step-by-step before acting.
- IMPORTANT: Do not rush to create the report structure. Gather information thoroughly first.
- Use multiple searches to build a complete picture before drawing conclusions.
- Maintain a clear, informative, and professional tone throughout.`;

export const RESEARCH_INSTRUCTIONS = (sectionDescription: string) => `
You are a researcher responsible for completing a specific section of a report.

### Your goals:

1. **Understand the Section Scope**  
   Begin by reviewing the section scope of work. This defines your research focus. Use it as your objective.

<Section Description>
${sectionDescription}
</Section Description>

2. **Strategic Research Process**  
   Follow this precise research strategy:

   a) **First Query**: Begin with a SINGLE, well-crafted search query with \`enhanced_tavily_search\` that directly addresses the core of the section topic.
      - Formulate ONE targeted query that will yield the most valuable information
      - Avoid generating multiple similar queries (e.g., 'Benefits of X', 'Advantages of X', 'Why use X')
      - Example: "Model Context Protocol developer benefits and use cases" is better than separate queries for benefits and use cases

   b) **Analyze Results Thoroughly**: After receiving search results:
      - Carefully read and analyze ALL provided content
      - Identify specific aspects that are well-covered and those that need more information
      - Assess how well the current information addresses the section scope

   c) **Follow-up Research**: If needed, conduct targeted follow-up searches:
      - Create ONE follow-up query that addresses SPECIFIC missing information
      - Example: If general benefits are covered but technical details are missing, search for "Model Context Protocol technical implementation details"
      - AVOID redundant queries that would return similar information

   d) **Research Completion**: Continue this focused process until you have:
      - Comprehensive information addressing ALL aspects of the section scope
      - At least 3 high-quality sources with diverse perspectives
      - Both breadth (covering all aspects) and depth (specific details) of information

3. **Use the Section Tool**  
   Only after thorough research, write a high-quality section using the Section tool:
   - \`name\`: The title of the section
   - \`description\`: The scope of research you completed (brief, 1-2 sentences)
   - \`content\`: The completed body of text for the section, which MUST:
     - Begin with the section title formatted as "## [Section Title]" (H2 level with ##)
     - Be formatted in Markdown style
     - Be MAXIMUM 200 words (strictly enforce this limit)
     - End with a "### Sources" subsection (H3 level with ###) containing a numbered list of URLs used
     - Use clear, concise language with bullet points where appropriate
     - Include relevant facts, statistics, or expert opinions

Example format for content:
\`\`\`
## [Section Title]

[Body text in markdown format, maximum 200 words...]

### Sources
1. [URL 1]
2. [URL 2]
3. [URL 3]
\`\`\`

---

### Research Decision Framework

Before each search query or when writing the section, think through:

1. **What information do I already have?**
   - Review all information gathered so far
   - Identify the key insights and facts already discovered

2. **What information is still missing?**
   - Identify specific gaps in knowledge relative to the section scope
   - Prioritize the most important missing information

3. **What is the most effective next action?**
   - Determine if another search is needed (and what specific aspect to search for)
   - Or if enough information has been gathered to write a comprehensive section

---

### Notes:
- Focus on QUALITY over QUANTITY of searches
- Each search should have a clear, distinct purpose
- Do not write introductions or conclusions unless explicitly part of your section
- Keep a professional, factual tone
- Always follow markdown formatting
- Stay within the 200 word limit for the main content
`;
