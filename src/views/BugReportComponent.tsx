/* eslint-disable */
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FlexLayout, selectors, util } from 'vortex-api';
import { IReportFile, IGithubIssue, IReportDetails, ITextChangeData, IInputValidationResult } from '../types';
import { systemInfo, validateInput } from '../util';
import { useDispatch, useSelector, useStore } from 'react-redux';
import TextArea from './TextArea';
import { removeFeedbackFile } from '../actions/session';
import ReportFooter from './ReportFooter';
import SystemInfo from './SystemInfo';
import HostingComponent from './HostingComponent';
import ReportFilesView from './ReportFilesView';
import { is } from 'bluebird';

export interface IBugReportProps {
  onOpenUrl: (evt: any) => void;
  onRefreshHash: () => void;
  onSetReport: (report: IReportDetails) => void;
  onSumbitReport: (report: IReportDetails) => void;
  onGenerateAttachment: () => Promise<string>;
  reportTitle: string;
  reportHash: string,
  reportFiles: { [fileId: string]: IReportFile },
  referencedIssues: IGithubIssue[];
  reportMessage: string,
}

const isValid = (validationResult: IInputValidationResult) => {
  return !validationResult || validationResult?.valid === true;
};

const BugReportComponent = (props: IBugReportProps) => {
  const [t] = useTranslation('common');
  const {
    reportTitle, reportMessage, reportHash, reportFiles,
    onSetReport, onSumbitReport, referencedIssues, onRefreshHash,
  } = props;

  const dispatch = useDispatch();
  const bullet = '\u2022';
  const [title, setTitle] = React.useState(reportTitle);
  const [message, setMessage] = React.useState(reportMessage);
  const [expectedBehavior, setExpectedBehavior] = React.useState('');
  const [actualBehavior, setActualBehavior] = React.useState('');
  const [stepsToReproduce, setStepsToReproduce] = React.useState(bullet);
  const [externalFileUrl, setExternalFileUrl] = React.useState('');

  const [titleValid, setTitleValid] = React.useState<IInputValidationResult>(validateInput(t, reportTitle, 'none'));
  const [messageValid, setMessageValid] = React.useState<IInputValidationResult>(validateInput(t, reportMessage, 'none'));
  const [expectedValid, setExpectedValid] = React.useState<IInputValidationResult>(validateInput(t, expectedBehavior, 'content'));
  const [actualValid, setActualValid] = React.useState<IInputValidationResult>(validateInput(t, actualBehavior, 'content'));
  const [stepsValid, setStepsValid] = React.useState<IInputValidationResult>(validateInput(t, stepsToReproduce, 'content'));
  const [urlValid, setUrlValid] = React.useState<IInputValidationResult>(validateInput(t, externalFileUrl, 'url'));
  const isMutable =  useSelector(state => util.getSafe(state, ['session', 'feedback', 'feedbackMutable'], false));
  const isFormValid = React.useCallback(() => {
    const relevantValidations = isMutable
      ? [titleValid, messageValid, expectedValid, actualValid, stepsValid, urlValid]
      : [titleValid, messageValid, stepsValid, urlValid];
    const result = relevantValidations
      .reduce((prev, curr) => prev && isValid(curr), true);
    return result;
  }, [titleValid, messageValid, expectedValid, actualValid, stepsValid, urlValid]);

  const [debounce,] = React.useState(new util.Debouncer(async () => {
    onSetReport(genReportDetails());
    onRefreshHash();
  }, 1000));

  const store = useStore();
  const gameMode = selectors.activeGameId(store.getState());
  const game = gameMode ? util.getGame(gameMode) : undefined;
  const genReportDetails = (): IReportDetails => {
    return {
      title,
      errorMessage: message,
      attachments: Object.values(reportFiles),
      actualBehavior: actualBehavior,
      expectedBehavior: expectedBehavior,
      steps: stepsToReproduce,
      systemInfo: systemInfo(),
      gameMode: gameMode,
      extensionVersion: game?.version ?? '0.0.0',
      externalFileUrl,
      hash: reportHash,
      attachmentFilepath: util.getSafe(store.getState(), ['session', 'feedback', 'feedbackArchiveFilePath'], undefined),
      reportedBy: util.getSafe(store.getState(), ['confidential', 'account', 'nexus', 'userInfo', 'name'], 'unknown'),
      dateReported: new Date().toLocaleString(),
    }
  };

  const onSubmit = React.useCallback(() => {
    if (!isFormValid()) {
      return;
    }
    const report = genReportDetails();
    onSetReport(report);
    onSumbitReport(report);
  }, [onSetReport, onSumbitReport]);

  const removeFile = React.useCallback((evt: any) => {
    const fileName = evt.currentTarget.getAttribute('data-file');
    if (Object.keys(reportFiles).includes(fileName)) {
      dispatch(removeFeedbackFile(fileName));
    }
  }, [reportFiles]);

  const onGenerateAttachment = React.useCallback(async () => {
    props.onGenerateAttachment();
  }, []);

  const arcName = useSelector(state => util.getSafe(state, ['session', 'feedback', 'feedbackArchiveFilePath'], ''));

  React.useEffect(() => {
    debounce.schedule();
  }, [debounce, title, message, actualBehavior,
    expectedBehavior, stepsToReproduce, externalFileUrl,
  ]);

  const onTextChange = React.useCallback((evt: ITextChangeData) => {
    const { inputType, value } = evt;
    switch (inputType) {
      case 'title':
        setTitle(value);
        setTitleValid(validateInput(t, value, 'title'));
        break;
      case 'message':
        setMessage(value);
        setMessageValid(validateInput(t, value, 'content'));
        break;
      case 'expected':
        setExpectedBehavior(value);
        setExpectedValid(validateInput(t, value, 'content'));
        break;
      case 'actual':
        setActualBehavior(value);
        setActualValid(validateInput(t, value, 'content'));
        break;
      case 'steps':
        setStepsToReproduce(value);
        setStepsValid(validateInput(t, value, 'content'));
        break;
      case 'url':
        setExternalFileUrl(value);
        setUrlValid(validateInput(t, value, 'url'));
        break;
    }
  }, [titleValid, messageValid, expectedValid,
    actualValid, stepsValid, urlValid, t]);

  let fields = [
    (
      <TextArea
        disabled={!isMutable}
        key='feedback-title'
        id='feedback-title'
        label='Title'
        text={title}
        inputType={'title'}
        validationMessage={titleValid}
        onSetText={onTextChange}
      />
    ), (
      <FlexLayout.Fixed key='referenced-issues'>
        <h4>{t('Similar issues posted by other users:')}</h4>
        <ListGroup className='referenced-issues'>
          {referencedIssues.map(iss => ReferencedIssue(iss, props.onOpenUrl))}
        </ListGroup>
      </FlexLayout.Fixed>
    ), (
      <FlexLayout.Fixed key='sysinfo-label' className='hide-when-small'>
        <h4>{t('System Information')}</h4>
      </FlexLayout.Fixed>
    ), (
      <FlexLayout.Fixed className='hide-when-small' key='sysinfo-data'>
        <SystemInfo />
      </FlexLayout.Fixed>
    ), (
      <TextArea
        disabled={!isMutable}
        key='feedback-message'
        id='feedback-message'
        label='Your Message'
        text={message}
        inputType={'message'}
        validationMessage={messageValid}
        onSetText={onTextChange}
      />
    ), (
      <TextArea
        key='feedback-steps'
        id='feedback-steps'
        label='Steps to Reproduce Error:'
        text={stepsToReproduce || bullet}
        inputType={'steps'}
        validationMessage={stepsValid}
        onSetText={onTextChange}
      />
    ), (
      <HostingComponent key='feedback-hosting' />
    ), (
      <TextArea
        key='feedback-attachment-url'
        id='feedback-attachment-url'
        label='Attachment:'
        text={externalFileUrl}
        inputType={'url'}
        validationMessage={urlValid}
        onSetText={onTextChange}
      />
    ), (
      <ReportFilesView
        key='report-files'
        t={t}
        archiveName={arcName}
        onRemoveFile={removeFile}
        reportFiles={reportFiles}
      />
    ), (
      <FlexLayout.Fixed key='feedback-footer'>
        <ReportFooter
          onGenerateAttachment={onGenerateAttachment}
          key='feedback-footer'
          valid={true}
          reportTitle={title}
          reportMessage={message}
          onSubmitReport={onSubmit}
        />
      </FlexLayout.Fixed>
    ),
  ];

  if (isMutable) {
    fields = fields.concat([
      (
        <TextArea
          key='feedback-expectations'
          id='feedback-expectations'
          label='Your Expectations:'
          text={expectedBehavior}
          inputType={'expected'}
          validationMessage={expectedValid}
          onSetText={onTextChange}
        />
      ), (
        <TextArea
          key='feedback-result'
          id='feedback-result'
          label='What actually happened:'
          text={actualBehavior}
          inputType={'actual'}
          validationMessage={actualValid}
          onSetText={onTextChange}
        />
      ),
    ]);
  }

  const T: any = Trans;
  const PanelX: any = Panel;
  return (
    <FlexLayout.Flex key='feedback-body'>
      <Panel>
        <PanelX.Body>
          <FlexLayout type='column' className='feedback-form'>
            {fields.map(field => field)}
          </FlexLayout>
        </PanelX.Body>
      </Panel>
    </FlexLayout.Flex>
  );
}

const ReferencedIssue = (issue: IGithubIssue, onOpen: (evt: any) => void) => {
  return (
    <ListGroupItem key={issue.id}>
      <p style={{ display: 'inline' }}>
        <a
          href={issue.url}
          onClick={onOpen}
        >
          {issue.title}
        </a>
      </p>
    </ListGroupItem>
  );
}

export default BugReportComponent;