import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlexLayout, util } from 'vortex-api';

import { ITextChangeData, ReportInputType } from '../types';
import InputBox from './InputBox';
import { useSelector, useStore } from 'react-redux';

export interface ITextAreaProps {
  id: string;
  label: string;
  text: string;
  disabled?: boolean;
  inputType: ReportInputType;
  validationMessage: any;
  onSetText: (textChange: ITextChangeData) => void;
}

const getPlaceholder = (inputType: ReportInputType) => {
  switch (inputType) {
    case 'title':
      return 'Type your report title...';
    case 'url':
      return 'https://www...';
    case 'steps':
      return 'Describe the steps you took to reproduce the issue...';
    case 'expected':
      return 'Describe what you expected to happen...';
    case 'actual':
      return 'Describe what actually happened...';
    case 'message':
      return 'This section is usually pre-populated with error information when reporting errors. In this case, please provide a summary of the error, ideally with error snippets from your log file...';
    default:
      return '';
  }
}

const TextArea = (props: ITextAreaProps) => {
  const [t] = useTranslation('common');
  const size = ['title', 'url'].includes(props.inputType) ? '14%' : '30%';
  const placeHolder = getPlaceholder(props.inputType);
  const noop = React.useCallback(() => null, []);
  const isMutable =  useSelector(state => util.getSafe(state, ['session', 'feedback', 'feedbackMutable'], false));
  const func = ['title', 'message'].includes(props.inputType) 
    ? isMutable
      ? props.onSetText
      : noop
    : props.onSetText;

  return (
    <div 
      key={`${props.id}-container`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: size,
        maxHeight: size,
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
        onSetText={func}
        placeHolder={placeHolder}
      />
    </div>
  );
}

export default TextArea;