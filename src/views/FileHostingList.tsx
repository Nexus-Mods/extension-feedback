import React from 'react';
import { util } from 'vortex-api';

// Define the type for each hosting service
type HostingService = {
  name: string;
  logo: string;
  uploadUrl: string;
};

const fileHostingServices: HostingService[] = [
  {
    name: 'Google Drive',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png',
    uploadUrl: 'https://drive.google.com/drive/u/0/my-drive',
  },
  {
    name: 'Dropbox',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Dropbox_logo.svg',
    uploadUrl: 'https://www.dropbox.com/home',
  },
  {
    name: 'OneDrive',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Cloud-blue-24.svg',
    uploadUrl: 'https://onedrive.live.com/',
  },
  {
    name: 'Box',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Box%2C_Inc._logo.svg',
    uploadUrl: 'https://account.box.com/login',
  },
  {
    name: 'WeTransfer',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/WeTransfer_logo.svg',
    uploadUrl: 'https://wetransfer.com/',
  },
  {
    name: 'Mega',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/MEGA_logo.png',
    uploadUrl: 'https://mega.nz/start',
  },
];

const FileHostingList: React.FC = () => {
  const openUrl = React.useCallback((evt: React.MouseEvent) => {
    evt.preventDefault();
    const url = evt.currentTarget.getAttribute('data-link')
    util.opn(url!).catch(() => null);
  }, []);
  return (
    <div className='file-hosting-list'>
      {fileHostingServices.map((service) => (
        <a
          key={service.name}
          href={service.uploadUrl}
          target='_blank'
          data-link={service.uploadUrl}
          rel='noopener noreferrer'
          className='file-hosting-button'
          onClick={openUrl}
        >
          <img src={service.logo} alt={service.name} className='file-hosting-logo' />
        </a>
      ))}
    </div>
  );
};

export default FileHostingList;
