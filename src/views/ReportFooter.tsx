import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlexLayout, tooltip } from 'vortex-api';

export interface IFooterProps {
  valid: boolean;
  reportTitle: string;
  reportMessage: string;
  onSubmitReport: () => void;
}

const ReportFooter = (props: IFooterProps): JSX.Element => {
  const [t] = useTranslation('common');
  const { valid, reportTitle, reportMessage, onSubmitReport } = props;

  return (
    <FlexLayout fill={false} type='row' className='feedback-controls'>
      <FlexLayout.Fixed>
        <tooltip.Button
          style={{ display: 'block', marginLeft: 'auto', marginRight: 0 }}
          id='btn-submit-feedback'
          tooltip={t('Submit Feedback')}
          onClick={onSubmitReport}
          disabled={(reportTitle.length === 0)
                  || (reportMessage.length === 0)
                  || !valid}
        >
          {t('Submit Feedback')}
        </tooltip.Button>
      </FlexLayout.Fixed>
    </FlexLayout>
  );
}

export default ReportFooter;