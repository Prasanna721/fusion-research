import { type Section } from './state';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function formatSections(sections: Section[]): string {
  let formattedStr = '';
  sections.forEach((section, idx) => {
    formattedStr += `
${'='.repeat(60)}
Section ${idx + 1}: ${section.name}
${'='.repeat(60)}
Description:
${section.description}
Requires Research: 
${section.research}

Content:
${section.content || '[Not yet written]'}
`;
  });
  return formattedStr;
}

export async function visualizeGraph(runnableGraph: any, thread: any) {
  const drawableGraph = await runnableGraph.getGraphAsync(thread);
  const blob = await drawableGraph.drawMermaidPng();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(resolve('./graph.png'), buffer);
}
