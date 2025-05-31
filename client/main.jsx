// client/main.jsx
import './main.css';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import React from 'react';
import App from "./components/App";



useEffect(() => {
  async function loadSettings() {
    try {
      const res = await fetch("/api/settings"); // Server must expose this
      const data = await res.json();
      window.APP_SETTINGS = data;
    } catch (err) {
      console.error("Could not load app settings", err);
    }
  }
  loadSettings();
}, []);

// ✅ Google API Initialization
function initializeGoogleAPI() {
  if (window.gapi) {
    window.gapi.load('client:auth2', () => {
      window.gapi.client.init({
        apiKey: window.APP_SETTINGS.REACT_APP_GOOGLE_API_KEY,
        clientId:  window.APP_SETTINGS.REACT_APP_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      }).then(() => {
        console.log("✅ Google API initialized");
      }).catch(err => {
        console.error("❌ Google API init failed:", err);
      });
    });
  } else {
    console.warn("gapi not loaded yet.");
  }
}

Meteor.startup(() => {
  render(<App />, document.getElementById('app'));

  // ✅ Initialize Google API after render
  initializeGoogleAPI();
});
