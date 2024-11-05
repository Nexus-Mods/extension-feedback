import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlexLayout, tooltip } from 'vortex-api';

export interface IFooterProps {
  valid: boolean;
  reportTitle: string;
  reportMessage: string;
  onSubmitReport: () => void;
  onGenerateAttachment: () => void;
}

const ReportFooter = (props: IFooterProps): JSX.Element => {
  const [t] = useTranslation('common');
  const { valid, onSubmitReport, onGenerateAttachment } = props;

  return (
    <FlexLayout fill={false} type='row' className='feedback-controls'>
      <FlexLayout.Fixed>
        <tooltip.Button
          style={{ display: 'flex',
            marginLeft: 'auto', marginRight: 0 }}
          id='btn-submit-feedback'
          tooltip={t('Generate an attachment for your report (remember you still have to host it somewhere share-able)')}
          onClick={onGenerateAttachment}
        >
          {t('Generate Attachment')}
        </tooltip.Button>
      </FlexLayout.Fixed>
      <FlexLayout.Fixed>
        <tooltip.Button
          style={{ display: 'flex',
            marginLeft: 'auto', marginRight: 0 }}
          id='btn-submit-feedback'
          tooltip={t('Submit Feedback')}
          onClick={onSubmitReport}
          disabled={(valid === false)}
        >
          {t('Submit Feedback')}
        </tooltip.Button>
      </FlexLayout.Fixed>
    </FlexLayout>
  );
}

export default ReportFooter;