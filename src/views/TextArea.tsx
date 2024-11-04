import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlexLayout } from 'vortex-api';

import { ITextChangeData, ReportInputType } from '../types';
import InputBox from './InputBox';

export interface ITextAreaProps {
  id: string;
  label: string;
  text: string;
  inputType: ReportInputType;
  validationMessage: any;
  onSetText: (textChange: ITextChangeData) => void;
}

const getPlaceholder = (inputType: ReportInputType) => {
  switch (inputType) {
    case 'title':
      return 'Type your report title';
    case 'url':
      return 'Insert a shareable url allowing us to view your log files';
    case 'steps':
      return 'Describe the steps you took to reproduce the issue';
    case 'expected':
      return 'Describe what you expected to happen';
    case 'actual':
      return 'Describe what actually happened';
    case 'message':
      return 'This section is usually pre-populated with error information when reporting errors. In this case, please provide a summary of the error, ideally with error snippets from your log file.';
    default:
      return '';
  }
}

const TextArea = (props: ITextAreaProps) => {
  const [t] = useTranslation('common');
  const placeHolder = getPlaceholder(props.inputType);
  return (
    <div 
      key={`${props.id}-container`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: ['title', 'url'].includes(props.inputType) ? '14%' : '30%',
        width: '100%'
      }}
    >
      <FlexLayout.Fixed key={`${props.id}-label`} className='hide-when-small'>
        <h4>{t(props.label)}</h4>
      </FlexLayout.Fixed>
      <InputBox
        key={`${props.id}-textarea`}
        id={`textarea-${props.id}`}
        className={props.id}
        text={props.text}
        inputType={props.inputType}
        validationMessage={props.validationMessage}
        onSetText={props.onSetText}
        placeHolder={placeHolder}
      />
    </div>
  );
}

export default TextArea;