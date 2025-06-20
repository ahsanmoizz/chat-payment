// backupManager.js
import localforage from 'localforage';

// Export all chat backups as a JSON object based on the keys in localForage.
export const exportChatsBackup = async () => {
  const chatIds = await localforage.keys();
  const chats = {};
  for (const id of chatIds) {
    chats[id] = await localforage.getItem(id);
  }
  return chats;
};

// Download the backup as a JSON file.
// This function converts the exported chats into a JSON file and triggers a download.
export const downloadBackupFile = async () => {
  const chats = await exportChatsBackup();
  const dataStr = JSON.stringify(chats, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chat-backup-${new Date().toISOString()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Upload the backup to Google Drive using the Google API client (gapi).
// This function assumes that gapi has been loaded and the user is already authenticated.
export const uploadBackupToDrive = async () => {
  const chats = await exportChatsBackup();
  const dataStr = JSON.stringify(chats, null, 2);
  const fileContent = new Blob([dataStr], { type: 'application/json' });

  const metadata = {
    name: `chat-backup-${new Date().toISOString()}.json`,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', fileContent);

  // ✅ Securely get access token from authenticated user
  const auth = window.gapi.auth2.getAuthInstance();
  const user = auth.currentUser.get();
  const token = user.getAuthResponse().access_token;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: new Headers({ Authorization: `Bearer ${token}` }),
      body: form,
    }
  );

  const fileData = await response.json();
  return fileData;
};
