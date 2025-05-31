import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { Mongo } from 'meteor/mongo';
import { HTTP } from 'meteor/http'; // Use Meteor's HTTP package for REST calls
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

// Create a collection to store OTP records.
export const OTPs = new Mongo.Collection('otps');

// Helper function to generate an 8-digit numeric OTP.
const generateOTP = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

Meteor.methods({
  // Method to send an OTP to the provided phone number using 2factor.in
  'sendOTP'(phoneNumber) {
    check(phoneNumber, String);
    const phoneExists = Meteor.users.findOne({ 'profile.phone': phoneNumber });
    if (phoneExists) {
      throw new Meteor.Error('phone-already-used', 'Phone number is already registered.');
    }
    
    // Generate OTP and set expiration to 5 minutes.
    const otp = generateOTP();
    const expiration = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

    // Log OTP generation attempt (do not log the actual OTP in production).
    console.log(`Sending OTP to ${phoneNumber}. (OTP hidden for security)`);

    // Upsert the OTP record along with a counter for failed attempts.
    OTPs.upsert(
      { phoneNumber },
      { $set: { otp, expiration }, $setOnInsert: { attempts: 0 } }
    );

    try {
      // Use 2factor.in API instead of Twilio.
      // Construct the URL. (Check 2factor.in documentation for the correct format.)
      const apiKey = Meteor.settings.TWOFACTOR_API_KEY;
      const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phoneNumber}/${otp}`;
;
      const result = HTTP.call('GET', url);
      if (result.statusCode !== 200) {
        throw new Meteor.Error('2factor-error', 'OTP service returned an error.');
      }
      console.log(`OTP sent via 2factor.in to ${phoneNumber}`);
    } catch (err) {
      console.error(`Error sending OTP to ${phoneNumber}:`, err);
      throw new Meteor.Error('2factor-error', 'Failed to send OTP.');
    }

    return { message: 'OTP sent successfully.' };
  },
});

DDPRateLimiter.addRule({
  type: 'method',
  name: 'sendOTP',
  connectionId() { return true; },
}, 3, 60000);

// Register a custom login handler for phone/OTP authentication.
Accounts.registerLoginHandler('phone-otp', function (options) {
  // Validate the basic inputs early to reduce nesting.
  if (!options.phoneNumber || !options.otp) return undefined;
  
  check(options.phoneNumber, String);
  check(options.otp, String);

  const { phoneNumber, otp, email, name, profilePic } = options;

  // Validate the OTP.
  const record = OTPs.findOne({ phoneNumber });
  validateOTPRecord(record, phoneNumber, otp);

  // Ensure the user exists or create a new one.
  const user = findOrCreateUser({ phoneNumber, email, name, profilePic });

  // Issue a login token.
  const stampedToken = Accounts._generateStampedLoginToken();
  Accounts._insertLoginToken(user._id, stampedToken);

  return {
    userId: user._id,
    token: stampedToken.token,
    tokenExpires: Accounts._tokenExpiration(stampedToken),
  };
});

// Helper to validate the OTP record.
function validateOTPRecord(record, phoneNumber, otp) {
  if (!record) {
    throw new Meteor.Error('otp-not-found', 'No OTP found for this phone number.');
  }

  if (record.expiration < new Date()) {
    OTPs.remove({ phoneNumber });
    throw new Meteor.Error('expired-otp', 'The OTP has expired. Please request a new one.');
  }

  if (record.otp !== otp) {
    const newAttempts = (record.attempts || 0) + 1;
    OTPs.update({ phoneNumber }, { $set: { attempts: newAttempts } });

    if (newAttempts >= 3) {
      OTPs.remove({ phoneNumber });
      throw new Meteor.Error('max-attempts', 'Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    throw new Meteor.Error('invalid-otp', 'The OTP provided is incorrect.');
  }

  // OTP is valid; remove the record.
  OTPs.remove({ phoneNumber });
  console.log(`OTP verified for ${phoneNumber}`);
}

// Helper to find or create a user.
function findOrCreateUser({ phoneNumber, email, name, profilePic }) {
  let user = Meteor.users.findOne({
    $or: [
      { 'emails.address': email },
      { 'profile.phone': phoneNumber }
    ]
  });

  if (!user) {
    const userId = Accounts.createUser({
      email,
      profile: {
        phone: phoneNumber,
        name,
        profilePic,
        createdAt: new Date()
      }
    });
    user = Meteor.users.findOne(userId);
    console.log(`New user created with email: ${email} and phone: ${phoneNumber}`);
  } else {
    const setFields = {};

    if (email && !user.emails?.some(e => e.address === email)) {
      setFields.emails = [{ address: email, verified: true }];
    }

    if (phoneNumber && user.profile?.phone !== phoneNumber) {
      setFields['profile.phone'] = phoneNumber;
    }

    if (name) setFields['profile.name'] = name;
    if (profilePic) setFields['profile.profilePic'] = profilePic;

    if (Object.keys(setFields).length > 0) {
      Meteor.users.update(user._id, { $set: setFields });
      console.log(`User ${user._id} updated with additional info.`);
    }
  }

  return user;
}
