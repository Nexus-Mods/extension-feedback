/* eslint-disable */
import React from 'react';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import { FlexLayout, tooltip, util } from 'vortex-api';

import { IReportFile } from '../types';
import { useSelector } from 'react-redux';

interface IProps {
  t: (key: string) => string;
  archiveName: string;
  reportFiles: { [key: string]: IReportFile };
  onRemoveFile: (evt: any) => void;
}
const ReportFilesView = (props: IProps) => {
  const { t, archiveName, reportFiles, onRemoveFile } = props;
  const onOpen = React.useCallback((evt: any) => {
    if (archiveName) {
      util.opn(archiveName).catch(err => null);
    }
  }, [archiveName]);
  return (
    <FlexLayout.Fixed key='files-list'>
      {(!!archiveName) && (
        <GeneratedArchive
          archiveName={archiveName}
          onOpen={onOpen}
        />
      )}
      <ListGroup className='feedback-files'>
        {Object.values(reportFiles).map(reportFile =>
          ReportFile(t, reportFile, onRemoveFile))}
      </ListGroup>
    </FlexLayout.Fixed>
  );
};

const GeneratedArchive = (props: { archiveName: string, onOpen: (evt) => void }) => {
  const { archiveName, onOpen } = props;
  return (
    <a href={archiveName} onClick={onOpen} data-link={archiveName} className='feedback-generated-archive'>
      <p>{`The generated archive is available here: "${archiveName}"`}</p>
    </a>);
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
        data-file={reportFile.filename}
        key={reportFile.filename}
        tooltip={t('Remove')}
        onClick={onRemoveReportFile}
        icon='delete'
      />
    </ListGroupItem>
  );
}

export default ReportFilesView