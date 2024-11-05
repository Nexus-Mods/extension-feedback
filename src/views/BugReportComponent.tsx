/* eslint-disable */
import React, { useCallback, useContext, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FlexLayout, MainContext, selectors, tooltip, util } from 'vortex-api';
import { IReportPageProps } from './FeedbackView';
import { IReportFile, IGithubIssue, IReportDetails, ITextChangeData, IInputValidationResult } from '../types';
import { systemInfo, validateInput } from '../util';
import { useDispatch, useStore } from 'react-redux';
import TextArea from './TextArea';
import { removeFeedbackFile } from '../actions/session';
import ReportFooter from './ReportFooter';
import SystemInfo from './SystemInfo';
import HostingComponent from './HostingComponent';
import { set } from 'lodash';

export interface IBugReportProps {
  onOpenUrl: (evt: any) => void;
  onSetMaySend: (enabled) => void;
  onRefreshHash: () => void;
  onSetReport: (report: IReportDetails) => void;
  onSumbitReport: () => void;
  maySend: boolean;
  reportTitle: string;
  reportHash: string,
  reportFiles: { [fileId: string]: IReportFile },
  referencedIssues: IGithubIssue[];
  reportMessage: string,
}

const T: any = Trans;

const isValid = (validationResult: IInputValidationResult) => {
  return (!validationResult) || (validationResult.valid);
};

const BugReportComponent = (props: IBugReportProps) => {
  const [t] = useTranslation('common');
  const {
    reportTitle, reportMessage, reportHash, reportFiles,
    onSetReport, onSumbitReport, maySend,
    referencedIssues, onSetMaySend, onRefreshHash
  } = props;

  const dispatch = useDispatch();
  const bullet = '\u2022';
  const [title, setTitle] = React.useState(reportTitle);
  const [message, setMessage] = React.useState(reportMessage);
  const [expectedBehavior, setExpectedBehavior] = React.useState('');
  const [actualBehavior, setActualBehavior] = React.useState('');
  const [stepsToReproduce, setStepsToReproduce] = React.useState(bullet);
  const [attachmentUrl, setAttachmentUrl] = React.useState('');

  const [titleValid, setTitleValid] = React.useState<IInputValidationResult>(validateInput(t, reportTitle, 'title'));
  const [messageValid, setMessageValid] = React.useState<IInputValidationResult>(validateInput(t, reportMessage, 'content'));
  const [expectedValid, setExpectedValid] = React.useState<IInputValidationResult>(validateInput(t, expectedBehavior, 'content'));
  const [actualValid, setActualValid] = React.useState<IInputValidationResult>(validateInput(t, actualBehavior, 'content'));
  const [stepsValid, setStepsValid] = React.useState<IInputValidationResult>(validateInput(t, stepsToReproduce, 'content'));
  const [urlValid, setUrlValid] = React.useState<IInputValidationResult>(validateInput(t, attachmentUrl, 'url'));
  const [debounce,] = React.useState(new util.Debouncer(async () => {
    const isValidForm = isValid(titleValid)
                     && isValid(messageValid)
                     && isValid(expectedValid)
                     && isValid(actualValid)
                     && isValid(stepsValid)
                     && isValid(urlValid);
    onSetMaySend(isValidForm);
    onSetReport(genReportDetails);
    onRefreshHash();
  }, 1000));

  const store = useStore();
  const gameMode = selectors.activeGameId(store.getState());
  const game = gameMode ? util.getGame(gameMode) : undefined;
  const genReportDetails = useMemo(() => {
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
      externalFileUrl: attachmentUrl,
      hash: reportHash,
      reportedBy: util.getSafe(store.getState(), ['confidential', 'account', 'nexus', 'userInfo', 'name'], 'unknown'),
    }
  }, [message, reportFiles, actualBehavior, expectedBehavior,
    title, stepsToReproduce, attachmentUrl, reportHash]);
  
  const onSubmit = React.useCallback(() => {
    onSetReport(genReportDetails);
    onSumbitReport();
  }, [title, actualBehavior, expectedBehavior, stepsToReproduce, message, attachmentUrl, reportFiles, reportHash]);

  const removeFile = React.useCallback((evt: any) => {
    const fileName = evt.currentTarget.getAttribute('data-file');
    if (Object.keys(reportFiles).includes(fileName)) {
      dispatch(removeFeedbackFile(fileName));
    }
  }, [reportFiles]);

  React.useEffect(() => {
    debounce.schedule();
  },[debounce, title, message, actualBehavior, expectedBehavior, stepsToReproduce, attachmentUrl]);

  const onTextChange = React.useCallback((evt: ITextChangeData) => {
    const { inputType, value } = evt;
    switch (inputType) {
      case 'title':
        setTitleValid(validateInput(t, value, 'title'));
        setTitle(value);
        break;
      case 'message':
        setMessageValid(validateInput(t, value, 'content'));
        setMessage(value);
        break;
      case 'expected':
        setExpectedValid(validateInput(t, value, 'content'));
        setExpectedBehavior(value);
        break;
      case 'actual':
        setActualValid(validateInput(t, value, 'content'));
        setActualBehavior(value);
        break;
      case 'steps':
        setStepsValid(validateInput(t, value, 'content'));
        setStepsToReproduce(value);
        break;
      case 'url':
        setUrlValid(validateInput(t, value, 'url'));
        setAttachmentUrl(value);
        break;
    }
  }, []);

  const fields = [
    (
      <TextArea
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
      <FlexLayout.Fixed key='sysinfo-data'>
        <SystemInfo />
      </FlexLayout.Fixed>
    ), (
      <TextArea
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
        text={attachmentUrl}
        inputType={'url'}
        validationMessage={urlValid}
        onSetText={onTextChange}
      />
    ),  (
      <FlexLayout.Fixed key='files-list'>
        <ListGroup className='feedback-files'>
          {Object.values(reportFiles).map(reportFile =>
            ReportFile(t, reportFile, removeFile))}
        </ListGroup>
      </FlexLayout.Fixed>
    ), (
      <FlexLayout.Fixed key='feedback-footer'>
        <ReportFooter
          key='feedback-footer'
          valid={maySend}
          reportTitle={title}
          reportMessage={message}
          onSubmitReport={onSubmit}
        />
      </FlexLayout.Fixed>
    ),
  ];

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
  const [t] = useTranslation('common');
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

const ReportFile = (t: (key: string) => string,
                    reportFile: IReportFile,
                    onRemoveReportFile: (evt: any) => void) => {
  return (
    <ListGroupItem
      key={reportFile.filename}
    >
      <p style={{ display: 'inline' }}>
        {reportFile.filename}
      </p>
      <p style={{ display: 'inline' }}>
        {' '}({util.bytesToString(reportFile.size)})
      </p>
      <tooltip.IconButton
        className='btn-embed btn-line-right'
        id={reportFile.filename}
        key={reportFile.filename}
        tooltip={t('Remove')}
        onClick={onRemoveReportFile}
        icon='delete'
      />
    </ListGroupItem>
  );
}

export default BugReportComponent;