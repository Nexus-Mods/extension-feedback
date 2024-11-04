import { ReportTopic, ReportType, IReportFile } from '../types';

import { createAction } from 'redux-act';

export const setFeedbackTitle = createAction('SET_FEEDBACK_TITLE',
  (feedbackTitle: string) => feedbackTitle);

export const setFeedbackMessage = createAction('SET_FEEDBACK_MESSAGE',
  (feedbackMessage: string) => feedbackMessage);

export const setFeedbackHash = createAction('SET_FEEDBACK_HASH',
  (hash: string) => hash);

export const addFeedbackFile = createAction('ADD_FEEDBACK_FILE',
  (feedbackFile: IReportFile) => ({ feedbackFile }));

export const removeFeedbackFile = createAction('REMOVE_FEEDBACK_FILE',
  (feedbackFileId: string) => ({ feedbackFileId }));

export const clearFeedbackFiles = createAction('CLEAR_FEEDBACK_FILES');
