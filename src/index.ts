/* eslint-disable */
import { partial_ratio } from 'fuzzball';
import {
  addFeedbackFile, clearFeedbackFiles, setFeedbackArchiveFilePath, setFeedbackHash,
  setFeedbackMessage, setFeedbackMutable, setFeedbackTitle,
} from './actions/session';
import { sessionReducer } from './reducers/session';
import { IGithubIssue, IReportDetails, IReportFile } from './types';

import { memoize } from 'lodash';

import {
  attachFiles, generateAttachment,
  generateHash, getCurrentReportFiles, SAMPLE_REPORT_BUG
} from './util';

import ReportPage from './views/FeedbackView';

import axios from 'axios';
import * as path from 'path';
import * as tmp from 'tmp';
import { fs, log, types, util } from 'vortex-api';
import * as winapiT from 'winapi-bindings';

const WHITESCREEN_THREAD =
  'https://forums.nexusmods.com/index.php?/topic/7151166-whitescreen-reasons/';

function originalUserData() {
  if ((process.platform === 'win32')
    && (process.env.APPDATA !== undefined)) {
    return path.join(process.env.APPDATA, util['getApplication']().name);
  } else {
    return util.getVortexPath('userData');
  }
}

async function findCrashDumps(): Promise<string[]> {
  const nativeCrashesPath = path.join(util.getVortexPath('userData'), 'temp', 'dumps');
  // this directory isn't even actually used?
  const electronCrashesPath = path.join(originalUserData(), 'temp', 'Vortex Crashes', 'reports');

  return fs.ensureDirAsync(nativeCrashesPath)
    .then(() => fs.readdirAsync(nativeCrashesPath))
    .catch(() => [])
    .filter((filePath: string) => path.extname(filePath) === '.dmp')
    .map((iterPath: string) => path.join(nativeCrashesPath, iterPath))
    .then((nativeCrashes: string[]) =>
      fs.readdirAsync(electronCrashesPath)
        .catch(() => [])
        .filter((filePath: string) => path.extname(filePath) === '.dmp')
        .map((iterPath: string) => path.join(electronCrashesPath, iterPath))
        .then((electronPaths: string[]) =>
          [].concat(nativeCrashes, electronPaths)))
    ;
}

enum ErrorType {
  CLR,
  OOM,
  APP,
}

const KNOWN_ERRORS = {
  e0000001: ErrorType.APP,
  e0000002: ErrorType.APP,
  e0434f4d: ErrorType.CLR,
  e0000008: ErrorType.OOM,
};

function oldMSXMLLoaded() {
  const winapi: typeof winapiT = require('winapi-bindings');
  const reMatch = /msxml[56].dll/;
  const msxml = winapi.GetModuleList(null).find(mod => mod.module.match(reMatch));
  return msxml !== undefined;
}

function errorText(type: ErrorType): string {
  if (type === ErrorType.APP) {
    // right now we only get here if the msxml file is loaded, if we ever find other common
    // causes of these extensions we need to differentiate here
    return 'This exception seems to be caused by a bug in a dll that got shipped with old '
      + 'versions of MS Office. '
      + 'It should be safe to ignore it but if you want to get rid of the message you '
      + 'should check for updates to Office.';
  }

  switch (type) {
    case ErrorType.CLR: return 'The exception you got indicates that the installation of the '
      + '.NET Framework installed on your system is invalid. '
      + 'This should be easily solved by reinstalling it.';
    case ErrorType.OOM: return 'The exception you got indicates an out of memory situation. '
      + 'This can have different reasons, most commonly a system misconfiguration where it '
      + 'doesn\'t provide enough virtual memory for stable operation.';
  }
}

async function recognisedError(crashDumps: string[]): Promise<ErrorType> {
  const errorCodes = await Promise.all(await crashDumps.reduce(async (accP, dumpPath) => {
    const acc = await accP;
    const data = await fs.readFileAsync(dumpPath + '.log', { encoding: 'utf-8' });
    try {
      const codeLine: string[] = data.split('\r\n').filter(line => line.startsWith('Exception code'));
      const code = codeLine.map(line => line.split(': ')[1]);
      if (code) {
        return Promise.resolve(acc.concat(code));
      }
    } catch (err) {
      return Promise.resolve(acc);
    }
    return Promise.resolve(acc);
  }, Promise.resolve([])));

  if (errorCodes.length === 0) {
    return Promise.resolve(undefined);
  }

  const known = errorCodes.find(code => KNOWN_ERRORS[code] !== undefined);
  if (known === undefined) {
    return Promise.resolve(undefined);
  }

  if (known === ErrorType.APP && !oldMSXMLLoaded()) {
    return Promise.resolve(undefined);
  }

  return Promise.resolve(KNOWN_ERRORS[known]);
}

function reportKnownError(api: types.IExtensionApi, dismiss: () => void, errType: ErrorType) {
  const bbcode = errorText(errType)
    + '<br/><br/>Please visit '
    + `[url="${WHITESCREEN_THREAD}"]`
    + 'this thread[/url] for more in-depth information.';
  return api.showDialog('info', 'Exception occurred', {
    bbcode,
  }, [
    { label: 'Close' },
  ]);
}

async function collectCrashDumps(api: types.IExtensionApi, crashDumps: string[], dismiss?: () => void) {
  const reportFiles = await Promise.all(await crashDumps.reduce(async (accP, iter) => {
    const acc = await accP;
    try {
      const stats = await fs.statAsync(iter);
      const reportFile: IReportFile = {
        filename: path.basename(iter),
        filePath: iter,
        size: stats.size,
        type: 'Dump',
      };
      return Promise.resolve(acc.concat(reportFile));
    } catch {
      return Promise.resolve(acc);
    }
  }, Promise.resolve([])));
  if (dismiss) {
    api.events.emit('show-main-page', 'Feedback');
    const batched = [
      setFeedbackTitle(`Crash Report`),
      setFeedbackMessage(SAMPLE_REPORT_BUG),
      setFeedbackHash(undefined),
      ...reportFiles.map(file => addFeedbackFile(file)),
    ]
    util.batchDispatch(api.store!.dispatch, batched);
    dismiss();
  }
  return Promise.resolve(reportFiles);
}

function nativeCrashCheck(api: types.IExtensionApi): Promise<void> {
  return findCrashDumps()
    .then(crashDumps => (crashDumps.length === 0)
      ? Promise.resolve()
      : recognisedError(crashDumps)
        .then(knownError => {
          const actions = [
            {
              title: 'Dismiss',
              action: dismiss => {
                Promise.all(crashDumps.map(dump =>
                  fs.removeAsync(dump)
                    .catch(() => undefined)
                    .then(() => fs.removeAsync(dump + '.log'))
                    .catch(() => undefined)))
                  .then(() => {
                    log('info', 'crash dumps dismissed');
                    dismiss();
                  });
              },
            },
          ];

          if (knownError === undefined) {
            actions.splice(0, 0, {
              title: 'More',
              action: dismiss => {
                const bbcode = 'The last session of Vortex logged an exception.'
                  + '<br/><br/>Please visit '
                  + `[url="${WHITESCREEN_THREAD}"]this thread[/url] `
                  + 'for typical reasons causing this.<br/>'
                  + '[color="red"]Please report this issue only if you\'re sure none of '
                  + 'those reasons apply to you![/color]';

                return api.showDialog('error', 'Exception', {
                  bbcode,
                }, [
                  {
                    label: 'Report', action: () => {
                      collectCrashDumps(api, crashDumps, dismiss);
                    },
                  },
                  { label: 'Close' },
                ]);
              },
            });
          } else {
            actions.splice(0, 0, {
              title: 'More',
              action: dismiss => reportKnownError(api, dismiss, knownError),
            });
          }

          api.sendNotification({
            type: 'error',
            title: 'Exception',
            message: 'Last Vortex session crashed',
            noDismiss: true,
            actions,
          });
        }))
    .catch(err => {
      // There is almost certainly a more serious underlying problem but this
      // particular symptom isn't worth reporting
      log('warn', 'Failed to check for native dumps', err.message);
    });
}

async function downloadGithubFile(repoOwner: string, repoName: string, filePath: string, outputPath: string) {
  //const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}`;
  const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/update-issue-tracker/${filePath}`;

  try {
    const response = await axios.get(url, {
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(path.resolve(outputPath));

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading file: ${error.message}`);
  }
}

const readReferenceIssues = memoize(async (): Promise<IGithubIssue[]> => {
  const data = await fs.readFileAsync(path.join(util.getVortexPath('temp'), 'issues_report.json'), { encoding: 'utf-8' });
  try {
    return JSON.parse(data);
  } catch (err) {
    log('warn', 'Failed to parse feedback reference issues', err.message);
    return [];
  }
})

async function identifyAttachment(filePath: string, type?: string): Promise<IReportFile> {
  return fs.statAsync(filePath)
    .then(stats => ({
      filename: path.basename(filePath),
      filePath,
      size: stats.size,
      type: type || path.extname(filePath).slice(1),
    }));
}

const collectLogs = async (api: types.IExtensionApi): Promise<IReportFile[]> => {
  const dirContents = await fs.readdirAsync(util.getVortexPath('userData'));
  const filtered: IReportFile[] = await dirContents.reduce((async (accP, file) => {
    const acc = await accP;
    if (!file.endsWith('.log')) {
      return Promise.resolve(acc);
    }
    const reportFile = await identifyAttachment(path.join(util.getVortexPath('userData'), file));
    return Promise.resolve(acc.concat(reportFile));
  }), Promise.resolve([]));
  return Promise.resolve(filtered);
}

function dumpStateToFileImpl(api: types.IExtensionApi, stateKey: string,
  name: string): Promise<IReportFile> {
  return new Promise<IReportFile>((resolve, reject) => {
    const data: Buffer = Buffer.from(JSON.stringify(api.store.getState()[stateKey]));
    tmp.file({
      prefix: `${stateKey}-`,
      postfix: '.json',
    }, (err, tmpPath: string, fd: number) => {
      if (err !== null) {
        return reject(err);
      }

      fs.writeAsync(fd, data, 0, data.byteLength, 0)
        .then(() => fs.closeAsync(fd))
        .then(() => {
          resolve({
            filename: name,
            filePath: tmpPath,
            size: data.byteLength,
            type: 'State',
          });
        })
        .catch(reject);
    });
  });
}

function dumpReduxActionsToFile(name: string): Promise<IReportFile> {
  return new Promise<IReportFile>((resolve, reject) => {
    tmp.file({
      prefix: 'events-',
      postfix: '.json',
    }, (err, tmpPath: string, fd: number) => {
      if (err !== null) {
        return reject(err);
      }
      util.getReduxLog()
        .then((logData: any) => {
          const data = Buffer.from(JSON.stringify(logData, undefined, 2));
          fs.writeAsync(fd, data, 0, data.byteLength, 0)
            .then(() => fs.closeAsync(fd))
            .then(() => {
              resolve({
                filename: name,
                filePath: tmpPath,
                size: data.byteLength,
                type: 'State',
              });
            })
            .catch(reject);
        });
    });
  });
}

function removeFiles(fileNames: string[]): Promise<void> {
  return Promise.all(fileNames.map(removeFile => fs.removeAsync(removeFile)))
    .then(() => null);
}

const submitReport = async (api: types.IExtensionApi, reportDetails: IReportDetails) => {
  const bugReportTemplate = await fs.readFileAsync(path.join(__dirname, 'bug_report.md'), { encoding: 'utf-8' });
  for (const [key, value] of Object.entries(reportDetails)) {
    bugReportTemplate.replace(new RegExp(`{{${key}}}`, 'igm'), encodeURIComponent(value));
  }
  util.opn('https://github.com/Nexus-Mods/Vortex-Backend/issues/new?body=' + encodeURIComponent(bugReportTemplate));
  // const title = Object.values(bugReportTemplate).find()
}

const updateReferenceIssues = async (api: types.IExtensionApi) => {
  const issuesFilePath = path.join(util.getVortexPath('temp'), 'issues_report.json');
  try {
    await downloadGithubFile('Nexus-Mods', 'Vortex-Backend', 'out/issues_report.json', issuesFilePath);
    await readReferenceIssues();
    await generateReportFiles(api);
  } catch (err) {
    log('warn', 'Failed to update or parse feedback reference issues', err.message);
  }
}

const findRelatedIssues = async (report: IReportDetails): Promise<IGithubIssue[]> => {
  try {
    const issues: IGithubIssue[] = await readReferenceIssues();
    return issues.filter(issue =>
      issue?.hash === report.hash
        || partial_ratio(issue.title, report.title) > 90
        || partial_ratio(issue.body, report.errorMessage) > 90);
  } catch (err) {
    log('warn', 'Failed to parse feedback reference issues', err.message);
    return [];
  }
}

const generateReportFiles = async (api: types.IExtensionApi): Promise<void> => {
  try {
    const reduxFile: IReportFile = await dumpReduxActionsToFile('redux-log.json');
    const sessionFile: IReportFile = await dumpStateToFileImpl(api, 'session', 'session.json');
    const persistentFile: IReportFile = await dumpStateToFileImpl(api, 'persistent', 'persistent.json');
    const settingsFile: IReportFile = await dumpStateToFileImpl(api, 'settings', 'settings.json');
    const crashDumps: IReportFile[] = await collectCrashDumps(api, await findCrashDumps());
    const logs: IReportFile[] = await collectLogs(api);
    await attachFiles(api, [reduxFile, sessionFile, persistentFile, settingsFile, ...crashDumps, ...logs]);
  } catch (err) {
    api.showErrorNotification('Failed to generate report files', err, { allowReport: false });
  }
}

function init(context: types.IExtensionContext) {
  context.registerReducer(['session', 'feedback'], sessionReducer);

  context.registerMainPage('', 'Feedback', ReportPage as any, {
    hotkey: 'F',
    group: 'hidden',
    props: () => ({
      onGenerateReportFiles: () => generateReportFiles(context.api),
      onGenerateAttachment: async () => {
        context.api.sendNotification({
          title: 'Generating attachment...',
          message: 'Please wait...',
          type: 'activity',
          id: 'generate-feedback-attachment-notif',
        })
        const arcPath = await generateAttachment(context.api);
        context.api.store.dispatch(setFeedbackArchiveFilePath(arcPath));
        context.api.sendNotification({
          title: 'Done',
          message: 'Attachment generated',
          type: 'success',
          id: 'generate-feedback-attachment-notif',
          actions: [
            {
              title: 'Open',
              action: () => {
                util.opn(path.dirname(arcPath)).catch(err => null);
              },
            },
          ],
        });
      },
      onGenerateHash: async (reportDetails: IReportDetails) => {
        const hash = await generateHash(reportDetails);
        context.api.store!.dispatch(setFeedbackHash(hash));
      },
      onSendReport: (reportDetails: IReportDetails) => submitReport(context.api, reportDetails),
      onFindRelatedIssues: (reportDetails: IReportDetails) => findRelatedIssues(reportDetails),
      onClearReport: () => {
        const batched = [
          setFeedbackTitle(''),
          setFeedbackMessage(''),
          setFeedbackHash(undefined),
          clearFeedbackFiles(),
        ];
        util.batchDispatch(context.api.store!.dispatch, batched);
      },
    }),
  });

  context.registerAction('global-icons', 100, 'feedback', {}, 'Send Feedback', () =>
    context.api.events.emit('show-main-page', 'Feedback'));

  context.once(() => {
    updateReferenceIssues(context.api);
    context.api.setStylesheet('feedback', path.join(__dirname, 'feedback.scss'));

    context.api.events.on('report-feedback', (report: types.IFeedbackReport) => {
      context.api.events.emit('show-main-page', 'Feedback');
      const batched = [
        setFeedbackTitle(report.title),
        setFeedbackMessage(report.message),
        setFeedbackHash(report.hash),
        setFeedbackMutable(false),
      ];
      (report.files || []).forEach(filePath => {
        const file: IReportFile = {
          filename: path.basename(filePath),
          filePath,
          size: fs.statSync(filePath).size,
          type: 'attachment',
        }
        batched.push(addFeedbackFile(file) as any);
      });
      util.batchDispatch(context.api!.store!.dispatch, batched);
    });

    context.api.events.on('report-log-error', (logSessionPath: string) => {
      fs.statAsync(logSessionPath)
        .then((stats) => {
          const feedbackFile: IReportFile = {
            filename: path.basename(logSessionPath),
            filePath: logSessionPath,
            size: stats.size,
            type: 'log',
          };
          context.api.store.dispatch(addFeedbackFile(feedbackFile));
        })
        .catch(err => {
          context.api.showErrorNotification('Failed to attach session log', err);
        });
      context.api.events.emit('show-main-page', 'Feedback');
    });
    downloadGithubFile('Nexus-Mods', 'Vortex-Backend', 'out/issues_report.json', path.join(util.getVortexPath('temp'), 'issues_report.json'))
      .catch(err => log('warn', 'failed to download issues report', err));
    nativeCrashCheck(context.api);
  });

  return true;
}

export default init;
