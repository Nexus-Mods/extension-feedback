import { addFeedbackFile, setFeedbackHash, setFeedbackMessage,
         setFeedbackTitle } from './actions/session';
import { sessionReducer } from './reducers/session';
import { IFeedbackFile } from './types/IFeedbackFile';

import FeedbackView from './views/FeedbackView';

import * as Promise from 'bluebird';
import { remote } from 'electron';
import * as path from 'path';
import { fs, log, types } from 'vortex-api';

function findCrashDumps() {
  const nativeCrashesPath = path.join(remote.app.getPath('userData'), 'temp', 'dumps');

  return fs.ensureDirAsync(nativeCrashesPath)
    .then(() => fs.readdirAsync(nativeCrashesPath))
    .filter((filePath: string) => path.extname(filePath) === '.dmp')
    .map((iterPath: string) => path.join(nativeCrashesPath, iterPath));
}

enum ErrorType {
  CLR,
  OOM,
}

const KNOWN_ERRORS = {
  'e0434f4d': ErrorType.CLR,
  'e0000008': ErrorType.OOM,
}

function errorText(type: ErrorType): string {
  switch(type) {
    case ErrorType.CLR: return 'The exception you got indicates that the installation of the .Net Framework '
      + 'installed on your system is invalid. This should be easily solved by reinstalling it.'; 
    case ErrorType.OOM: return 'The exception you got indicates an out of memory situation. This can have different '
      + 'reasons, most commonly a system misconfiguration where it doesn\'t provide enough virtual memory for stable '
      + 'operation.';
  }
}

function recognisedError(crashDumps: string[]): Promise<ErrorType> {
  return Promise.map(crashDumps, dumpPath =>
    fs.readFileAsync(dumpPath + '.log', { encoding: 'utf-8' })
    .then(data => {
      try {
        const codeLine = data.split('\r\n').filter(line => line.startsWith('Exception code'));
        return Promise.resolve(codeLine.map(line => line.split(': ')[1]));
      } catch (err) {
        return Promise.reject(new Error('Failed to parse'));
      }
    })
    .catch(() => null)
  )
  .filter(codes => !!codes)
  .reduce((prev, codes) => prev.concat(codes), [])
  .filter(code => KNOWN_ERRORS[code] !== undefined)
  .then(codes => codes.length > 0 ? KNOWN_ERRORS[codes[0]] : undefined);
}

function reportKnownError(api: types.IExtensionApi, dismiss: () => void, errType: ErrorType) {
  const bbcode = errorText(errType)
    + '<br/><br/>Please visit '
    + '[url="https://forums.nexusmods.com/index.php?/topic/7151166-whitescreen-reasons/"]this thread[/url] '
    + 'for more in-depth information.'
  return api.showDialog('info', 'Exception occurred', {
    bbcode,
  }, [
    { label: 'Close' }
  ]);
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
                Promise.map(crashDumps,
                  dump => fs.removeAsync(dump)
                    .catch(() => undefined)
                    .then(() => fs.removeAsync(dump + '.log'))
                    .catch(() => undefined))
                  .then(() => {
                    log('info', 'crash dumps dismissed');
                    dismiss();
                  });
              },
            },
          ];

          if (knownError === undefined) {
            actions.splice(0, 0, {
                title: 'Send Report',
                action: dismiss => {
                  return Promise.map(crashDumps,
                    dump => fs.statAsync(dump)
                      .then(stats => ({ filePath: dump, stats }))
                      // This shouldn't happen unless the user deleted the
                      //  crashdump before hitting the Send Report button.
                      //  Either way the application shouldn't crash; keep going.
                      .catch(err => err.code === 'ENOENT' ? undefined : Promise.reject(err)))
                    .each((iter: { filePath: string, stats: fs.Stats }) => {
                      if (iter !== undefined) {
                        api.store.dispatch(addFeedbackFile({
                          filename: path.basename(iter.filePath),
                          filePath: iter.filePath,
                          size: iter.stats.size,
                          type: 'Dump',
                        }));
                        api.store.dispatch(addFeedbackFile({
                          filename: path.basename(iter.filePath) + '.log',
                          filePath: iter.filePath + '.log',
                          size: iter.stats.size,
                          type: 'Dump',
                        }));
                      }
                    })
                    // Do we actually want to report an issue with the native
                    //  crash dumps at this point? Or should we just keep going ?
                    .catch(err => undefined)
                    .then(() => {
                      api.events.emit('show-main-page', 'Feedback');
                      dismiss();
                    });
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
            title: 'Exception!',
            message: 'The last session of Vortex logged an exception (You probably noticed...)',
            noDismiss: true,
            actions,
          });
        }));
}

function init(context: types.IExtensionContext) {
  context.registerMainPage('', 'Feedback', FeedbackView, {
    hotkey: 'F',
    group: 'hidden',
  });

  context.registerAction('global-icons', 100, 'feedback', {}, 'Send Feedback', () =>
    context.api.events.emit('show-main-page', 'Feedback'));

  context.registerReducer(['session', 'feedback'], sessionReducer);

  context.once(() => {
    context.api.setStylesheet('feedback', path.join(__dirname, 'feedback.scss'));

    context.api.events.on('report-feedback', (title: string, text: string, files: IFeedbackFile[],
                                              hash?: string) => {
      context.api.events.emit('show-main-page', 'Feedback');
      context.api.store.dispatch(setFeedbackTitle(title));
      context.api.store.dispatch(setFeedbackMessage(text));
      context.api.store.dispatch(setFeedbackHash(hash));
      (files || []).forEach(file => {
        context.api.store.dispatch(addFeedbackFile(file));
      });
    });

    context.api.events.on('report-log-error',
      (logSessionPath: string) => {

        fs.statAsync(logSessionPath)
          .then((stats) => {
            const fileSize = stats.size / 1024 !== 0 ? Math.round(stats.size / 1024) : 1;
            const feedbackFile: IFeedbackFile = {
              filename: path.basename(logSessionPath),
              filePath: logSessionPath,
              size: fileSize,
              type: 'log',
            };
            context.api.store.dispatch(addFeedbackFile(feedbackFile));
          });
        context.api.events.emit('show-main-page', 'Feedback');
      });

    nativeCrashCheck(context.api);
  });

  return true;
}

export default init;
