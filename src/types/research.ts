export type FocusCategory = 'DOMAIN_1' | 'DOMAIN_2' | 'RESEARCH_CONTEXT';

export enum FocusCategoryType {
  DOMAIN_1 = 'DOMAIN_1',
  DOMAIN_2 = 'DOMAIN_2',
  RESEARCH_CONTEXT = 'RESEARCH_CONTEXT',
}

export interface FocusItem {
  id: string;
  text: string;
  category: FocusCategory;
  isEnabled: boolean;
}

export const FOCUS_CATEGORY_LABELS: Record<FocusCategory, string> = {
  DOMAIN_1: 'Domain 1',
  DOMAIN_2: 'Domain 2',
  RESEARCH_CONTEXT: 'Research Context',
};
