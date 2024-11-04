/* eslint-disable */
import React, { useState } from 'react';
import { IReportFile } from '../types';

export interface ICrashReportProps {
  title: string;
  platform: string;
  architecture: string;
  appVersion: string;
  process: string;
  errorMessage: string;
  gameMode: string;
  extensionVersion: string;
  stackTrace: string;
  reportFiles: IReportFile[];
  reportedBy: string;
}

export interface IConnectedProps {
  reportedBy: string;
}

const CrashReportForm: React.FC<ICrashReportProps> = ({
  title,
  platform,
  architecture,
  appVersion,
  process,
  errorMessage,
  gameMode,
  extensionVersion,
  stackTrace,
  reportFiles,
  reportedBy,
}) => {
  // State to store user input
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Collect the form data
    const formData = {
      title,
      platform,
      architecture,
      appVersion,
      process,
      errorMessage,
      gameMode,
      extensionVersion,
      stackTrace,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      reportFiles,
      reportedBy
    };

    console.log('Crash Report Submitted:', formData);
  };

  return (
    <div>
      <h2>Crash Report: {title}</h2>
      <p><strong>Platform:</strong> {platform}</p>
      <p><strong>Architecture:</strong> {architecture}</p>
      <p><strong>Application Version:</strong> {appVersion}</p>
      <p><strong>Process:</strong> {process}</p>
      <p><strong>Error Message:</strong></p>
      <pre>{errorMessage}</pre>
      <p><strong>Game Mode:</strong> {gameMode}</p>
      <p><strong>Extension Version:</strong> {extensionVersion}</p>
      <p><strong>Stack Trace:</strong></p>
      <pre>{stackTrace}</pre>

      {
        reportFiles.length > 0 && 
        reportFiles.map((reportFile: IReportFile, index: number) => (
        <p>
          <strong>External File:</strong>{' '}
          <a
            href={reportFile.filePath}
          >
            {reportFile.filename}
          </a>
        </p>
        ))
      }

      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Steps to Reproduce:
            <textarea
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              rows={5}
              required
            />
          </label>
        </div>

        <div>
          <label>
            Expected Behavior:
            <textarea
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              rows={3}
              required
            />
          </label>
        </div>

        <div>
          <label>
            Actual Behavior:
            <textarea
              value={actualBehavior}
              onChange={(e) => setActualBehavior(e.target.value)}
              rows={3}
              required
            />
          </label>
        </div>

        <button type="submit">Submit Crash Report</button>
      </form>

      <p><strong>Reported By:</strong>{reportedBy}</p>
    </div>
  );
};

export default CrashReportForm;
