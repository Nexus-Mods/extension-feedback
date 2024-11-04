export type ReportType = 'bugreport' | 'suggestion' | 'question';
export type ReportTopic = 'crash' | 'login_problems' | 'slow_downloads' | 'other';
export type ReportThread = 'main' | 'renderer';
export type ReportInputConstraintType = 'title' | 'content' | 'url';
export type ReportInputType = 'title' | 'steps' | 'expected' | 'actual' | 'message' | 'url';
export type ReportRelevantURLs = 'issues' | 'support' | 'report';
export type RelevantURLs = {  [relevantUrl in ReportRelevantURLs]: string; };
