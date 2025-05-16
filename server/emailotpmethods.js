import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { Mongo } from 'meteor/mongo';
import { Email } from 'meteor/email';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

// Collection to store email OTP records.
export const EmailOTPs = new Mongo.Collection('emailotps');

// Helper: Generate a secure 6-digit OTP.
const generateEmailOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

Meteor.methods({
  // Method to send an OTP to the provided email.
  'sendEmailOTP'(email) {
    check(email, String);
   
    // Validate email format.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Meteor.Error('invalid-email', 'Invalid email format.');
    }
    const emailExists = Meteor.users.findOne({ 'emails.address': email });
if (emailExists) {
  throw new Meteor.Error('email-already-used', 'Email is already registered.');
}

    // Generate OTP and set expiration to 5 minutes.
    const otp = generateEmailOTP();
    const expiration = new Date(Date.now() + 5 * 60 * 1000);

    // IMPORTANT: Do not log the actual OTP in production.
    console.log(`Sending OTP to ${email}. (OTP hidden for security)`);

    // Upsert the OTP record (and reset attempt count if re-sent).
    EmailOTPs.upsert(
      { email },
      { $set: { otp, expiration }, $setOnInsert: { attempts: 0 } }
    );

    // Make sure your Meteor.settings has a valid SMTP configuration.
    // For example, in your settings file:
    // {
    //   "EMAIL_FROM": "no-reply@yourapp.com",
    //   "SMTP": {
    //     "username": "your_username",
    //     "password": "your_password",
    //     "server": "smtp.yourprovider.com",
    //     "port": 587
    //   }
    // }
    if (!Meteor.settings.SMTP) {
      throw new Meteor.Error('smtp-not-configured', 'SMTP settings not configured.');
    }

    try {
      Email.send({
        to: email,
        from: Meteor.settings.EMAIL_FROM || 'no-reply@yourapp.com',
        subject: 'Your Verification Code',
        text: `Your verification code is ${otp}. It is valid for 5 minutes.`,
      });
    } catch (error) {
      console.error(`Error sending OTP to ${email}:`, error);
      throw new Meteor.Error('email-send-failed', 'Failed to send OTP.');
    }
    return { message: 'OTP sent successfully.' };
  },

  // Method to verify the OTP.
  'verifyEmailOTP' (email, otp) {
    check(email, String);
    check(otp, String);

    const record = EmailOTPs.findOne({ email });
    if (!record) {
      throw new Meteor.Error('otp-not-found', 'No OTP found for this email.');
    }
    if (record.expiration < new Date()) {
      EmailOTPs.remove({ email });
      throw new Meteor.Error('otp-expired', 'The OTP has expired. Please request a new one.');
    }
    if (record.otp !== otp) {
      const newAttempts = (record.attempts || 0) + 1;
      EmailOTPs.update({ email }, { $set: { attempts: newAttempts } });
      if (newAttempts >= 3) {
        EmailOTPs.remove({ email });
        throw new Meteor.Error('max-attempts', 'Maximum OTP attempts exceeded. Please request a new OTP.');
      }
      throw new Meteor.Error('invalid-otp', 'Invalid OTP.');
    }

    // OTP is valid; remove record.
    EmailOTPs.remove({ email });
    console.log(`OTP verified for ${email}`);

    // Look up or create a user by email.
    let user = Meteor.users.findOne({ 'emails.address': email });
    if (!user) {
      const userId = Accounts.createUser({ email });
      
      
      user = Meteor.users.findOne(userId);
      console.log(`Created new user with email ${email}`);
    }

  
    return {
      userId: user._id,
      verified: true 
    };
  },
});

// Rate limiter: Restrict OTP requests to help prevent abuse.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'sendEmailOTP',
  connectionId() { return true; },
}, 3, 60000);

// You might also add rate limiting to verification if needed.

Accounts.registerLoginHandler('email-otp', function (options) {
  // Validate basic inputs early to reduce nesting.
  if (!options.email || !options.otp) return undefined;
  
  check(options.email, String);
  check(options.otp, String);

  const { email, otp } = options;
  const record = EmailOTPs.findOne({ email });

  // Validate OTP record.
  if (!record) {
    throw new Meteor.Error('otp-not-found', 'No OTP found for this email.');
  }

  if (record.expiration < new Date()) {
    EmailOTPs.remove({ email });
    throw new Meteor.Error('otp-expired', 'The OTP has expired. Please request a new one.');
  }

  if (record.otp !== otp) {
    handleFailedOTPAttempt(email, record.attempts);
  }

  // OTP is valid; remove record.
  EmailOTPs.remove({ email });
  console.log(`Email OTP verified for ${email}`);

  // Ensure user exists or create a new one.
  const user = findOrCreateUser(options);

  // Issue a login token.
  const stampedToken = Accounts._generateStampedLoginToken();
  Accounts._insertLoginToken(user._id, stampedToken);

  return {
    userId: user._id,
    token: stampedToken.token,
    tokenExpires: Accounts._tokenExpiration(stampedToken),
  };
});

// Helper to handle failed OTP attempts.
function handleFailedOTPAttempt(email, currentAttempts = 0) {
  const newAttempts = currentAttempts + 1;
  EmailOTPs.update({ email }, { $set: { attempts: newAttempts } });

  if (newAttempts >= 3) {
    EmailOTPs.remove({ email });
    throw new Meteor.Error('max-attempts', 'Maximum OTP attempts exceeded. Please request a new OTP.');
  }

  throw new Meteor.Error('invalid-otp', 'Invalid OTP.');
}

// Helper to find or create a user.
function findOrCreateUser(options) {
  const { email, name, profilePic, phoneNumber } = options;
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