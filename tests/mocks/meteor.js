// tests/mocks/meteor.js
export const Meteor = {
    call: (...args) => {
      // You can provide a default no-op or throw if needed.
      console.warn('Meteor.call called with arguments:', args);
    },
    // Add any other properties or methods you need to mock.
  };
  