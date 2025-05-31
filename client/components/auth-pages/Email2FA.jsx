import React, { useState, useEffect } from 'react';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import PropTypes from 'prop-types';
const Email2FA = ({ action, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0); // in seconds

  // Extra fields for registration
  const [name, setName] = useState('');
  const [profilePic, setProfilePic] = useState(null); // file

  // Email and OTP validation functions.
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidOtp = (otp) => /^\d{6}$/.test(otp);

  // Handle profile picture selection.
  const handleFileChange = (e) => {
   if (e.target.files?.[0]) {
      setProfilePic(e.target.files[0]);
    }
  };

  // Convert file to Base64.
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const requestOtp = () => {
    setMessage('');
    if (!isValidEmail(email)) {
      setMessage('Invalid email format.');
      return;
    }
    Meteor.call('sendEmailOTP', email, (error) => {
      if (error) {
        setMessage(error.reason || 'Error sending OTP. Please try again.');
      } else {
        setStep(2);
        setMessage('OTP sent to your email. Please check your inbox.');
        setCountdown(300); // 5 minutes countdown
      }
    });
  };

  const resendOtp = () => {
    setOtp('');
    requestOtp();
  };

  const verifyOtp = async () => {
    setMessage('');
    if (!isValidOtp(otp)) {
      setMessage('Invalid OTP format. Please enter a 6-digit code.');
      return;
    }
    // For registration, include name and profilePic.
    if (action === 'register') {
      let profilePicData = null;
      if (profilePic) {
        profilePicData = await convertFileToBase64(profilePic);
      }
      Accounts.callLoginMethod({
        methodArguments: [{ email, otp, name, profilePic: profilePicData }],
        userCallback: (err) => {
          if (err) {
            setMessage(err.reason || 'Error verifying OTP. Please try again.');
          } else {
            setStep(3);
            setMessage('OTP verified successfully. You are now registered and logged in.');
            if (onAuthSuccess) onAuthSuccess(); // Invoke the callback here
          }
        },
      });
    } else {
      // For login.
      Accounts.callLoginMethod({
        methodArguments: [{ email, otp }],
        userCallback: (err) => {
          if (err) {
            setMessage(err.reason || 'Error verifying OTP. Please try again.');
          } else {
            setStep(3);
            setMessage('OTP verified successfully. You are now logged in.');
            if (onAuthSuccess) onAuthSuccess(); // Invoke the callback here
          }
        },
      });
    }
  };

  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timerId = setInterval(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearInterval(timerId);
    }
    if (step === 2 && countdown === 0) {
      setMessage('OTP expired. Please request a new OTP.');
    }
  }, [step, countdown]);
  return (
<div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-6 rounded-2xl text-white space-y-6 animate-fade-in">
  {step === 1 && (
    <div className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="📧 Email Address"
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
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:scale-105 transition-transform"
      >
        ✉️ Request OTP
      </button>
    </div>
  )}

  {step === 2 && (
    <div className="space-y-4">
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="🔐 Enter OTP"
        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/60 focus:ring-2 focus:ring-green-400 outline-none"
        disabled={countdown === 0}
      />
      <button
        onClick={verifyOtp}
        disabled={countdown === 0}
        className={`w-full py-3 rounded-xl font-semibold ${
          countdown === 0
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-400 to-teal-500 hover:scale-105'
        } text-white transition-transform`}
      >
        ✅ Verify OTP
      </button>
      <div className="text-center text-sm">
        {countdown > 0 ? (
          <p>⏳ Time remaining: {countdown}s</p>
        ) : (
          <button
            onClick={resendOtp}
            className="text-pink-400 hover:text-pink-200 underline"
          >
            🔄 Resend OTP
          </button>
        )}
      </div>
    </div>
  )}

  {step === 3 && (
    <div className="text-center text-green-400 text-xl font-semibold">
      {action === 'register' ? '🎉 Registered Successfully!' : '✅ Logged In!'}
    </div>
  )}

  {message && <p className="text-center text-red-300">{message}</p>}
</div>
  );
};
Email2FA.propTypes = {
  action: PropTypes.oneOf(['login', 'register']).isRequired,
  onAuthSuccess: PropTypes.func,
};

export default Email2FA;
