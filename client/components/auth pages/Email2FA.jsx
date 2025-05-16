import  { useState, useEffect } from 'react';
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
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      {step === 1 && (
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {action === 'register' && (
            <>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full"
                required
              />
            </>
          )}
          <button
            onClick={requestOtp}
            className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition"
          >
            Request OTP
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={countdown === 0}
          />
          <button
            onClick={verifyOtp}
            disabled={countdown === 0}
            className={`w-full p-3 rounded transition ${countdown === 0 ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600 text-white'}`}
          >
            Verify OTP
          </button>
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-gray-600">Time remaining: {countdown} seconds</p>
            ) : (
              <button
                onClick={resendOtp}
                className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">
            {action === 'register' ? 'Registration Successful!' : 'Login Successful!'}
          </h2>
          {/* Optionally redirect or update UI here */} 
        </div>
      )}

      {message && <p className="mt-4 text-center text-red-500">{message}</p>}
    </div>
  );
};
Email2FA.propTypes = {
  action: PropTypes.oneOf(['login', 'register']).isRequired,
  onAuthSuccess: PropTypes.func,
};

export default Email2FA;
