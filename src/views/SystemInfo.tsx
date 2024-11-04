import React from 'react';
import { systemInfo } from '../util';
import { useTranslation } from 'react-i18next';

const SystemInfo = () => {
  const [t] = useTranslation('common');
  const info = systemInfo();
  return (
    <div className='feedback-system-info'>
      <div>{`${t('Platform: ')}${info.platform}`}</div>
      <div>{`${t('Platform Version: ')}${info.platformVersion}`}</div>
      <div>{`${t('Architecture: ')}${info.architecture}`}</div>
      <div>{`${t('Process: ')}${info.process}`}</div>
    </div>
  );
};

export default SystemInfo;