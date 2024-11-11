/* eslint-disable */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { Trans } from 'react-i18next';
import { log, util, MainContext } from 'vortex-api';
import { IReportFile, IGithubIssue, IReportDetails } from '../types';
import BugReportComponent from './BugReportComponent';
import Instructions from './Instructions';
import { selectors } from 'vortex-api';
import { generateHash, systemInfo } from '../util';

import { setFeedbackHash } from '../actions/session';

export interface IReportPageProps {
  onGenerateAttachment: () => Promise<string>;
  onGenerateReportFiles: () => Promise<string>;
  onSendReport: (report: IReportDetails) => Promise<void>;
  onFindRelatedIssues: (reportDetails: IReportDetails) => Promise<IGithubIssue[]>;
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
  gameMode: string;
}

const ReportPage = (props: IReportPageProps) => {
  const { reportFiles, reportTitle, reportHash, reportMessage, gameMode
  }: IConnectedProps = useSelector((state: any) => ({
    gameMode: selectors.activeGameId(state) ?? null,
    newestVersion: state.persistent.nexus?.newestVersion ?? null,
    reportFiles: state.session.feedback.feedbackFiles ?? [],
    reportHash: state.session.feedback.feedbackHash ?? null,
    reportMessage: state.session.feedback.feedbackMessage ?? '',
    reportTitle: state.session.feedback.feedbackTitle ?? '',
  }));

  const { onFindRelatedIssues, onSendReport, onGenerateAttachment } = props;

  const [currentHash, setHash] = useState(reportHash);
  const [currentFilteredIssues, setFilteredIssues] = useState([]);
  const [reportDetails, setReportDetails] = React.useState<IReportDetails>(null);
  const [debounce,] = React.useState(new util.Debouncer(async (updatedHash: string, debReportDetails: IReportDetails) => {
    if (!updatedHash || (updatedHash !== currentHash)) {
      if (updatedHash) {
        setHash(updatedHash);
      } else {
        const tempReport: IReportDetails = await genFallbackReport(selectors.activeGameId(store.getState()));
        const hash = await tempReport.hash;
        store.dispatch(setFeedbackHash(hash));
        setReportDetails(tempReport);
      }
    } else {
      const rep = { ...debReportDetails };
      rep.hash = await generateHash(rep);
      setReportDetails(rep);
    }
    const issues = await onFindRelatedIssues(debReportDetails);
    setFilteredIssues(issues);
    return Promise.resolve();
  }, 1000));
  
  const onSubmitReport = React.useCallback((report: IReportDetails) => {
    onSendReport(report);
  }, [reportDetails]);

  const onRefreshHash = React.useCallback(async () => {
    if (!reportDetails?.errorMessage) {
      return;
    }
    const hash = await generateHash(reportDetails);
    if (hash !== reportHash) {
      debounce.schedule(undefined, hash, reportDetails);
    }
  }, [reportDetails, reportHash, debounce]);

  const store = useStore();
  useEffect(() => {
    debounce.schedule(undefined, reportHash, reportDetails);
  }, [reportDetails, reportHash, reportTitle, reportMessage, debounce]);

  const openLink = React.useCallback((evt: React.MouseEvent) => {
    evt.preventDefault();
    util.opn(evt.currentTarget.getAttribute('href') as string).catch(() => null);
    return false;
  }, []);

  return (
    <div>
      <Instructions />
      <BugReportComponent
        onRefreshHash={onRefreshHash}
        key={currentHash}
        onSumbitReport={onSubmitReport}
        onSetReport={setReportDetails}
        reportFiles={reportFiles}
        reportHash={currentHash}
        reportMessage={reportMessage}
        reportTitle={reportTitle}
        referencedIssues={currentFilteredIssues}
        onOpenUrl={openLink}
        onGenerateAttachment={onGenerateAttachment}
      />
    </div>
  );
};

let _fallbackReport: IReportDetails = null;
const genFallbackReport: (gameMode) => Promise<Partial<IReportDetails>> = async (gameMode: string) => {
  if (_fallbackReport) {
    return _fallbackReport;
  }
  const fallback: Partial<IReportDetails> = {
    gameMode,
    title: 'Feedback',
    errorMessage: 'Please select the type of Feedback you\'d like to send in.',
    systemInfo: systemInfo(),
  }
  fallback.hash = await generateHash(fallback);
  _fallbackReport = fallback;
  return _fallbackReport;
}

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
