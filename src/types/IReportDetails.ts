import { IReportFile } from './IReportFile';

export interface ISystemInfo {
  platform: string;
  platformVersion: string;
  architecture: string;
  appVersion: string;
  process: string;
}

export interface IReportDetails {
  title: string;
  systemInfo: ISystemInfo;
  errorMessage: string;
  gameMode: string;
  extensionVersion: string;
  externalFileUrl: string;
  steps: string;
  expectedBehavior: string;
  actualBehavior: string;
  attachments: IReportFile[];
  errorContext?: { [ key: string ]: any };
  hash: string;
  reportedBy: string;
}