// client/main.jsx
import './main.css';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import React from 'react';
import App from './components/App.jsx';


Meteor.startup(() => {
  render(<App />, document.getElementById('app'));
});
