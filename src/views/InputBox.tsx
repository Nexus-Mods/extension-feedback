import * as React from 'react';
import { FormControl, FormGroup, ControlLabel } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FlexLayout, util } from 'vortex-api';

import { IGithubIssue, IInputValidationResult, ITextChangeData, ReportInputType } from '../types';


interface IInputProps {
  id: string;
  className: string;
  text: string;
  inputType: ReportInputType;
  onSetText: (change: ITextChangeData) => void;
  matchingIssues?: IGithubIssue[];
  reportHash?: string;
  validationMessage?: IInputValidationResult;
  placeHolder?: string;
}

const InputBox: React.FC<IInputProps> = (props: IInputProps) => {
  const [t] = useTranslation('common');
  const { text, matchingIssues, inputType, validationMessage, onSetText } = props;
  const [isFocused, setIsFocused] = React.useState(false);
  const onChangeText = React.useCallback((event: any) => {
    const newText = event.currentTarget.value;
    if (inputType === 'steps') {
      const bullet = '\u2022';
      const isLineBreak = newText.lastIndexOf('\n') === newText.length - 1;
      if (isLineBreak) {
        onSetText({ inputType, value: newText + bullet });
      } else {
        onSetText({ inputType, value: newText });
      }
    } else {
      onSetText({ inputType, value: newText });
    }
  }, [text, inputType]);

  const onFocus = React.useCallback((evt: any) => {
    const inputBoxIsFocused = evt.target.id === 'feedback-input';
    if (inputType === 'title') {
      // delay a bit, otherwise the links can't be clicked
      setTimeout(() => {
        setIsFocused(inputBoxIsFocused);
      }, isFocused ? 100 : 1000);
    }
  }, [inputType, isFocused]);

  const onOpenUrl = React.useCallback((evt: any) => {
    const url = evt.currentTarget.getAttribute('data-url');
    util.opn(url).catch(() => null);
  }, [])

  return (
    <FormGroup
      validationState={validationMessage !== undefined ? 'error' : null}
      style={{ height: '100%', width: '100%' }}
    >
      <FlexLayout type='column'>
        <FlexLayout.Flex>
          <FormControl
            componentClass='textarea'
            value={text || ''}
            id={props.id}
            className={props.className}
            onChange={onChangeText}
            onFocus={onFocus}
            placeholder={props.placeHolder ?? t('Type your message here...')}
          />
        </FlexLayout.Flex>
        {(inputType === 'title') &&
          <div className='feedback-search-result'>
            {[].concat(matchingIssues).filter(iss => !!iss).map((issue, idx) => SearchResult(issue, idx, onOpenUrl))}
          </div>}
        <FlexLayout.Fixed>
          <ControlLabel>
            {validationMessage?.text ?? 'Seems fine'}
          </ControlLabel>
        </FlexLayout.Fixed>
      </FlexLayout>
    </FormGroup>
  );
}

const SearchResult = (iss: IGithubIssue, idx: number, onOpenUrl: (evt) => void) => {
  return (
    <div key={`${iss.title}-${idx}`}>
      <div className='feedback-result-tag'>
        {tagName('issue')}
      </div>
      {' '}
      <a data-url={iss.url} onClick={onOpenUrl}>{iss.title}</a>
    </div>
  );
}

const tagName = (type: string) => {
  return {
    wiki: 'Wiki',
    faq: 'FAQ',
    issue: 'Tracker',
  }[type] || '???';
}

export default InputBox;
