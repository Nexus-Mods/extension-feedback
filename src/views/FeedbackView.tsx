import { addFeedbackFile, clearFeedbackFiles, removeFeedbackFile } from '../actions/session';
import { IFeedbackFile } from '../types/IFeedbackFile';

import * as Promise from 'bluebird';
import { remote } from 'electron';
import { ParameterInvalid } from 'nexus-api';
import * as os from 'os';
import * as path from 'path';
import * as React from 'react';
import { Alert, DropdownButton,
  ListGroup, ListGroupItem, MenuItem, Panel,
} from 'react-bootstrap';
import { Trans, translate } from 'react-i18next';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import {} from 'redux-thunk';
import { file as tmpFile } from 'tmp';
import {
  actions, ComponentEx, Dropzone, FlexLayout, FormInput, fs,
  MainPage, Toggle, tooltip, types, util,
} from 'vortex-api';

type ControlMode = 'urls' | 'files';

interface IConnectedProps {
  feedbackTitle: string;
  feedbackMessage: string;
  feedbackHash: string;
  feedbackFiles: { [fileId: string]: IFeedbackFile };
  APIKey: string;
  newestVersion: string;
}

interface IActionProps {
  onShowActivity: (message: string, id?: string) => void;
  onDismissNotification: (id: string) => void;
  onRemoveFeedbackFile: (feedbackFileId: string) => void;
  onShowDialog: (type: types.DialogType, title: string, content: types.IDialogContent,
                 actions: types.DialogActions) => void;
  onShowError: (message: string, details?: string | Error,
                notificationId?: string, allowReport?: boolean) => void;
  onClearFeedbackFiles: () => void;
  onAddFeedbackFile: (feedbackFile: IFeedbackFile) => void;
}

type IProps = IConnectedProps & IActionProps;

interface IComponentState {
  feedbackTitle: string;
  feedbackMessage: string;
  anonymous: boolean;
  sending: boolean;
}

const SAMPLE_REPORT = 'E.g.:\n' +
  'Summary: The mod downloads properly but when I try to install it nothing happens.\n' +
  'Expected Results: The mod is installed.\n' +
  'Actual Results: Nothing happens.\n' +
  'Steps to reproduce: Download a mod, then click Install inside the Actions menu.';

class FeedbackPage extends ComponentEx<IProps, IComponentState> {
  private static MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
  constructor(props: IProps) {
    super(props);

    this.initState({
      feedbackTitle: props.feedbackTitle,
      feedbackMessage: props.feedbackMessage,
      anonymous: false,
      sending: false,
    });
  }

  public componentWillReceiveProps(newProps: IProps) {
    if (this.props.feedbackMessage !== newProps.feedbackMessage) {
      this.nextState.feedbackMessage = newProps.feedbackMessage;
    }
  }

  public render(): JSX.Element {
    const { t, feedbackFiles, newestVersion } = this.props;

    const outdated = newestVersion !== remote.app.getVersion();
    const T: any = Trans;
    const PanelX: any = Panel;
    return (
      <MainPage>
        <FlexLayout type='column'>
          <FlexLayout.Fixed>
            <h2>{t('Provide Feedback')}</h2>
            {outdated ? (
              <Alert bsStyle='warning'>
                {t('You are not running the newest version of Vortex. '
                 + 'Please verify your issue hasn\'t been fixed already.')}
              </Alert>
             ) : null}
            <h4>
              {t('Describe in detail what you were doing and the feedback ' +
                  'you would like to submit.')}
            </h4>
            <T i18nKey='feedback-instructions' className='feedback-instructions'>
              Please<br/>
              <ul>
                <li>use punctuation and linebreaks,</li>
                <li>use english,</li>
                <li>be precise and to the point. You don't have to form sentences.
                  A bug report is a technical document, not prose,</li>
                <li>report only one issue per message,</li>
                <li>avoid making assumptions or your own conclusions, just report what you saw
                  and what you expected to see,</li>
                <li>include an example of how to reproduce the error if you can.
                  Even if its a general problem ("fomods using feature x zig when they should
                  zag") include one sequence of actions that expose the problem.</li>
              </ul>
              Trying to reproduce a bug is usually what takes the most amount of time in
              bug fixing and the less time we spend on it, the more time we can spend
              creating great new features!
            </T>
          </FlexLayout.Fixed>
          <FlexLayout.Flex>
          <Panel>
            <PanelX.Body>
              <FlexLayout type='column'>
                <FlexLayout.Fixed>
                  {t('Title')}
                </FlexLayout.Fixed>
                <FlexLayout.Fixed>
                  {this.renderTitleInput()}
                </FlexLayout.Fixed>
                <FlexLayout.Fixed>
                  {t('Your Message')}
                </FlexLayout.Fixed>
                <FlexLayout.Flex>
                  {this.renderMessageArea()}
                </FlexLayout.Flex>
                <FlexLayout.Fixed>
                  <Dropzone
                    accept={['files']}
                    icon='folder-download'
                    drop={this.dropFeedback}
                    dropText='Drop files to attach'
                    clickText='Click to browse for files to attach'
                    dialogHint={t('Select file to attach')}
                  />
                </FlexLayout.Fixed>
                <FlexLayout.Fixed>
                  {t('or')}{this.renderAttachButton()}
                </FlexLayout.Fixed>
                <FlexLayout.Fixed>
                  <ListGroup className='feedback-files'>
                    {Object.keys(feedbackFiles).map(this.renderFeedbackFile)}
                  </ListGroup>
                  {this.renderFilesArea()}
                </FlexLayout.Fixed>
              </FlexLayout>
            </PanelX.Body>
          </Panel>
          </FlexLayout.Flex>
        </FlexLayout>
      </MainPage>
    );
  }

  private renderFeedbackFile = (feedbackFile: string) => {
    const { t, feedbackFiles } = this.props;
    return (
      <ListGroupItem
        key={feedbackFiles[feedbackFile].filename}
      >
        <p style={{ display: 'inline' }}>
          {feedbackFiles[feedbackFile].filename}
        </p>
        <p style={{ display: 'inline' }}>
          {' '}({util.bytesToString(feedbackFiles[feedbackFile].size)})
        </p>
        <tooltip.IconButton
          className='btn-embed btn-line-right'
          id={feedbackFiles[feedbackFile].filename}
          key={feedbackFiles[feedbackFile].filename}
          tooltip={t('Remove')}
          onClick={this.remove}
          icon='delete'
        />
      </ListGroupItem>
    );
  }

  private attachFile(filePath: string, type?: string): Promise<void> {
    return fs.statAsync(filePath)
      .then(stats => {
        this.addFeedbackFile({
          filename: path.basename(filePath),
          filePath,
          size: stats.size,
          type: type || path.extname(filePath).slice(1),
        });
      })
      .catch(err => err.code === 'ENOENT'
        ? Promise.resolve()
        : Promise.reject(err));
  }

  private dropFeedback = (type: ControlMode, feedbackFilePaths: string[]) => {
    if (feedbackFilePaths.length === 0) {
      return;
    }

    if (type === 'files') {
      Promise.map(feedbackFilePaths, filePath => {
        this.attachFile(filePath);
      }).then(() => null);
    }
  }

  private remove = (evt) => {
    const { onRemoveFeedbackFile } = this.props;
    const feedbackFileId = evt.currentTarget.id;
    onRemoveFeedbackFile(feedbackFileId);
  }

  private renderTitleInput = () => {
    const { t } = this.props;
    const { feedbackTitle } = this.state;
    return (
      <FormInput
        id='feedback-input'
        label={t('Title')}
        value={feedbackTitle}
        onChange={this.handleChangeTitle}
        placeholder={t('Please provide a title')}
      />
    );
  }

  private renderMessageArea = () => {
    const { t } = this.props;
    const { feedbackMessage } = this.state;
    return (
      <textarea
        value={feedbackMessage || ''}
        id='textarea-feedback'
        className='textarea-feedback'
        onChange={this.handleChange}
        placeholder={t(SAMPLE_REPORT)}
      />
    );
  }

  private renderAttachButton(): JSX.Element {
    const { t } = this.props;
    return (
      <DropdownButton
        id='btn-attach-feedback'
        title={t('Attach Special File')}
        onSelect={this.attach}
        dropup
      >
        <MenuItem eventKey='sysinfo'>{t('System Information')}</MenuItem>
        <MenuItem eventKey='log'>{t('Vortex Log')}</MenuItem>
        <MenuItem eventKey='settings'>{t('Application Settings')}</MenuItem>
        <MenuItem eventKey='state'>{t('Application State')}</MenuItem>
        <MenuItem eventKey='actions'>{t('Recent State Changes')}</MenuItem>
      </DropdownButton>
    );
  }

  private renderFilesArea(): JSX.Element {
    const { t, APIKey } = this.props;
    const { anonymous, feedbackMessage, sending } = this.state;
    return (
      <FlexLayout fill={false} type='row' className='feedback-controls'>
        <FlexLayout.Fixed>
          <Toggle
            checked={anonymous || (APIKey === undefined)}
            onToggle={this.setAnonymous}
            disabled={APIKey === undefined}
          >
            {t('Send anonymously')}
          </Toggle>
        </FlexLayout.Fixed>
        <FlexLayout.Fixed>
          <tooltip.Button
            style={{ display: 'block', marginLeft: 'auto', marginRight: 0 }}
            id='btn-submit-feedback'
            tooltip={t('Submit Feedback')}
            onClick={this.submitFeedback}
            disabled={sending || !feedbackMessage}
          >
            {t('Submit Feedback')}
          </tooltip.Button>
        </FlexLayout.Fixed>
      </FlexLayout>
    );
  }

  private setAnonymous = (value: boolean) => {
    this.nextState.anonymous = value;
  }

  private attach = (eventKey: any) => {
    const { t, onShowDialog } = this.props;
    switch (eventKey) {
      case 'sysinfo': this.addSystemInfo(); break;
      case 'log': this.attachLog(); break;
      case 'actions': this.attachActions('Action History'); break;
      case 'settings': {
        onShowDialog('question', t('Confirm'), {
          message: t('This will attach your Vortex setting to the report, not including ' +
            'confidential data like usernames and passwords. ' +
            'We have no control over what third-party extensions store in settings though.'),
          options: { wrap: true },
        }, [
          { label: 'Cancel' },
          { label: 'Continue', action: () => { this.attachState('settings', 'Vortex Settings'); } },
        ]);
        break;
      }
      case 'state': {
        onShowDialog('question', t('Confirm'), {
          message:
          t('This will attach your Vortex state to the report. This includes information about ' +
            'things like your downloaded and installed mods, games, profiles and categories. ' +
            'These could be very useful for understanding your feedback but you have ' +
            'to decide if you are willing to share this information. ' +
            'We will, of course, treat your information as confidential.'),
          options: { wrap: true },
        }, [
          { label: 'Cancel' },
          { label: 'Continue', action: () => { this.attachState('persistent', 'Vortex State'); } },
        ]);
        break;
      }
    }
  }

  private addSystemInfo() {
    const sysInfo: string[] = [
      'Vortex Version: ' + remote.app.getVersion(),
      'Memory: ' + util.bytesToString((process as any).getSystemMemoryInfo().total * 1024),
      'System: ' + `${os.platform()} (${os.release()})`,
    ];
    this.nextState.feedbackMessage = sysInfo.join('\n') + '\n' + this.state.feedbackMessage;
  }

  private attachState(stateKey: string, name: string) {
    const data: Buffer = Buffer.from(JSON.stringify(this.context.api.store.getState()[stateKey]));
    tmpFile({
      prefix: `${stateKey}-`,
      postfix: '.json',
    }, (err, tmpPath: string, fd: number, cleanup: () => void) => {
      fs.writeAsync(fd, data, 0, data.byteLength, 0)
        .then(() => fs.closeAsync(fd))
        .then(() => {
          this.addFeedbackFile({
            filename: name,
            filePath: tmpPath,
            size: data.byteLength,
            type: 'State',
          });
        });
    });
  }

  private attachActions(name: string) {
    tmpFile({
      prefix: 'events-',
      postfix: '.json',
    }, (err, tmpPath: string, fd: number, cleanup: () => void) => {
      (util as any).getReduxLog()
        .then(log => {
          const data = Buffer.from(JSON.stringify(log, undefined, 2));
          fs.writeAsync(fd, data, 0, data.byteLength, 0)
            .then(() => fs.closeAsync(fd))
            .then(() => {
              this.addFeedbackFile({
                filename: name,
                filePath: tmpPath,
                size: data.byteLength,
                type: 'State',
              });
            });
        });
    });
  }

  private attachLog() {
    this.attachFile(
      path.join(remote.app.getPath('userData'), 'vortex.log'), 'log');
    this.attachFile(
      path.join(remote.app.getPath('userData'), 'vortex1.log'), 'log');
  }

  private addFeedbackFile(file: IFeedbackFile) {
    const { onAddFeedbackFile, onShowDialog, feedbackFiles } = this.props;
    const size = Object.keys(feedbackFiles).reduce((prev, key) =>
      prev + feedbackFiles[key].size, 0);
    if (size + file.size > FeedbackPage.MAX_ATTACHMENT_SIZE) {
      onShowDialog('error', 'Attachment too big', {
        text: 'Sorry, the combined file size must not exceed 20MB',
      }, [{ label: 'Ok' }]);
    } else {
      onAddFeedbackFile(file);
    }
  }

  private submitFeedback = (event) => {
    const { APIKey, feedbackFiles, feedbackHash, onClearFeedbackFiles,
            onDismissNotification, onShowActivity, onShowDialog, onShowError } = this.props;
    const { anonymous, feedbackTitle, feedbackMessage } = this.state;

    const notificationId = 'submit-feedback';
    onShowActivity('Submitting feedback', notificationId);

    this.nextState.sending = true;

    const files: string[] = [];
    Object.keys(feedbackFiles).forEach (key => {
      files.push(feedbackFiles[key].filePath);
    });

    const sendAnonymously = anonymous || (APIKey === undefined);

    this.context.api.events.emit('submit-feedback',
                                 feedbackTitle, feedbackMessage, feedbackHash, files,
                                 sendAnonymously, (err: Error) => {
      this.nextState.sending = false;
      if (err !== null) {
        if (err.name === 'ParameterInvalid') {
          onShowError('Failed to send feedback', err.message, notificationId, false);
        } else if ((err as any).body !== undefined) {
          onShowError('Failed to send feedback', `${err.message} - ${(err as any).body}`,
                      notificationId, false);
        } else {
          onShowError('Failed to send feedback', err, notificationId, false);
        }
        return;
      } else {
        onShowDialog('success', 'Feedback sent', {
          text: 'Thank you for your feedback!\n\n'
              + 'Your feedback will be reviewed before it gets published',
        }, [ { label: 'Close' } ]);
      }

      this.nextState.feedbackTitle = '';
      this.nextState.feedbackMessage = '';

      let removeFiles: string[];

      if (feedbackFiles !== undefined) {
        removeFiles = Object.keys(feedbackFiles)
          .filter(fileId => ['State', 'Dump', 'LogCopy'].indexOf(feedbackFiles[fileId].type) !== -1)
          .map(fileId => feedbackFiles[fileId].filePath);
      }

      if (removeFiles !== undefined) {
        Promise.map(removeFiles, removeFile => fs.removeAsync(removeFile))
          .then(() => {
            onClearFeedbackFiles();
            onDismissNotification(notificationId);
          })
          .catch(innerErr => {
            onShowError('An error occurred removing a file', innerErr, notificationId);
        });
      }
    });
  }

  private handleChangeTitle = (newTitle: string) => {
    this.nextState.feedbackTitle = newTitle;
  }

  private handleChange = (event) => {
    this.nextState.feedbackMessage = event.currentTarget.value;
  }
}

function mapDispatchToProps(dispatch: Redux.Dispatch<any>): IActionProps {
  return {
    onShowActivity: (message: string, id?: string) =>
      util.showActivity(dispatch, message, id),
    onRemoveFeedbackFile: (feedbackFileId: string) =>
      dispatch(removeFeedbackFile(feedbackFileId)),
    onShowDialog: (type, title, content, dialogActions) =>
      dispatch(actions.showDialog(type, title, content, dialogActions)),
    onShowError: (message: string, details?: string | Error,
                  notificationId?: string, allowReport?: boolean) =>
      util.showError(dispatch, message, details, { id: notificationId, allowReport }),
    onDismissNotification: (id: string) => dispatch(actions.dismissNotification(id)),
    onClearFeedbackFiles: () => dispatch(clearFeedbackFiles()),
    onAddFeedbackFile: (feedbackFile) => dispatch(addFeedbackFile(feedbackFile)),
  };
}

function mapStateToProps(state: any): IConnectedProps {
  return {
    feedbackTitle: state.session.feedback.feedbackTitle,
    feedbackMessage: state.session.feedback.feedbackMessage,
    feedbackHash: state.session.feedback.feedbackHash,
    feedbackFiles: state.session.feedback.feedbackFiles,
    APIKey: state.confidential.account.nexus.APIKey,
    newestVersion: state.session.nexus.newestVersion,
  };
}

export default
  translate(['common'], { wait: false })(
    connect(mapStateToProps, mapDispatchToProps)(
      FeedbackPage)) as React.ComponentClass<{}>;
