import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

// Define the Messages collection.
export const Messages = new Mongo.Collection('messages');

if (Meteor.isServer) {
  // Publish messages, sorted by createdAt in ascending order (oldest first)
  Meteor.publish('messages', function publishMessages() {
    // You can adjust the query to limit messages if needed (e.g. only recent messages)
    return Messages.find({}, { sort: { createdAt: 1 } });
  });
}

// Meteor method for sending a message.
Meteor.methods({
  'messages.send'(text) {
    check(text, String);

    // Ensure the user is logged in.
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to send messages.');
    }

    // Ensure the message is not empty.
    if (text.trim().length === 0) {
      throw new Meteor.Error('empty-message', 'Cannot send an empty message.');
    }

    const user = Meteor.user();
    if (!user) {
      throw new Meteor.Error('user-not-found', 'User not found.');
    }

    // Insert the message into MongoDB.
    return Messages.insert({
    text,
    createdAt: new Date(),
    userId: this.userId,
    username: user.username || user.emails?.[0]?.address || 'Anonymous',
});

  },
});

// Rate limiter: limit message sending to 5 messages per 10 seconds per connection.
if (Meteor.isServer) {
  DDPRateLimiter.addRule({
    type: 'method',
    name: 'messages.send',
    connectionId() { return true; },
  }, 5, 10000);
}