/* eslint-disable */
import crypto from 'crypto';
import path from 'path';
import { tmpName } from 'tmp';
import Zip from 'node-7z';
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';
import { addFeedbackFile, setFeedbackHash } from './actions/session';
import { fs, types, util } from 'vortex-api';
import {
  IInputConstraint, IInputValidationResult, IReportDetails,
  IReportFile, ISystemInfo, ReportInputConstraintType, RelevantURLs
} from './types';

export const RELEVANT_URLS: RelevantURLs = {
  issues: 'https://github.com/Nexus-Mods/Vortex/issues',
  support: 'https://forums.nexusmods.com/index.php?/forum/4306-vortex-support',
  report: 'https://report.nexusmods.com/?tags=vortex',
}

export const SAMPLE_REPORT_BUG = 'E.g.:\n' +
  'Summary: The mod downloads properly but when I try to install it nothing happens.\n' +
  'Expected Results: The mod is installed.\n' +
  'Actual Results: Nothing happens.\n' +
  'Steps to reproduce: Download a mod, then click Install inside the Actions menu.';

export const SAMPLE_REPORT_SUGGESTION = 'E.g.:\n'
  + 'Summary: Please add a way to see the size of a mod on disk\n'
  // tslint:disable-next-line:max-line-length
  + 'Rationale: Space on my games partition is too limited so I want to delete the biggest, uninstalled mods.\n'
  + 'Proposed Implementation: Add a column to the mods page that shows the size of the mod size.';

export const DEFAULT_TEMPLATE = `
# Crash Report: {{title}}

## System Information
- **Platform**: {{platform}}
- **Architecture**: {{architecture}}
- **Application Version**: {{appVersion}}
- **Process**: {{process}}

## Error Message
\`\`\`
{{errorMessage}}
\`\`\`

## Context
- **Game Mode**: {{gameMode}}
- **Extension Version**: {{extensionVersion}}

## Stack Trace
\`\`\`
{{stackTrace}}
\`\`\`

## External File (if applicable)
- **File**: {{attachments}}

## Steps to Reproduce
{{stepsToReproduce}}

## Expected Behavior
{{expectedBehavior}}

## Actual Behavior
{{actualBehavior}}

## Reported By
- **User**: {{reportedBy}}
    `.trim();

export async function generateAttachmentFromState(api: types.IExtensionApi) {
  const files: IReportFile[] = getCurrentReportFiles(api);
  if (files.length === 0) {
    return null;
  }
  const archivePath = await zipFiles(files.map(file => file.filePath));
  return archivePath;
}

export async function zipFiles(files: string[]): Promise<string | null> {
  if (files.length === 0) {
    return Promise.resolve(null);
  }

  const zip = new Zip();
  const tempPath = await new Promise<string>((resolve, reject) =>
    tmpName({ postfix: '.7z' }, (err, tmpPath: string) =>
      (err !== null)
        ? reject(err)
        : resolve(tmpPath)));

  return zip.add(tempPath, files, { ssw: true })
    .then(() => tempPath);
}

const obscenityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export const validateInput = (t: any, input: string, constraint: ReportInputConstraintType): IInputValidationResult | undefined => {
  const constraints: IInputConstraint | undefined = generateConstraints(constraint);
  if (!!constraints && ((input.length > constraints.maxLength) || (input.length < constraints.minLength))) {
    return {
      valid: false,
      text: t('Your input for this {{constraintType}} needs to be at least {{minLength}} characters and not exceed {{maxLength}}',
        { replace: { ...constraints, constraintType: constraint ?? 'input box' } }),
    };
  }

  if (constraints.isValid) {
    const valid = constraint === 'url' && !constraints.isValid(input) ? {
      valid: false,
      text: t('The attachment url "{{url}}" is invalid', { replace: { url: input } }),
    } : undefined;
    if (valid) {
      return valid;
    }
  }

  if (obscenityMatcher.hasMatch(input)) {
    return {
      valid: false,
      text: t('Modding games can sometimes be frustrating, we know! Please avoid using profanity in your report to increase the chance of community/developer interaction.'),
    };
  }

  return undefined;
}

export const systemInfo = (): ISystemInfo => {
  return {
    appVersion: util.getApplication()['version'],
    platform: util.getApplication()['platform'],
    platformVersion: util.getApplication()['platformVersion'],
    architecture: process.arch,
    process: process.platform,
  };
}

export const isValidReportFile = async (api: types.IExtensionApi, file: IReportFile): Promise<boolean> => {
  try {
    await fs.statAsync(file.filePath);
    return true;
  } catch (err) {
    return false;
  }
}

export const attachFiles = async (api: types.IExtensionApi, files: IReportFile[]) => {
  const batched = await files.reduce(async (accP: Promise<any[]>, file: IReportFile) => {
    const acc = await accP;
    return isValidReportFile(api, file)
      ? acc.concat(addFeedbackFile(file))
      : acc;
  }, Promise.resolve([]));
  util.batchDispatch(api!.store!.dispatch, batched);
  return;
}

export const getCurrentReportFiles = (api: types.IExtensionApi): IReportFile[] => {
  return Object.values(util.getSafe(api.getState(), ['session', 'feedback', 'feedbackFiles'], {}));
}

export const parseReportTemplate = async (): Promise<string> => {
  try {
    const template = await fs.readFileAsync(path.resolve('..', path.join(__dirname, 'issue_template.md')), { encoding: 'utf-8' });
    return Promise.resolve(template);
  } catch (e) {
    return Promise.resolve(DEFAULT_TEMPLATE);
  }
};

const generateConstraints = (constraint: ReportInputConstraintType): IInputConstraint | undefined => {
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  switch (constraint) {
    case 'title':
      return { minLength: 10, maxLength: 100 }
    case 'content':
      return { minLength: 50, maxLength: 300 }
    case 'url':
      return { minLength: 10, maxLength: 300, isValid: isValidUrl }
    default:
      return undefined;
  }
}

export const generateHash = async (api: types.IExtensionApi, report: IReportDetails): Promise<void> => {
  const hashElements = [report.errorMessage, report.stackTrace];
  const hashString = hashElements.join('');
  if (hashString === '\n') {
    return undefined;
  }
  const hash = await crypto.createHash('sha256').update(hashString).digest('hex');
  api.store?.dispatch(setFeedbackHash(hash.toString()));
}

const extractErrorDetails = (report: string) => {
  const messageRegex = /#### Message\n([^\n]+)/;
  const contextRegex = /#### Context\n```\n([\s\S]*?)```/;
  const stackRegex = /#### Stack\n```\n([\s\S]*?)```/;

  const messageMatch = report.match(messageRegex);
  const errorMessage = messageMatch ? messageMatch[1].trim() : null;

  const contextMatch = report.match(contextRegex);
  const context = contextMatch ? contextMatch[1].trim() : null;

  const stackMatch = report.match(stackRegex);
  const stack = stackMatch ? stackMatch[1].trim() : null;

  return {
    errorMessage,
    context,
    stack
  };
}
