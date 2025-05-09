// imports/api/users.js
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

// Publish user data
if (Meteor.isServer) {
  Meteor.publish('userData', function () {
    if (this.userId) {
      return Meteor.users.find(
        { _id: this.userId },
        { fields: { /* Specify fields to publish */ } }
      );
    } else {
      return this.ready();
    }
  });
}

// Methods for user management
Meteor.methods({
  'users.create'(username, password) {
    // Ensure the user is an admin or has the right permissions
    if (!this.userId || !Meteor.user().isAdmin) {
      throw new Meteor.Error('not-authorized');
    }

    // Create the new user
    Accounts.createUser({
      username,
      password,
      // Add other default fields here
    });
  },
  'users.setAdmin'(userId, isAdmin) {
    // Ensure the user is an admin
    if (!this.userId || !Meteor.user().isAdmin) {
      throw new Meteor.Error('not-authorized');
    }

    // Set the isAdmin flag on the user
    Meteor.users.update(userId, { $set: { isAdmin } });
  },
  // Add more user-related methods as needed
});
