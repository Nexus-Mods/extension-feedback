import { IReportFile } from './IReportFile';

export interface ISystemInfo {
  platform: string;
  platformVersion: string;
  architecture: string;
  appVersion: string;
  process: string;
}


export interface IReportDetails {
  title?: string;
  systemInfo?: ISystemInfo;
  errorMessage?: string;
  gameMode?: string;
  extensionVersion?: string;
  externalFileUrl?: string;
  steps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  attachments?: IReportFile[];
  attachmentFilepath?: string;
  errorContext?: { [ key: string ]: any };
  hash?: string | Promise<string>;
  dateReported?: string;
  reportedBy?: string;
  additionalContext?: string;
}