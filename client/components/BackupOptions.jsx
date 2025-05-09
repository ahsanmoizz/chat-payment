// BackupOptions.jsx
import React from 'react';
import { downloadBackupFile, uploadBackupToDrive } from './backupmanager';

const BackupOptions = ({ onClose }) => {
  const handleDownload = async () => {
    try {
      await downloadBackupFile();
      alert('Backup downloaded successfully.');
      onClose();
    } catch (error) {
      alert('Download failed: ' + error.message);
    }
  };

  const handleUpload = async () => {
    try {
      await uploadBackupToDrive();
      alert('Backup uploaded to Google Drive successfully.');
      onClose();
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded shadow-lg w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-600 hover:text-gray-800">
          X
        </button>
        <h2 className="text-xl font-bold mb-4">Backup Chats</h2>
        <div className="flex flex-col space-y-4">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            Download Backup
          </button>
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Backup to Google Drive
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupOptions;
