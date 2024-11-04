
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { FlexLayout, Usage } from 'vortex-api';
const T: any = Trans;

const Instructions = () => {
  const [t] = useTranslation('common');
  return (
    <FlexLayout.Fixed key='feedback-instructions'>
      <h4>
        {t('Describe in detail what you were doing and the feedback ' +
          'you would like to submit.')}
      </h4>
      {/* @ts-ignore */}
      <Usage key='feedback-instructions'
        persistent
        infoId='feedback-bugreport-instructions'
      >
        <T i18nKey='feedback-instructions' className='feedback-instructions'>
          Please<br />
          <ul>
            <li>use punctuation and linebreaks,</li>
            <li>use English,</li>
            <li>be precise and to the point. You don&apos;t have to form sentences.
              A bug report is a technical document, not prose,</li>
            <li>report only one thing per message,</li>
            <li>avoid making assumptions or your own conclusions, just report what you saw
              and what you expected to see,</li>
            <li>include an example of how to reproduce the error if you can.
              Even if its a general problem (&quot;fomods using feature x zig when they should
              zag&quot;) include one sequence of actions that expose the problem.</li>
          </ul>
          Trying to reproduce a bug is usually what takes the most amount of time in
          bug fixing and the less time we spend on it, the more time we can spend
          creating great new features!
        </T>
      </Usage>
    </FlexLayout.Fixed>
  );
}

export default Instructions;