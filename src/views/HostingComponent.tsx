import React from 'react';
import { useTranslation } from 'react-i18next';
import FileHostingList from './FileHostingList';

const HostingComponent = () => {
  const [t] = useTranslation('common');
  return (
    <div>
      <h3>{t('File Hosting')}</h3>
      <p>{t('Uploading a link to your vortex diagnostics files is optional but highly recommended, reports without an attachment may be ignored.')}</p>
      <p>{t('Please select your preferred file hosting service, and paste the link you received from the service after upload is complete.')}</p>
      <p>{t('Note the files that must be included in the report below. Clicking "Generate Attachment" will create an archive containing all the files for your report, ready to be uploaded onto the hosting service.')}</p>
      <FileHostingList />
    </div>
  );
};

export default HostingComponent;