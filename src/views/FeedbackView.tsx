/* eslint-disable */
import React, { useState, useEffect, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trans } from 'react-i18next';
import path from 'path';
import { log, util, MainContext } from 'vortex-api';
import { IReportFile, IGithubIssue, IReportDetails } from '../types';
import BugReportComponent from './BugReportComponent';
import Instructions from './Instructions';
import { setFeedbackHash } from '../actions/session';

export interface IReportPageProps {
  onGenerateAttachment: () => Promise<string>;
  onGenerateHash: (report: IReportDetails) => Promise<string>;
  onSendReport: (report: IReportDetails) => Promise<void>;
  onReadReferenceIssues: (hash: string, title: string) => Promise<IGithubIssue[]>;
  onClearReport: () => Promise<void>;
  onOpenUrl: (evt: any) => void;
}

const T: any = Trans;

interface IConnectedProps {
  reportTitle: string;
  reportMessage: string;
  reportHash: string;
  reportFiles: { [fileId: string]: IReportFile };
  newestVersion: string;
}

const ReportPage = (props: IReportPageProps) => {
  const { reportFiles, newestVersion, reportTitle,
    reportHash, reportMessage
  }: IConnectedProps = useSelector((state: any) => ({
    newestVersion: state.persistent.nexus?.newestVersion ?? null,
    reportFiles: state.session.feedback.feedbackFiles ?? [],
    reportHash: state.session.feedback.feedbackHash ?? null,
    reportMessage: state.session.feedback.feedbackMessage ?? '',
    reportTitle: state.session.feedback.feedbackTitle ?? '',
  }));

  const { onReadReferenceIssues, onClearReport, onSendReport,
    onGenerateAttachment, onGenerateHash
  } = props;

  const dispatch = useDispatch();
  const context = useContext(MainContext);


  const [currentReportTitle, setReportTitle] = useState(reportTitle);
  const [currentReportMessage, setReportMessage] = useState(reportMessage);
  const [currentHash, setHash] = useState(reportHash);
  const [currentFilteredIssues, setFilteredIssues] = useState([]);


  // Example of effect to handle lifecycle behavior
  useEffect(() => {
    // Generate the hash if we don't have one
    (async () => {
      try {
        const issues = await props.onReadReferenceIssues(currentHash, currentReportTitle);
        setFilteredIssues(issues);
      } catch (err) {
        log('error', 'failed to read issue preview', err.message);
      }
    })();
    return () => {
      onClearReport();
    };
  }, [reportHash, reportFiles, reportTitle, reportMessage, currentHash]); // Empty dependency array means this effect runs once on mount and unmount

  const openLink = React.useCallback((evt: React.MouseEvent) => {
    evt.preventDefault();
    util.opn(evt.currentTarget.getAttribute('href') as string).catch(() => null);
    return false;
  }, []);

  return (
    <div>
      <Instructions />
      <BugReportComponent
        key={currentHash}
        onGenerateHash={onGenerateHash}
        onGenerateAttachment={onGenerateAttachment}
        onSendReport={onSendReport}
        onReadReferenceIssues={onReadReferenceIssues}
        onClearReport={onClearReport}
        reportFiles={reportFiles}
        reportHash={currentHash}
        reportMessage={currentReportMessage}
        reportTitle={currentReportTitle}
        referencedIssues={currentFilteredIssues}
        onOpenUrl={openLink}
      />
    </div>
  );
};

const renderNoType = (t: (key: string) => string) => {
  return (
    <div className='feedback-instructions-notype'>
      {t('Please select the type of Feedback you\'d like to send in.')}
    </div>
  );
}

const renderContentQuestion = (props: { onClick: () => void }) => {
  return (
    <T i18nKey='feedback-instructions-question' className='feedback-instructions-notype'>
      <p>
        Sorry but this is not the right way to ask for help with Vortex.
        The feedback system is intended to inform us about problems or possible improvement
        and we can only reply to ask for further information.
        To get help, please consult the knowledge base or visit the forum at
      </p>
      <a href='https://forums.nexusmods.com/index.php?/forum/4306-vortex-support/' onClick={props.onClick}>
        https://forums.nexusmods.com/index.php?/forum/4306-vortex-support/
      </a>
      <p>
        There the entire community can help you.
      </p>
    </T>
  );
}

const renderContentSuggestion = (props: { onClick: () => void }) => {
  return (
    <T i18nKey='feedback-instructions-suggestion' className='feedback-instructions-notype'>
      <p>
        Share your ideas and feature requests, discuss them with the community,
        and cast your vote on feedback provided by others using our Feedback board at
      </p>
      <a href='https://feedback.nexusmods.com/?tags=vortex' onClick={props.onClick}>
        https://feedback.nexusmods.com/?tags=vortex
      </a>
    </T>
  );
}

export default ReportPage;
