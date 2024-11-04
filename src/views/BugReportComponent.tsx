/* eslint-disable */
import React, { useContext } from 'react';
import { Trans, useTranslation, withTranslation } from 'react-i18next';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import { FlexLayout, MainContext, selectors, tooltip, util } from 'vortex-api';
import { IReportPageProps } from './FeedbackView';
import { ReportTopic, IReportFile, IGithubIssue, IReportDetails, ReportInputType, ITextChangeData, IInputValidationResult } from '../types';
import { systemInfo, validateInput } from '../util';
import { useDispatch, useSelector } from 'react-redux';
import TextArea from './TextArea';
import { removeFeedbackFile } from '../actions/session';
import ReportFooter from './ReportFooter';
import SystemInfo from './SystemInfo';
import FileHostingList from './FileHostingList';

export interface IBugReportProps extends IReportPageProps {
  reportTitle: string;
  reportHash: string,
  reportFiles: { [fileId: string]: IReportFile },
  referencedIssues: IGithubIssue[];
  reportMessage: string,
}

const T: any = Trans;

const isValid = (validationResult: IInputValidationResult) => {
  return (validationResult === undefined) || (validationResult.valid);
};

const BugReportComponent = (props: IBugReportProps) => {
  const [t] = useTranslation('common');
  const { reportTitle, reportMessage, reportHash, reportFiles } = props;
  const dispatch = useDispatch();
  const context = useContext(MainContext);
  const bullet = '\u2022';
  const [hash, setHash] = React.useState(reportHash);
  const [issues, setIssues] = React.useState(props.referencedIssues ?? []);
  const [title, setTitle] = React.useState(reportTitle);
  const [message, setMessage] = React.useState(reportMessage);
  const [expectedBehavior, setExpectedBehavior] = React.useState('');
  const [actualBehavior, setActualBehavior] = React.useState('');
  const [stepsToReproduce, setStepsToReproduce] = React.useState(bullet);
  const [attachmentUrl, setAttachmentUrl] = React.useState('');
  const [reportDetails, setReportDetails] = React.useState(null);

  const [titleValid, setTitleValid] = React.useState<IInputValidationResult>(validateInput(t, reportTitle, 'title'));
  const [messageValid, setMessageValid] = React.useState<IInputValidationResult>(validateInput(t, reportMessage, 'content'));
  const [expectedValid, setExpectedValid] = React.useState<IInputValidationResult>(validateInput(t, expectedBehavior, 'content'));
  const [actualValid, setActualValid] = React.useState<IInputValidationResult>(validateInput(t, actualBehavior, 'content'));
  const [stepsValid, setStepsValid] = React.useState<IInputValidationResult>(validateInput(t, stepsToReproduce, 'content'));
  const [urlValid, setUrlValid] = React.useState<IInputValidationResult>(validateInput(t, attachmentUrl, 'url'));
  const [maySend, setMaySend] = React.useState(false);

  React.useEffect(() => {
    setTitleValid(validateInput(t, title, 'title'));
    setMessageValid(validateInput(t, message, 'content'));
    setExpectedValid(validateInput(t, expectedBehavior, 'content'));
    setActualValid(validateInput(t, actualBehavior, 'content'));
    setStepsValid(validateInput(t, stepsToReproduce, 'content'));
    setUrlValid(validateInput(t, stepsToReproduce, 'url'));
    setMaySend(isValid(titleValid)
            && isValid(messageValid)
            && isValid(actualValid)
            && isValid(expectedValid)
            && isValid(stepsValid)
            && isValid(urlValid));

    const state = context.api.getState();
    const gameMode = selectors.activeGameId(state);
    const game = gameMode ? util.getGame(gameMode) : undefined;
    const report: IReportDetails = {
      title,
      errorMessage: message,
      attachments: Object.values(reportFiles),
      actualBehavior: actualBehavior,
      expectedBehavior: expectedBehavior,
      steps: stepsToReproduce,
      systemInfo: systemInfo(),
      gameMode: gameMode,
      extensionVersion: game?.version,
      stackTrace: reportMessage,
      externalFileUrl: attachmentUrl,
      hash,
      reportedBy: util.getSafe(state, ['confidential', 'account', 'nexus', 'userInfo', 'name'], 'unknown'),
    }
    setReportDetails(report);
    return () => {
      setReportDetails(null);
    }
  }, [
    title, message, actualBehavior, expectedBehavior,
    stepsToReproduce, attachmentUrl
  ]);

  const removeFile = React.useCallback((evt: any) => {
    const fileName = evt.currentTarget.getAttribute('data-file');
    if (Object.keys(reportFiles).includes(fileName)) {
      dispatch(removeFeedbackFile(fileName));
    }
  }, [reportFiles]);

  const onTextChange = React.useCallback((evt: ITextChangeData) => {
    const { inputType, value } = evt;
    switch (inputType) {
      case 'title':
        setTitle(value);
        break;
      case 'message':
        setMessage(value);
        break;
      case 'expected':
        setExpectedBehavior(value);
        break;
      case 'actual':
        setActualBehavior(value);
        break;
      case 'steps':
        setStepsToReproduce(value);
        break;
      case 'url':
        setAttachmentUrl(value);
        break;
    }
  }, [reportTitle, reportMessage, expectedBehavior, actualBehavior, stepsToReproduce, attachmentUrl]);
  const onSubmitReport = React.useCallback(() => {
    if (maySend) {
      props.onSendReport(reportDetails);
    }
  }, [reportDetails]);

  const fields = [
    (
      <TextArea
        id='feedback-title'
        label='Title'
        text={title}
        inputType={'title'}
        validationMessage={titleValid}
        onSetText={onTextChange}
      />
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
      <FileHostingList/>
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
            ReportFile({ reportFile, onRemoveReportFile: removeFile }))}
        </ListGroup>
        <ReportFooter
          valid={maySend}
          reportTitle={reportTitle}
          reportMessage={reportMessage}
          onSubmitReport={onSubmitReport}
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

const ReportFile = (props: { reportFile: IReportFile, onRemoveReportFile: (evt: any) => void }) => {
  const { reportFile, onRemoveReportFile } = props;
  const [t] = useTranslation('common');
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