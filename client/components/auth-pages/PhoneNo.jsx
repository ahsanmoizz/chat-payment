import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import PropTypes from 'prop-types';
// Basic phone number formatter: trim whitespace (further formatting/validation can be added as needed)
const formatPhoneNumber = (input) => {
  return input.trim();
};

const OTPLogin = ({ action, onAuthSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Extra fields for registration.
  const [name, setName] = useState('');
  const [profilePic, setProfilePic] = useState(null);

  // Simple E.164 validation regex (basic)
  const isValidE164 = (number) => /^\+[1-9]\d{1,14}$/.test(number);

  // OTP should be 8 digits
  const isValidOtp = (otp) => /^\d{8}$/.test(otp);

  const handleFileChange = (e) => {
   if (e.target.files?.[0]) {
      setProfilePic(e.target.files[0]);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const requestOtp = () => {
    setError('');
    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!formattedNumber || !isValidE164(formattedNumber)) {
      setError('Invalid phone number format. Please enter a valid number in E.164 format (e.g., +919876543210).');
      return;
    }
    Meteor.call('sendOTP', formattedNumber, (err) => {
      if (err) {
        setError(err.reason || 'Failed to send OTP.');
      } else {
        setStep(2);
      }
    });
  };

  const loginWithOTP = async ({ phoneNumber, otp }, callback) => {
    if (action === 'register') {
      let profilePicData = null;
      if (profilePic) {
        profilePicData = await convertFileToBase64(profilePic);
      }
      Accounts.callLoginMethod({
        methodArguments: [{ phoneNumber, otp, name, profilePic: profilePicData }],
        userCallback: callback,
      });
    } else {
      Accounts.callLoginMethod({
        methodArguments: [{ phoneNumber, otp }],
        userCallback: callback,
      });
    }
  };

  const verifyOtp = () => {
    setError('');
    if (!isValidOtp(otp)) {
      setError('Invalid OTP format. Please enter an 8-digit numeric code.');
      return;
    }
    loginWithOTP({ phoneNumber, otp }, (err) => {
      if (err) {
        setError(err.reason || 'OTP verification failed.');
      } else {
        setStep(3);
        // Invoke the onAuthSuccess callback once OTP verification is successful
        if (typeof onAuthSuccess === 'function') {
          onAuthSuccess();
        }
      }
    });
  };
return ( <div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-6 rounded-2xl text-white space-y-6 animate-fade-in">
  {step === 1 && (
    <div className="space-y-4">
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="📱 Enter phone (e.g., +919876543210)"
        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:ring-2 focus:ring-blue-400 outline-none"
      />
      {action === 'register' && (
        <>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="👤 Your Name"
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:ring-2 focus:ring-pink-400 outline-none"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-white/80"
          />
        </>
      )}
      <button
        onClick={requestOtp}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition-transform"
      >
        📤 Request OTP
      </button>
    </div>
  )}

  {step === 2 && (
    <div className="space-y-4">
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="🔑 Enter 8-digit OTP"
        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:ring-2 focus:ring-green-400 outline-none"
      />
      <button
        onClick={verifyOtp}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:scale-105 transition-transform"
      >
        ✅ Verify & Login
      </button>
    </div>
  )}

  {step === 3 && (
    <div className="text-center text-green-400 text-xl font-semibold">
      {action === 'register' ? '🎉 Registration Complete!' : '✅ Logged In Successfully!'}
    </div>
  )}

  {error && <p className="text-center text-red-400">{error}</p>}
</div>
  );
};
OTPLogin.propTypes = {
  action: PropTypes.oneOf(['login', 'register']).isRequired,
  onAuthSuccess: PropTypes.func,
};
export default OTPLogin;
