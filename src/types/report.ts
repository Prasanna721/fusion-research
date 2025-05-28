export interface Source {
  url: string;
  title?: string;
}

export interface ReportDisplayProps {
  reportContent: string;
  title?: string;
  defaultCollapsed?: boolean;
  className?: string;
}
