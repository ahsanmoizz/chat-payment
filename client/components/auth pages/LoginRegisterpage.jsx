// client/components/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OTPLogin from './PhoneNo';
import Email2FA from './Email2FA';

const LoginRegisterPage = () => {
  // 'action' can be 'login' or 'register'
  const [action, setAction] = useState('login');
  // 'method' can be 'otp' or 'email'
  const [method, setMethod] = useState('otp');
  const navigate = useNavigate();

  const handleAuthSuccess = (token) => {
    navigate('/chat');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md">
        <h2 className="mb-6 text-2xl font-semibold text-center text-gray-800">
          WhatsApp {action === 'login' ? 'Login' : 'Register'}
        </h2>
        {/* Toggle between Login and Register */}
        <div className="flex justify-center mb-4 space-x-4">
          <button
            onClick={() => setAction('login')}
            className={`px-4 py-2 font-medium text-sm rounded-md focus:outline-none ${
              action === 'login' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setAction('register')}
            className={`px-4 py-2 font-medium text-sm rounded-md focus:outline-none ${
              action === 'register' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Register
          </button>
        </div>
        {/* Toggle between OTP and Email 2FA */}
        <div className="flex justify-center mb-4 space-x-4">
          <button
            onClick={() => setMethod('otp')}
            className={`px-4 py-2 font-medium text-sm rounded-md focus:outline-none ${
              method === 'otp' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {action === 'login' ? 'Login with OTP' : 'Register with OTP'}
          </button>
          <button
            onClick={() => setMethod('email')}
            className={`px-4 py-2 font-medium text-sm rounded-md focus:outline-none ${
              method === 'email' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {action === 'login' ? 'Login with Email 2FA' : 'Register with Email 2FA'}
          </button>
        </div>
        {/* Render the selected authentication component */}
        {method === 'otp' ? (
          <OTPLogin action={action} onAuthSuccess={handleAuthSuccess} />
        ) : (
          <Email2FA action={action} onAuthSuccess={handleAuthSuccess} />
        )}
      </div>
    </div>
  );
};

export default LoginRegisterPage;
