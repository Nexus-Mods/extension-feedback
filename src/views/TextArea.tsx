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

const TextArea = (props: ITextAreaProps) => {
  const [t] = useTranslation('common');
  return (
    <div key={`${props.id}-container`} style={{ display: 'flex', flexDirection: 'column', minHeight: props.inputType !== 'title' ? '40%' : '15%', width: '100%' }}>
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
      />
    </div>
  );
}

export default TextArea;